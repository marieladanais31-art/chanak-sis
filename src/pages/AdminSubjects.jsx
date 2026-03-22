
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Library, Plus, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react';

export default function AdminSubjects() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    category: 'Core'
  });

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setSubjects(data || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      toast({ title: 'Error', description: 'No se pudieron cargar las materias.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const payload = {
        name: formData.name,
        category: formData.category
      };

      if (formData.id) {
        const { error } = await supabase.from('subjects').update(payload).eq('id', formData.id);
        if (error) throw error;
        toast({ title: 'Materia actualizada', description: 'Los cambios se han guardado.' });
      } else {
        const { error } = await supabase.from('subjects').insert([payload]);
        if (error) throw error;
        toast({ title: 'Materia creada', description: 'La nueva materia se ha añadido.' });
      }
      
      setIsModalOpen(false);
      fetchSubjects();
    } catch (err) {
      console.error('Error saving subject:', err);
      toast({ title: 'Error', description: 'No se pudo guardar la materia.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta materia?')) return;
    
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Materia eliminada', description: 'Se ha eliminado correctamente.' });
      fetchSubjects();
    } catch (err) {
      console.error('Error deleting subject:', err);
      toast({ title: 'Error', description: 'No se pudo eliminar. Puede que tenga calificaciones asociadas.', variant: 'destructive' });
    }
  };

  const openModal = (subject = null) => {
    if (subject) {
      setFormData({ id: subject.id, name: subject.name, category: subject.category || 'Core' });
    } else {
      setFormData({ id: null, name: '', category: 'Core' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Library className="w-5 h-5 text-blue-600" />
            Gestión de Materias
          </h2>
          <p className="text-slate-500 text-sm mt-1">Administre el catálogo de materias para el registro de PACES.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" /> Nueva Materia
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nombre de la Materia</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-12 text-center">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No hay materias registradas.</p>
                    </td>
                  </tr>
                ) : (
                  subjects.map(subject => (
                    <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{subject.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${
                          subject.category === 'Core' 
                            ? 'bg-blue-50 text-blue-700 border-blue-100' 
                            : 'bg-purple-50 text-purple-700 border-purple-100'
                        }`}>
                          {subject.category || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-end gap-2">
                        <button 
                          onClick={() => openModal(subject)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(subject.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {formData.id ? 'Editar Materia' : 'Nueva Materia'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre de la Materia *</label>
                <input 
                  required 
                  type="text"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                  placeholder="Ej. Math, Science, Art..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Tipo / Categoría *</label>
                <select 
                  required 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                >
                  <option value="Core">Core (Materia Principal)</option>
                  <option value="Electiva">Electiva</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  Las materias <strong>Core</strong> se promedian para el cálculo de GPA de los estudiantes.
                </p>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg font-bold transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !formData.name} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar Materia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
