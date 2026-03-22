
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, Target, Edit3, BookOpen, Clock, Award } from 'lucide-react';

export default function PEIEditorCoordinator({ studentId, studentName }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [peiId, setPeiId] = useState(null);
  
  const [formData, setFormData] = useState({
    vocational_profile: '',
    pages_per_day: 5,
    hours_per_week: 25,
    graduation_pathway: 'Standard High School Diploma',
    graduation_age: 18,
    estimated_credits: 24,
    status: 'Draft'
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
        setPeiId(data.id);
        setFormData({
          vocational_profile: data.vocational_profile || '',
          pages_per_day: data.pages_per_day || 5,
          hours_per_week: data.hours_per_week || 25,
          graduation_pathway: data.graduation_pathway || 'Standard High School Diploma',
          graduation_age: data.graduation_age || 18,
          estimated_credits: data.estimated_credits || 24,
          status: data.status || 'Draft'
        });
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
        vocational_profile: formData.vocational_profile,
        pages_per_day: parseInt(formData.pages_per_day, 10),
        hours_per_week: parseInt(formData.hours_per_week, 10),
        graduation_pathway: formData.graduation_pathway,
        graduation_age: parseInt(formData.graduation_age, 10),
        estimated_credits: parseFloat(formData.estimated_credits),
        status: formData.status
      };

      if (peiId) {
        const { error } = await supabase.from('student_pei').update(payload).eq('id', peiId);
        if (error) throw error;
        toast({ title: 'PEI Actualizado', description: 'Los cambios se han guardado exitosamente.' });
      } else {
        const { data, error } = await supabase.from('student_pei').insert([payload]).select().single();
        if (error) throw error;
        setPeiId(data.id);
        toast({ title: 'PEI Creado', description: 'El nuevo PEI ha sido guardado exitosamente.' });
      }
      setEditMode(false);
    } catch (err) {
      console.error('Error saving PEI:', err);
      toast({ title: 'Error', description: 'Hubo un problema al guardar el PEI.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-600" />
          Plan Educativo Individualizado (PEI)
        </h3>
        {!editMode ? (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            <Edit3 className="w-4 h-4 mr-2" /> Editar PEI
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        )}
      </div>

      <div className="p-6 space-y-8">
        {/* Section 1: Vocational Profile */}
        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-400" /> 1. Perfil Vocacional
          </h4>
          {editMode ? (
            <textarea
              value={formData.vocational_profile}
              onChange={e => setFormData({...formData, vocational_profile: e.target.value})}
              className="w-full border border-slate-300 p-3 rounded-xl min-h-[120px] focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
              placeholder="Describa los intereses, fortalezas y metas profesionales del estudiante..."
            />
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl text-slate-700 min-h-[80px]">
              {formData.vocational_profile || <span className="text-slate-400 italic">No especificado</span>}
            </div>
          )}
        </section>

        {/* Section 2: Pacing */}
        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> 2. Pacing (Ritmo de Estudio)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-500 mb-1">Páginas por Día (Promedio)</label>
              {editMode ? (
                <input type="number" min="1" max="20" value={formData.pages_per_day} onChange={e => setFormData({...formData, pages_per_day: e.target.value})} className="w-full border p-2 rounded-lg text-slate-900 bg-white" />
              ) : (
                <p className="font-medium text-slate-800 text-lg">{formData.pages_per_day} pgs/día</p>
              )}
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-500 mb-1">Horas por Semana (Estimado)</label>
              {editMode ? (
                <input type="number" min="1" max="50" value={formData.hours_per_week} onChange={e => setFormData({...formData, hours_per_week: e.target.value})} className="w-full border p-2 rounded-lg text-slate-900 bg-white" />
              ) : (
                <p className="font-medium text-slate-800 text-lg">{formData.hours_per_week} horas/sem</p>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: Graduation Pathway */}
        <section>
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-400" /> 3. Ruta de Graduación (13-18 años)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-500 mb-1">Objetivo de Diploma</label>
              {editMode ? (
                <select value={formData.graduation_pathway} onChange={e => setFormData({...formData, graduation_pathway: e.target.value})} className="w-full border p-2 rounded-lg text-slate-900 bg-white">
                  <option value="Standard High School Diploma">Standard High School Diploma (24 Credits)</option>
                  <option value="College Prep Diploma">College Prep Diploma (26+ Credits)</option>
                  <option value="Vocational Certificate">Vocational / Certificate Pathway</option>
                </select>
              ) : (
                <p className="font-medium text-slate-800">{formData.graduation_pathway}</p>
              )}
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-500 mb-1">Créditos Estimados</label>
              {editMode ? (
                <input type="number" step="0.5" value={formData.estimated_credits} onChange={e => setFormData({...formData, estimated_credits: e.target.value})} className="w-full border p-2 rounded-lg text-slate-900 bg-white" />
              ) : (
                <p className="font-medium text-slate-800">{formData.estimated_credits}</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
