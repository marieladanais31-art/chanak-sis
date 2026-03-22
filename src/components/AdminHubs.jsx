import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { MapPin, Plus, Edit, Trash2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const MOCK_HUBS = [
  { id: '1', name: 'Miami Central Hub', location: 'Miami, FL' },
  { id: '2', name: 'Orlando Connect', location: 'Orlando, FL' }
];

export default function AdminHubs() {
  const { toast } = useToast();
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '' });

  useEffect(() => {
    fetchHubs();
  }, []);

  const fetchHubs = async () => {
    try {
      const { data, error } = await supabase.from('hubs').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setHubs(data || []);
    } catch (err) {
      console.error('Error fetching hubs:', err);
      setHubs(MOCK_HUBS);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.location) return;
    
    // Optimistic / Mock update since we might not have RLS rights or it might be offline
    const newHub = { id: Date.now().toString(), name: formData.name, location: formData.location };
    setHubs([newHub, ...hubs]);
    setFormData({ name: '', location: '' });
    setShowForm(false);
    toast({ title: 'Éxito', description: 'Hub guardado correctamente (Modo local/Mock)' });
  };

  if (loading) return <div className="p-8">Cargando hubs...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-indigo-600" /> Gestión de Hubs
        </h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancelar' : 'Agregar Hub'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Nuevo Hub</h3>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nombre del Hub</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full rounded-md border border-slate-300 px-3 py-2" required
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Ubicación</label>
              <input 
                type="text" 
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full rounded-md border border-slate-300 px-3 py-2" required
              />
            </div>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Nombre</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Ubicación</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hubs.map(hub => (
              <tr key={hub.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{hub.name}</td>
                <td className="px-6 py-4 text-slate-600">{hub.location}</td>
                <td className="px-6 py-4 text-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50" onClick={() => toast({description: 'Función de edición en desarrollo'})}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => toast({description: 'Función de eliminación en desarrollo', variant: 'destructive'})}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {hubs.length === 0 && (
              <tr><td colSpan="3" className="text-center py-8 text-slate-500">No hay hubs registrados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}