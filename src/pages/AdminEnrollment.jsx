
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { UserPlus, Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminEnrollment() {
  const [students, setStudents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    grade_level: '',
    hub_id: '',
    parent_id: '',
    status: 'Enrolled'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [hubsRes, parentsRes, studentsRes] = await Promise.all([
        supabase.from('organizations').select('id, name').eq('type', 'hub'),
        supabase.from('profiles').select('id, first_name, last_name, email').eq('role', 'parent'),
        supabase.from('students').select('id, first_name, last_name, grade_level, status').order('created_at', { ascending: false }).limit(20)
      ]);
      setHubs(hubsRes.data || []);
      setParents(parentsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Error al cargar datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.hub_id || !formData.parent_id) {
      return toast({ title: 'Atención', description: 'Faltan campos requeridos', variant: 'destructive' });
    }
    setSaving(true);
    try {
      const newStudentId = crypto.randomUUID();
      const { error } = await supabase.from('students').insert([{
        id: newStudentId,
        ...formData
      }]);
      if (error) throw error;
      toast({ title: 'Éxito', description: 'Estudiante matriculado' });
      setIsModalOpen(false);
      setFormData({ first_name: '', last_name: '', grade_level: '', hub_id: '', parent_id: '', status: 'Enrolled' });
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo matricular', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-blue-600" /> Matrícula
        </h2>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Estudiante
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-slate-800 mb-4">Últimas Matriculaciones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map(s => (
            <div key={s.id} className="p-4 border border-slate-200 rounded-lg">
              <p className="font-bold text-slate-800">{s.first_name} {s.last_name}</p>
              <p className="text-sm text-slate-500">Grado: {s.grade_level || 'N/A'}</p>
              <p className="text-xs mt-2 inline-block px-2 py-1 bg-green-50 text-green-700 rounded border border-green-100">{s.status}</p>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Nueva Matrícula</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre *</label>
                  <input required value={formData.first_name} onChange={e=>setFormData({...formData, first_name: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-slate-800" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Apellido</label>
                  <input value={formData.last_name} onChange={e=>setFormData({...formData, last_name: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-slate-800" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nivel/Grado</label>
                <input value={formData.grade_level} onChange={e=>setFormData({...formData, grade_level: e.target.value})} placeholder="Ej. 5th Grade" className="w-full p-2 border border-slate-300 rounded text-slate-800" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Hub *</label>
                <select required value={formData.hub_id} onChange={e=>setFormData({...formData, hub_id: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-slate-800">
                  <option value="">Seleccione un Hub</option>
                  {hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tutor/Padre *</label>
                <select required value={formData.parent_id} onChange={e=>setFormData({...formData, parent_id: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-slate-800">
                  <option value="">Seleccione Padre</option>
                  {parents.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.email})</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-300 rounded text-slate-700 font-medium">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded font-medium disabled:opacity-50">{saving ? 'Guardando...' : 'Matricular'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
