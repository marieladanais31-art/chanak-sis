
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { FileEdit, Save, Loader2, FilePlus, X } from 'lucide-react';

export default function PEIEditor({ studentId, studentName }) {
  const { toast } = useToast();
  const [pei, setPei] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    program_name: 'Homeschool / Umbrella Program',
    vocational_goal: '',
    learning_style: '',
    special_needs: '',
    accommodations: '',
    notes: '',
    status: 'Active'
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
        .order('created_at', { ascending: false })
        .limit(1);

      if (error && error.code !== 'PGRST116') throw error;

      if (data && data.length > 0) {
        const peiRecord = data[0];
        setPei(peiRecord);
        
        // Parse skills_focus if used to store JSON-like data, or just use raw fields
        let parsedSkills = {};
        try {
          if (peiRecord.skills_focus && peiRecord.skills_focus.length > 0) {
            const joined = peiRecord.skills_focus.join('');
            if (joined.startsWith('{')) parsedSkills = JSON.parse(joined);
          }
        } catch(e) {}

        setFormData({
          program_name: parsedSkills.program_name || 'Homeschool / Umbrella Program',
          vocational_goal: peiRecord.vocational_goal || '',
          learning_style: parsedSkills.learning_style || '',
          special_needs: parsedSkills.special_needs || '',
          accommodations: parsedSkills.accommodations || '',
          notes: parsedSkills.notes || '',
          status: peiRecord.status || 'Active'
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
      // Pack extra fields into skills_focus as an array of JSON string for schema compatibility
      const extraData = JSON.stringify({
        program_name: formData.program_name,
        learning_style: formData.learning_style,
        special_needs: formData.special_needs,
        accommodations: formData.accommodations,
        notes: formData.notes
      });

      const payload = {
        student_id: studentId,
        vocational_goal: formData.vocational_goal,
        status: formData.status,
        skills_focus: [extraData]
      };

      if (pei && pei.id) {
        const { error } = await supabase.from('student_pei').update(payload).eq('id', pei.id);
        if (error) throw error;
        toast({ title: 'Éxito', description: 'PEI actualizado correctamente.' });
      } else {
        const { data, error } = await supabase.from('student_pei').insert([payload]).select();
        if (error) throw error;
        if (data) setPei(data[0]);
        toast({ title: 'Éxito', description: 'PEI creado correctamente.' });
      }
      setIsEditing(false);
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar el PEI. Modo offline habilitado.', variant: 'destructive' });
      // Offline fallback
      setPei({ id: Date.now().toString(), ...formData });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="animate-spin text-indigo-600 w-6 h-6" /></div>;

  if (!pei && !isEditing) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
        <h3 className="text-lg font-bold text-slate-800 mb-2">Individualized Educational Plan (PEI)</h3>
        <p className="text-slate-500 mb-4 text-sm">No se ha creado un PEI para {studentName || 'este alumno'}.</p>
        <Button onClick={() => setIsEditing(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white btn-hover-effect">
          <FilePlus className="w-4 h-4 mr-2" /> Crear PEI
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-indigo-600" />
            {isEditing ? 'Editar PEI' : 'Individualized Educational Plan (PEI)'}
          </h3>
          {!isEditing && <p className="text-xs text-slate-500 mt-1">Programa: {formData.program_name}</p>}
        </div>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <FileEdit className="w-4 h-4 mr-2" /> Editar
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              <X className="w-4 h-4 mr-1" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="form-field-spacing">
          <label className="block text-sm font-bold text-slate-700 mb-1">Meta Vocacional</label>
          {isEditing ? (
            <input type="text" value={formData.vocational_goal} onChange={e => setFormData({...formData, vocational_goal: e.target.value})} className="w-full border p-2 rounded bg-slate-50 text-slate-900" placeholder="Ej: Ingeniería, Arte, etc." />
          ) : (
            <p className="p-2 bg-slate-50 rounded text-slate-700 min-h-[40px]">{formData.vocational_goal || 'No especificada'}</p>
          )}
        </div>

        <div className="form-field-spacing">
          <label className="block text-sm font-bold text-slate-700 mb-1">Estilo de Aprendizaje</label>
          {isEditing ? (
            <input type="text" value={formData.learning_style} onChange={e => setFormData({...formData, learning_style: e.target.value})} className="w-full border p-2 rounded bg-slate-50 text-slate-900" placeholder="Visual, Auditivo, Kinestésico..." />
          ) : (
            <p className="p-2 bg-slate-50 rounded text-slate-700 min-h-[40px]">{formData.learning_style || 'No especificado'}</p>
          )}
        </div>

        <div className="form-field-spacing md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-1">Necesidades Especiales / Enfoque</label>
          {isEditing ? (
            <textarea value={formData.special_needs} onChange={e => setFormData({...formData, special_needs: e.target.value})} className="w-full border p-2 rounded bg-slate-50 text-slate-900" rows="2" placeholder="Detalles de requerimientos especiales..." />
          ) : (
            <p className="p-2 bg-slate-50 rounded text-slate-700 min-h-[40px] whitespace-pre-wrap">{formData.special_needs || 'Ninguna registrada'}</p>
          )}
        </div>

        <div className="form-field-spacing md:col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-1">Acomodaciones</label>
          {isEditing ? (
            <textarea value={formData.accommodations} onChange={e => setFormData({...formData, accommodations: e.target.value})} className="w-full border p-2 rounded bg-slate-50 text-slate-900" rows="2" placeholder="Tiempo extra, herramientas, etc." />
          ) : (
            <p className="p-2 bg-slate-50 rounded text-slate-700 min-h-[40px] whitespace-pre-wrap">{formData.accommodations || 'Ninguna'}</p>
          )}
        </div>
      </div>
    </div>
  );
}
