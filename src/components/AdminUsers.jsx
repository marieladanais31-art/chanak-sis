
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { UserCog, Plus, Edit, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const MOCK_USERS = [
  { id: '1', email: 'admin@chanakacademy.org', full_name: 'Super Admin', role: 'super_admin' },
  { id: '2', email: 'admisiones@chanakacademy.org', full_name: 'Equipo Admisiones', role: 'admisiones' }
];

const ROLES_OPTIONS = ['super_admin', 'admisiones', 'director', 'coordinador', 'parent'];

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ email: '', full_name: '', role: 'parent' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers(MOCK_USERS);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.role) return;
    
    const newUser = { id: Date.now().toString(), ...formData };
    setUsers([newUser, ...users]);
    setFormData({ email: '', full_name: '', role: 'parent' });
    setShowForm(false);
    toast({ title: 'Éxito', description: 'Usuario creado (Modo local/Mock)' });
  };

  if (loading) return <div className="p-8">Cargando usuarios...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <UserCog className="w-6 h-6 text-indigo-600" /> Gestión de Usuarios
        </h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancelar' : 'Agregar Usuario'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Nuevo Usuario</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Nombre Completo</label>
              <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Rol</label>
              <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full rounded-md border border-slate-300 px-3 py-2">
                {ROLES_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="w-4 h-4 mr-2" /> Guardar Usuario
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Nombre</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Rol</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 text-slate-600">{user.email}</td>
                <td className="px-6 py-4 font-medium text-slate-800">{user.full_name || user.first_name || 'N/A'}</td>
                <td className="px-6 py-4">
                  <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-medium border border-slate-200">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50" onClick={() => toast({description: 'Edición en desarrollo'})}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
