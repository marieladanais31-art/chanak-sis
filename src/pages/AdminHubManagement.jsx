
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Building2, MapPin, User, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminHubManagement() {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHub, setEditingHub] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '', code: '' });
  const [saving, setSaving] = useState(false);
  
  const { toast } = useToast();

  const loadHubs = async () => {
    console.log('🔄 AdminHubManagement: Fetching Hubs');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('type', 'hub')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setHubs(data || []);
      console.log(`✅ AdminHubManagement: Loaded ${data?.length} hubs`);
    } catch (err) {
      console.error('❌ AdminHubManagement: Load error', err);
      toast({ title: 'Error', description: 'Error al cargar los hubs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHubs();
  }, []);

  const openModal = (hub = null) => {
    if (hub) {
      setEditingHub(hub);
      setFormData({ name: hub.name || '', location: hub.location || '', code: hub.code || '' });
    } else {
      setEditingHub(null);
      setFormData({ name: '', location: '', code: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    console.log('📝 AdminHubManagement: Saving hub', formData);
    
    try {
      if (editingHub) {
        const { error } = await supabase
          .from('organizations')
          .update({ name: formData.name, location: formData.location, code: formData.code })
          .eq('id', editingHub.id);
        if (error) throw error;
        toast({ title: 'Éxito', description: 'Hub actualizado correctamente' });
      } else {
        const { error } = await supabase
          .from('organizations')
          .insert([{ 
            id: crypto.randomUUID(), 
            type: 'hub', 
            name: formData.name, 
            location: formData.location,
            code: formData.code 
          }]);
        if (error) throw error;
        toast({ title: 'Éxito', description: 'Hub creado exitosamente' });
      }
      setIsModalOpen(false);
      loadHubs();
    } catch (err) {
      console.error('❌ AdminHubManagement: Save error', err);
      toast({ title: 'Error', description: 'Ocurrió un error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Estás seguro de eliminar el hub: ${name}?`)) return;
    
    console.log(`🗑️ AdminHubManagement: Deleting hub ${id}`);
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Éxito', description: 'Hub eliminado' });
      loadHubs();
    } catch (err) {
      console.error('❌ AdminHubManagement: Delete error', err);
      toast({ title: 'Error', description: 'Error al eliminar. Verifique dependencias.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Gestión de Hubs
          </h2>
          <p className="text-sm text-slate-500 mt-1">Centros educativos asociados a Chanak Academy</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" /> Nuevo Hub
        </button>
      </div>

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {hubs.map(hub => (
            <div key={hub.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openModal(hub)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white rounded shadow-sm border border-slate-200"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(hub.id, hub.name)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white rounded shadow-sm border border-slate-200"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-800 mb-4">{hub.name}</h3>
              
              <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{hub.location || 'Ubicación no especificada'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Responsable: {hub.code || 'No asignado'}</span>
                </div>
              </div>
            </div>
          ))}
          
          {hubs.length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-medium">No hay Hubs registrados en la plataforma.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">{editingHub ? 'Editar Hub' : 'Nuevo Hub'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Hub *</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Ej. Chanak Florida"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Ubicación (📍) *</label>
                <input 
                  required 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})} 
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Ej. Miami, USA"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Responsable (👤)</label>
                <input 
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})} 
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Nombre del director o responsable"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
