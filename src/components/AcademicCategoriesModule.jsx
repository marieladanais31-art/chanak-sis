
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit2, BookOpen, Globe, Brain, Users, Lightbulb, MapPin, Save, X, Loader2 } from 'lucide-react';

const CATEGORIES = [
  { id: 'Core A.C.E.', label: 'Core A.C.E.', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: BookOpen },
  { id: 'Life Skills', label: 'Life Skills', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Brain },
  { id: 'Second Language', label: 'Second Language', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Globe },
  { id: 'Local Social Studies', label: 'Local Social Studies', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: MapPin },
  { id: 'Electivas', label: 'Electivas', color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Lightbulb },
  { id: 'Materias Transferidas', label: 'Materias Transferidas', color: 'bg-slate-100 text-slate-700 border-slate-300', icon: Users }
];

export default function AcademicCategoriesModule({ studentId }) {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    category: 'Core A.C.E.',
    subject_name: '',
    grade: '',
    credits: '1.0',
    pace_number: '',
    transfer_source: ''
  });

  useEffect(() => {
    if (studentId) fetchSubjects();
  }, [studentId]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las materias.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (subject = null) => {
    if (subject) {
      setFormData({
        id: subject.id,
        category: subject.category,
        subject_name: subject.subject_name,
        grade: subject.grade || '',
        credits: subject.credits || '1.0',
        pace_number: subject.pace_number || '',
        transfer_source: subject.transfer_source || ''
      });
    } else {
      setFormData({ id: null, category: 'Core A.C.E.', subject_name: '', grade: '', credits: '1.0', pace_number: '', transfer_source: '' });
    }
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject_name) {
      toast({ title: 'Atención', description: 'El nombre de la materia es requerido.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        student_id: studentId,
        category: formData.category,
        subject_name: formData.subject_name,
        grade: formData.grade || null,
        credits: formData.credits || null,
        pace_number: formData.category === 'Core A.C.E.' ? formData.pace_number : null,
        is_transferred: formData.category === 'Materias Transferidas',
        transfer_source: formData.category === 'Materias Transferidas' ? formData.transfer_source : null
      };

      if (formData.id) {
        const { error } = await supabase.from('student_subjects').update(payload).eq('id', formData.id);
        if (error) throw error;
        toast({ title: 'Actualizado', description: 'Materia actualizada correctamente.' });
      } else {
        const { error } = await supabase.from('student_subjects').insert([payload]);
        if (error) throw error;
        toast({ title: 'Creado', description: 'Materia registrada correctamente.' });
      }
      
      setShowForm(false);
      fetchSubjects();
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: 'Hubo un error al guardar los datos.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta materia?')) return;
    try {
      const { error } = await supabase.from('student_subjects').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Eliminado', description: 'La materia fue eliminada.' });
      setSubjects(subjects.filter(s => s.id !== id));
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar la materia.', variant: 'destructive' });
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2"/> Cargando materias...</div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" /> Registro Académico Categorizado
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gestione el plan de estudios del estudiante por áreas.</p>
        </div>
        <Button onClick={() => handleOpenForm()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Agregar Materia
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 bg-slate-50 p-5 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">{formData.id ? 'Editar Materia' : 'Nueva Materia'}</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full border p-2 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Materia</label>
              <input 
                required
                type="text" 
                value={formData.subject_name} 
                onChange={(e) => setFormData({...formData, subject_name: e.target.value})}
                className="w-full border p-2 rounded-lg bg-white text-slate-900"
                placeholder="Ej. Math 7, Biology, etc."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Calificación / Nota (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={formData.grade} 
                onChange={(e) => setFormData({...formData, grade: e.target.value})}
                className="w-full border p-2 rounded-lg bg-white text-slate-900"
                placeholder="Opcional"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Créditos</label>
              <input 
                type="number" 
                step="0.5"
                value={formData.credits} 
                onChange={(e) => setFormData({...formData, credits: e.target.value})}
                className="w-full border p-2 rounded-lg bg-white text-slate-900"
              />
            </div>

            {formData.category === 'Core A.C.E.' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Número de PACE</label>
                <input 
                  type="text" 
                  value={formData.pace_number} 
                  onChange={(e) => setFormData({...formData, pace_number: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white text-slate-900"
                  placeholder="Ej. 1085-1096"
                />
              </div>
            )}

            {formData.category === 'Materias Transferidas' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Escuela de Origen / Fuente</label>
                <input 
                  type="text" 
                  value={formData.transfer_source} 
                  onChange={(e) => setFormData({...formData, transfer_source: e.target.value})}
                  className="w-full border p-2 rounded-lg bg-white text-slate-900"
                  placeholder="Nombre del colegio anterior"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-8">
        {CATEGORIES.map(category => {
          const catSubjects = subjects.filter(s => s.category === category.id);
          if (catSubjects.length === 0) return null;
          const Icon = category.icon;

          return (
            <div key={category.id} className="animate-in fade-in">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-t-lg border-x border-t font-bold ${category.color}`}>
                <Icon className="w-4 h-4" /> {category.label}
                <span className="ml-auto text-xs font-normal px-2 py-0.5 bg-white/50 rounded-full">
                  {catSubjects.length} materias
                </span>
              </div>
              <div className="border rounded-b-lg border-slate-200 overflow-hidden bg-white">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-500">Materia</th>
                      {category.id === 'Core A.C.E.' && <th className="px-4 py-3 font-medium text-slate-500">PACEs</th>}
                      {category.id === 'Materias Transferidas' && <th className="px-4 py-3 font-medium text-slate-500">Fuente</th>}
                      <th className="px-4 py-3 font-medium text-slate-500">Nota</th>
                      <th className="px-4 py-3 font-medium text-slate-500">Créditos</th>
                      <th className="px-4 py-3 text-right font-medium text-slate-500">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {catSubjects.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{sub.subject_name}</td>
                        {category.id === 'Core A.C.E.' && <td className="px-4 py-3 text-slate-600">{sub.pace_number || '-'}</td>}
                        {category.id === 'Materias Transferidas' && <td className="px-4 py-3 text-slate-600">{sub.transfer_source || '-'}</td>}
                        <td className="px-4 py-3">
                          {sub.grade ? <span className="font-bold text-slate-700">{sub.grade}%</span> : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{sub.credits || '0'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenForm(sub)} className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(sub.id)} className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        {subjects.length === 0 && !showForm && (
          <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
            No hay materias registradas. Haga clic en "Agregar Materia" para comenzar.
          </div>
        )}
      </div>
    </div>
  );
}
