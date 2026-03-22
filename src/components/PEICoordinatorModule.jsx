
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, Edit3, Target, BookOpen, Clock, Award, PlusCircle } from 'lucide-react';

export default function PEICoordinatorModule({ studentId }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [hasPEI, setHasPEI] = useState(false);
  const [peiId, setPeiId] = useState(null);

  const [formData, setFormData] = useState({
    vocational_goal: '',
    pages_per_day: 5,
    hours_per_week: 25,
    graduation_pathway: 'Standard High School Diploma',
    graduation_age_start: 13,
    graduation_age_end: 18,
    estimated_credits: 24
  });

  useEffect(() => {
    if (studentId) fetchPEI();
  }, [studentId]);

  const fetchPEI = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_pei')
        .select('*')
        .eq('student_id', studentId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setHasPEI(true);
        setPeiId(data.id);
        setFormData({
          vocational_goal: data.vocational_profile || data.vocational_goal || '',
          pages_per_day: data.pages_per_day || 5,
          hours_per_week: data.hours_per_week || 25,
          graduation_pathway: data.graduation_pathway || 'Standard High School Diploma',
          graduation_age_start: data.graduation_age_start || 13,
          graduation_age_end: data.graduation_age_end || data.graduation_age || 18,
          estimated_credits: data.estimated_credits || 24
        });
      } else {
        setHasPEI(false);
      }
    } catch (err) {
      console.error('Error fetching PEI:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        student_id: studentId,
        vocational_goal: formData.vocational_goal,
        vocational_profile: formData.vocational_goal, 
        pages_per_day: parseInt(formData.pages_per_day, 10),
        hours_per_week: parseInt(formData.hours_per_week, 10),
        graduation_pathway: formData.graduation_pathway,
        graduation_age_start: parseInt(formData.graduation_age_start, 10),
        graduation_age_end: parseInt(formData.graduation_age_end, 10),
        estimated_credits: parseFloat(formData.estimated_credits),
        status: 'Active'
      };

      if (peiId) {
        const { error } = await supabase.from('student_pei').update(payload).eq('id', peiId);
        if (error) throw error;
        toast({ title: 'Éxito', description: 'PEI actualizado correctamente.' });
      } else {
        const { data, error } = await supabase.from('student_pei').insert([payload]).select().single();
        if (error) throw error;
        setPeiId(data.id);
        setHasPEI(true);
        toast({ title: 'Éxito', description: 'PEI creado correctamente.' });
      }
      setEditMode(false);
    } catch (err) {
      console.error('Error saving PEI:', err);
      toast({ title: 'Error', description: 'No se pudo guardar el PEI.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center p-8"><span className="animate-spin text-xl inline-block">⏳</span> Cargando Módulo PEI...</div>;
  }

  if (!hasPEI && !editMode) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4">
        <Target className="w-12 h-12 text-indigo-200 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">No hay PEI configurado</h3>
        <p className="text-slate-500 text-sm">Este estudiante requiere un Plan Educativo Individualizado.</p>
        <Button onClick={() => setEditMode(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white mt-4">
          <PlusCircle className="w-4 h-4 mr-2" /> Crear PEI
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          Plan Educativo Individualizado (PEI) - Coordinador
        </h3>
        {!editMode ? (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            <Edit3 className="w-4 h-4 mr-2" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            {hasPEI && <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancelar</Button>}
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <span className="animate-spin text-sm mr-2 inline-block">⏳</span> : <Save className="w-4 h-4 mr-2" />}
              Guardar PEI
            </Button>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        <section>
          <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" /> Meta Vocacional
          </h4>
          {editMode ? (
            <textarea
              value={formData.vocational_goal}
              onChange={e => setFormData({...formData, vocational_goal: e.target.value})}
              className="w-full border border-slate-300 p-3 rounded-lg min-h-[100px] focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describa la meta vocacional..."
            />
          ) : (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[60px] text-slate-700">
              {formData.vocational_goal || <span className="italic text-slate-400">Sin especificar</span>}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" /> Ritmo de Trabajo
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Páginas por Día</label>
                {editMode ? (
                  <input type="number" min="1" value={formData.pages_per_day} onChange={e => setFormData({...formData, pages_per_day: e.target.value})} className="w-full border p-2 rounded-md" />
                ) : (
                  <p className="font-bold text-slate-800">{formData.pages_per_day}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Horas por Semana</label>
                {editMode ? (
                  <input type="number" min="1" value={formData.hours_per_week} onChange={e => setFormData({...formData, hours_per_week: e.target.value})} className="w-full border p-2 rounded-md" />
                ) : (
                  <p className="font-bold text-slate-800">{formData.hours_per_week}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-500" /> Proyección de Graduación
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Ruta de Graduación</label>
                {editMode ? (
                  <input type="text" value={formData.graduation_pathway} onChange={e => setFormData({...formData, graduation_pathway: e.target.value})} className="w-full border p-2 rounded-md" />
                ) : (
                  <p className="font-bold text-slate-800">{formData.graduation_pathway}</p>
                )}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Edad Inicio</label>
                  {editMode ? <input type="number" value={formData.graduation_age_start} onChange={e => setFormData({...formData, graduation_age_start: e.target.value})} className="w-full border p-2 rounded-md" /> : <p className="font-bold text-slate-800">{formData.graduation_age_start}</p>}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Edad Fin</label>
                  {editMode ? <input type="number" value={formData.graduation_age_end} onChange={e => setFormData({...formData, graduation_age_end: e.target.value})} className="w-full border p-2 rounded-md" /> : <p className="font-bold text-slate-800">{formData.graduation_age_end}</p>}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Créditos</label>
                  {editMode ? <input type="number" value={formData.estimated_credits} onChange={e => setFormData({...formData, estimated_credits: e.target.value})} className="w-full border p-2 rounded-md" /> : <p className="font-bold text-slate-800">{formData.estimated_credits}</p>}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
