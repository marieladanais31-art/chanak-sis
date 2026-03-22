
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth, ROLES } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { FileText, Save, Edit, Loader2, Target, Clock, GraduationCap, Lock } from 'lucide-react';

export default function PEICoordinatorTab({ studentId }) {
  const { userRole } = useAuth();
  const { toast } = useToast();
  
  const [data, setData] = useState({
    vocational_profile: '',
    pages_per_day: '',
    hours_per_week: '',
    graduation_pathway: '',
    graduation_age: '',
    estimated_credits: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const canAccess = userRole === ROLES.SUPER_ADMIN || userRole === ROLES.COORDINADOR;

  useEffect(() => {
    if (studentId && canAccess) fetchPEIData();
    else setLoading(false);
  }, [studentId, canAccess]);

  const fetchPEIData = async () => {
    setLoading(true);
    try {
      const { data: record, error } = await supabase
        .from('student_pei')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      
      if (record) {
        setData({
          vocational_profile: record.vocational_profile || '',
          pages_per_day: record.pages_per_day || '',
          hours_per_week: record.hours_per_week || '',
          graduation_pathway: record.graduation_pathway || '',
          graduation_age: record.graduation_age || '',
          estimated_credits: record.estimated_credits || ''
        });
      }
    } catch (error) {
      console.error('Error fetching PEI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: existing, error: findError } = await supabase
        .from('student_pei')
        .select('id')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const payload = {
        student_id: studentId,
        vocational_profile: data.vocational_profile,
        pages_per_day: data.pages_per_day ? parseInt(data.pages_per_day) : null,
        hours_per_week: data.hours_per_week ? parseInt(data.hours_per_week) : null,
        graduation_pathway: data.graduation_pathway,
        graduation_age: data.graduation_age ? parseInt(data.graduation_age) : null,
        estimated_credits: data.estimated_credits ? parseFloat(data.estimated_credits) : null
      };

      if (existing) {
        const { error } = await supabase.from('student_pei').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('student_pei').insert([payload]);
        if (error) throw error;
      }

      toast({ title: 'Éxito', description: 'Datos del PEI guardados correctamente.' });
      setIsEditing(false);
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: 'Hubo un problema al guardar los datos.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
        <Lock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <h3 className="font-bold text-slate-700">Acceso Restringido</h3>
        <p className="text-slate-500 text-sm mt-1">Solo los coordinadores y administradores pueden acceder a esta sección.</p>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" /> Plan Educativo Individualizado (PEI)
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gestión académica y vocacional avanzada.</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
            <Edit className="w-4 h-4 mr-2" /> Editar PEI
          </Button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="font-bold text-sm text-slate-700 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500"/> Perfil Vocacional / Metas
              </label>
              <textarea 
                value={data.vocational_profile} 
                onChange={(e) => setData({...data, vocational_profile: e.target.value})}
                className="w-full border p-3 rounded-xl bg-slate-50 text-slate-900 min-h-[100px] focus:ring-2 focus:ring-indigo-500"
                placeholder="Describa las metas vocacionales del estudiante..."
              />
            </div>

            <div className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <h4 className="font-bold text-blue-900 flex items-center gap-2 border-b border-blue-200 pb-2"><Clock className="w-4 h-4"/> Ritmo de Estudio (Pacing)</h4>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Páginas por Día (Sugerido)</label>
                <input 
                  type="number" 
                  value={data.pages_per_day} 
                  onChange={(e) => setData({...data, pages_per_day: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white text-slate-900"
                  placeholder="Ej. 10"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Horas por Semana</label>
                <input 
                  type="number" 
                  value={data.hours_per_week} 
                  onChange={(e) => setData({...data, hours_per_week: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white text-slate-900"
                  placeholder="Ej. 25"
                />
              </div>
            </div>

            <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <h4 className="font-bold text-emerald-900 flex items-center gap-2 border-b border-emerald-200 pb-2"><GraduationCap className="w-4 h-4"/> Proyección de Graduación</h4>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Edad Estimada de Graduación</label>
                <input 
                  type="number" 
                  value={data.graduation_age} 
                  onChange={(e) => setData({...data, graduation_age: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white text-slate-900"
                  placeholder="Ej. 18"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Créditos Estimados Totales</label>
                <input 
                  type="number" 
                  step="0.5"
                  value={data.estimated_credits} 
                  onChange={(e) => setData({...data, estimated_credits: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white text-slate-900"
                  placeholder="Ej. 24.5"
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="font-bold text-sm text-slate-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500"/> Plan de Transición / Ruta de Graduación
              </label>
              <textarea 
                value={data.graduation_pathway} 
                onChange={(e) => setData({...data, graduation_pathway: e.target.value})}
                className="w-full border p-3 rounded-xl bg-slate-50 text-slate-900 min-h-[100px] focus:ring-2 focus:ring-indigo-500"
                placeholder="Describa la ruta académica hacia la graduación..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          <div className="col-span-1 md:col-span-2 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-indigo-500"/> Perfil Vocacional</h4>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.vocational_profile || <span className="text-slate-400 italic">No especificado</span>}</p>
          </div>

          <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
            <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-4"><Clock className="w-4 h-4"/> Ritmo de Estudio</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-blue-100 pb-2">
                <span className="text-sm text-blue-800">Páginas por Día</span>
                <span className="font-bold text-blue-900">{data.pages_per_day || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-800">Horas Semanales</span>
                <span className="font-bold text-blue-900">{data.hours_per_week || '-'}</span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
            <h4 className="font-bold text-emerald-900 flex items-center gap-2 mb-4"><GraduationCap className="w-4 h-4"/> Graduación</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-emerald-100 pb-2">
                <span className="text-sm text-emerald-800">Edad Estimada</span>
                <span className="font-bold text-emerald-900">{data.graduation_age ? `${data.graduation_age} años` : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-emerald-800">Créditos Totales</span>
                <span className="font-bold text-emerald-900">{data.estimated_credits || '-'}</span>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-indigo-500"/> Ruta de Graduación</h4>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{data.graduation_pathway || <span className="text-slate-400 italic">No especificado</span>}</p>
          </div>
        </div>
      )}
    </div>
  );
}
