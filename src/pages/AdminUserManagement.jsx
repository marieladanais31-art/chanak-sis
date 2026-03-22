
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Mail, Lock, Trash2, Key, Loader2, Eye, EyeOff } from 'lucide-react';
import { ROLES } from '@/context/AuthContext';

export default function AdminUserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: ROLES.STUDENT
  });
  
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    sendEmail: false
  });
  
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('❌ Error loading users:', err);
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      console.log('🔐 Creating user:', createForm.email);
      
      // Create auth user with admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: createForm.email,
        password: createForm.password,
        email_confirm: true,
        user_metadata: {
          first_name: createForm.firstName,
          last_name: createForm.lastName,
          role: createForm.role
        }
      });
      
      if (authError) throw authError;
      
      console.log('✅ Auth user created:', authData.user.id);
      
      // Update profile with role and name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: createForm.firstName,
          last_name: createForm.lastName,
          role: createForm.role
        })
        .eq('id', authData.user.id);
      
      if (profileError) throw profileError;
      
      toast({ title: 'Usuario creado', description: `Usuario ${createForm.email} creado exitosamente.` });
      setIsCreateModalOpen(false);
      setCreateForm({ email: '', password: '', firstName: '', lastName: '', role: ROLES.STUDENT });
      loadUsers();
    } catch (err) {
      console.error('❌ Error creating user:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo crear el usuario.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (passwordForm.sendEmail) {
        // Send password reset email
        const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
        if (error) throw error;
        toast({ title: 'Email enviado', description: 'Se ha enviado un email de recuperación.' });
      } else {
        // Update password directly
        const { error } = await supabase.auth.admin.updateUserById(selectedUser.id, {
          password: passwordForm.newPassword
        });
        if (error) throw error;
        toast({ title: 'Contraseña actualizada', description: 'La contraseña ha sido cambiada exitosamente.' });
      }
      
      setIsPasswordModalOpen(false);
      setPasswordForm({ newPassword: '', sendEmail: false });
      setSelectedUser(null);
    } catch (err) {
      console.error('❌ Error resetting password:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo resetear la contraseña.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!confirm(`¿Está seguro de eliminar el usuario ${userEmail}?`)) return;
    
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      
      toast({ title: 'Usuario eliminado', description: 'El usuario ha sido eliminado.' });
      loadUsers();
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      toast({ title: 'Error', description: 'No se pudo eliminar el usuario.', variant: 'destructive' });
    }
  };

  const getRoleBadgeClass = (role) => {
    const baseClass = "px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider";
    switch(role) {
      case ROLES.SUPER_ADMIN: return `${baseClass} bg-purple-100 text-purple-700`;
      case ROLES.COORDINATOR: return `${baseClass} bg-indigo-100 text-indigo-700`;
      case ROLES.TUTOR: return `${baseClass} bg-teal-100 text-teal-700`;
      case ROLES.PARENT: return `${baseClass} bg-blue-100 text-blue-700`;
      case ROLES.STUDENT: return `${baseClass} bg-slate-100 text-slate-700`;
      default: return `${baseClass} bg-gray-100 text-gray-700`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-600" /> Gestión de Usuarios
        </h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Crear Usuario
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="p-4 text-slate-600">{user.email}</td>
                    <td className="p-4">
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => { setSelectedUser(user); setIsPasswordModalOpen(true); }}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Resetear contraseña"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="p-8 text-center text-slate-500">No hay usuarios registrados.</div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" /> Crear Nuevo Usuario
              </h3>
            </div>
            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">Nombre</label>
                  <input
                    required
                    type="text"
                    value={createForm.firstName}
                    onChange={e => setCreateForm({...createForm, firstName: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">Apellido</label>
                  <input
                    required
                    type="text"
                    value={createForm.lastName}
                    onChange={e => setCreateForm({...createForm, lastName: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    placeholder="Pérez"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">Email</label>
                <input
                  required
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm({...createForm, email: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                  placeholder="usuario@chanakacademy.org"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">Contraseña</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={createForm.password}
                    onChange={e => setCreateForm({...createForm, password: e.target.value})}
                    className="w-full p-2.5 pr-10 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">Rol</label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm({...createForm, role: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                >
                  {Object.values(ROLES).map(role => (
                    <option key={role} value={role}>{role.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" /> Resetear Contraseña
              </h3>
              <p className="text-sm text-slate-500 mt-1">Usuario: {selectedUser.email}</p>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={passwordForm.sendEmail}
                  onChange={e => setPasswordForm({...passwordForm, sendEmail: e.target.checked})}
                  className="w-4 h-4"
                />
                <label htmlFor="sendEmail" className="text-sm font-medium text-blue-900">
                  Enviar email de recuperación
                </label>
              </div>
              
              {!passwordForm.sendEmail && (
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      required={!passwordForm.sendEmail}
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className="w-full p-2.5 pr-10 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsPasswordModalOpen(false); setSelectedUser(null); setPasswordForm({ newPassword: '', sendEmail: false }); }}
                  className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
