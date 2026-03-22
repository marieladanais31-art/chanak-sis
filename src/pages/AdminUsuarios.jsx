
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { ShieldCheck, Users, Search, KeyRound, Loader2, X, AlertCircle, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Password Reset State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Edit User State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ first_name: '', last_name: '', email: '', role: '' });
  const [editLoading, setEditLoading] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); // 1) Prevents form submission
    
    if (!selectedUserForPassword || !newPassword) return;

    // 2) Validates password length
    if (newPassword.length < 6) {
      toast({ title: 'Atención', description: 'La contraseña debe tener al menos 6 caracteres.', variant: 'destructive' });
      return;
    }

    setPasswordLoading(true);
    try {
      // 3) Update password using admin API
      const { error } = await supabase.auth.admin.updateUserById(
        selectedUserForPassword.id,
        { password: newPassword }
      );

      if (error) throw error;

      // 5) Success alert
      toast({ title: 'Éxito', description: 'Contraseña actualizada exitosamente' });
      
      // 6) Close modal and reset state
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUserForPassword(null);
    } catch (error) {
      // 4) Error handling and logging
      console.error('❌ Password reset error:', error);
      toast({ 
        title: 'Error de actualización', 
        description: error.message || 'No se pudo actualizar la contraseña. Verifique permisos.', 
        variant: 'destructive' 
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditFormData({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role: user.role || 'student'
    });
    setShowEditModal(true);
  };

  const handleSaveUserChanges = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editFormData.first_name || !editFormData.last_name || !editFormData.role) {
      toast({ title: 'Atención', description: 'Todos los campos son obligatorios.', variant: 'destructive' });
      return;
    }

    setEditLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          role: editFormData.role
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({ title: 'Éxito', description: 'Usuario actualizado correctamente.' });
      setShowEditModal(false);
      loadUsers(); 
    } catch (error) {
      console.error('Error updating user:', error);
      toast({ title: 'Error', description: 'No se pudo actualizar el usuario.', variant: 'destructive' });
    } finally {
      setEditLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: '#193D6D' }}>
            <Users className="w-6 h-6" style={{ color: '#193D6D' }} /> Directorio de Usuarios
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gestión de cuentas y accesos del sistema</p>
        </div>
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm w-64 outline-none transition-all"
            style={{ focusRing: '#20B2AA' }}
          />
        </div>
      </div>

      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-4">Usuario</th>
              <th className="p-4">Email</th>
              <th className="p-4">Rol</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td>
              </tr>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="p-4 text-slate-600">{user.email}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase tracking-wider">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleEditUser(user)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-lg font-bold text-xs transition-colors border border-slate-200"
                    >
                      <Edit className="w-4 h-4" /> Editar
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedUserForPassword(user);
                        setNewPassword('');
                        setShowPasswordModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 hover:text-white rounded-lg font-bold text-xs transition-colors border border-slate-200"
                      style={{ hoverBackgroundColor: '#20B2AA' }}
                    >
                      <KeyRound className="w-4 h-4" /> Password
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-500">No se encontraron usuarios.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg flex items-center gap-2" style={{ color: '#193D6D' }}>
                <Edit className="w-5 h-5" style={{ color: '#20B2AA' }} /> Editar Usuario
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveUserChanges} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email (No editable):</label>
                <input 
                  type="email" 
                  disabled
                  value={editFormData.email}
                  className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl text-slate-500 cursor-not-allowed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre:</label>
                  <input 
                    type="text" 
                    required
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({...editFormData, first_name: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-xl outline-none text-slate-800 focus:border-[#20B2AA]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Apellido:</label>
                  <input 
                    type="text" 
                    required
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({...editFormData, last_name: e.target.value})}
                    className="w-full p-3 border border-slate-300 rounded-xl outline-none text-slate-800 focus:border-[#20B2AA]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Rol del Sistema:</label>
                <select 
                  required
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({...editFormData, role: e.target.value})}
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none text-slate-800 bg-white focus:border-[#20B2AA]"
                >
                  <option value="student">Student</option>
                  <option value="parent">Parent</option>
                  <option value="tutor">Tutor</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 py-2.5 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#193D6D' }}
                >
                  {editLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUserForPassword && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg flex items-center gap-2" style={{ color: '#193D6D' }}>
                <KeyRound className="w-5 h-5" style={{ color: '#20B2AA' }} /> Restablecer Contraseña
              </h3>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                <p className="text-slate-500 mb-1">Usuario seleccionado:</p>
                <p className="font-bold text-slate-800">{selectedUserForPassword.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nueva Contraseña:</label>
                <input 
                  type="password" 
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres..."
                  className="w-full p-3 border border-slate-300 rounded-xl outline-none text-slate-800 focus:border-[#20B2AA]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <AlertCircle className="w-4 h-4" /> Al guardar, el usuario podrá ingresar inmediatamente con esta nueva contraseña.
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={passwordLoading || newPassword.length < 6}
                  className="flex-1 py-2.5 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: '#193D6D' }}
                >
                  {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
