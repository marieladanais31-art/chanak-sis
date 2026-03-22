
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Plus, Edit, Trash2, Building2, MapPin, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function AdminHubs() {
  const [hubs, setHubs] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHub, setEditingHub] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    location: '',
    coordinator_id: ''
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    location: '',
    coordinator_id: ''
  });

  useEffect(() => {
    loadHubs();
    loadCoordinators();
  }, []);

  const loadHubs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setHubs(data || []);
    } catch (error) {
      console.error('Error fetching hubs:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los hubs.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadCoordinators = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'coordinator')
        .order('first_name');
        
      if (!error && data) {
        setCoordinators(data);
      }
    } catch (error) {
      console.error('Error fetching coordinators:', error);
    }
  };

  const handleCreateHub = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const insertData = {
        name: form.name,
        location: form.location,
        type: 'hub',
        coordinator_id: form.coordinator_id || null
      };

      const { error } = await supabase.from('organizations').insert([insertData]);
      if (error) throw error;
      
      toast({ title: 'Éxito', description: 'Hub creado correctamente.' });
      setIsModalOpen(false);
      setForm({ name: '', location: '', coordinator_id: '' });
      loadHubs();
    } catch (err) {
      console.error('Create hub error:', err);
      toast({ title: 'Error', description: 'No se pudo crear el hub.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditHub = (hub) => {
    setEditingHub(hub);
    setEditFormData({
      name: hub.name || '',
      location: hub.location || '',
      coordinator_id: hub.coordinator_id || ''
    });
    setShowEditModal(true);
  };

  const handleSaveHub = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData = {
        name: editFormData.name,
        location: editFormData.location,
        coordinator_id: editFormData.coordinator_id || null
      };

      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', editingHub.id);

      if (error) throw error;
      
      toast({ title: 'Éxito', description: 'Hub actualizado correctamente.' });
      setShowEditModal(false);
      loadHubs();
    } catch (err) {
      console.error('Update hub error:', err);
      toast({ title: 'Error', description: 'No se pudo actualizar el hub.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    toast({ title: 'En desarrollo', description: '🚧 This feature isn\'t implemented yet—but don\'t worry! You can request it in your next prompt! 🚀' });
  };

  const getCoordinatorName = (coordId) => {
    const coord = coordinators.find(c => c.id === coordId);
    return coord ? `${coord.first_name || ''} ${coord.last_name || ''}`.trim() : 'Sin asignar';
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Hubs</h2>
        <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Crear Hub
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hubs.map(hub => (
          <div key={hub.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col hover:border-indigo-200 hover:shadow-md transition-all group">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-black text-lg text-slate-800 leading-tight">{hub.name}</h3>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {hub.location || 'Sin ubicación'}
                </p>
              </div>
            </div>

            <div className="mb-4 pt-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Coordinador Asignado</p>
              <p className="text-sm text-slate-800 font-medium">{getCoordinatorName(hub.coordinator_id)}</p>
            </div>
            
            <div className="mt-auto pt-4 border-t border-slate-100 flex justify-end gap-2">
              <Button onClick={() => handleEditHub(hub)} variant="outline" size="sm" className="text-slate-600 font-bold hover:bg-slate-50">
                <Edit className="w-4 h-4 mr-2" /> Editar
              </Button>
              <Button onClick={handleDelete} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {hubs.length === 0 && (
          <div className="col-span-full p-12 text-center text-slate-500 font-medium bg-white rounded-xl border border-slate-200">
            No hay hubs registrados.
          </div>
        )}
      </div>

      {/* Create Hub Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" /> Crear Nuevo Hub
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateHub} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Hub</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  placeholder="Ej. Chanak Academy - Bogotá"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Ubicación (Ciudad / País)</label>
                <input
                  required
                  type="text"
                  value={form.location}
                  onChange={e => setForm({...form, location: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  placeholder="Ej. Bogotá, Colombia"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Coordinador Asignado</label>
                <select
                  value={form.coordinator_id}
                  onChange={e => setForm({...form, coordinator_id: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                >
                  <option value="">Sin coordinador asignado</option>
                  {coordinators.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 font-bold text-slate-700">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Hub'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hub Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" /> Editar Hub
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveHub} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Hub</label>
                <input
                  required
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Ubicación (Ciudad / País)</label>
                <input
                  required
                  type="text"
                  value={editFormData.location}
                  onChange={e => setEditFormData({...editFormData, location: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Coordinador Asignado</label>
                <select
                  value={editFormData.coordinator_id}
                  onChange={e => setEditFormData({...editFormData, coordinator_id: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 bg-white"
                >
                  <option value="">Sin coordinador asignado</option>
                  {coordinators.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" onClick={() => setShowEditModal(false)} variant="outline" className="flex-1 font-bold text-slate-700">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
