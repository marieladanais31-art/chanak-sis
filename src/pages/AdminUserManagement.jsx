import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import {
  Users, UserPlus, Pencil, Mail, Loader2,
  Eye, EyeOff, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { ROLES } from '@/context/AuthContext';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: ROLES.SUPER_ADMIN, label: 'Super Admin' },
  { value: ROLES.ADMIN,       label: 'Admin' },
  { value: ROLES.COORDINATOR, label: 'Coordinador' },
  { value: ROLES.TUTOR,       label: 'Tutor' },
  { value: ROLES.PARENT,      label: 'Padre/Familia' },
  { value: ROLES.STUDENT,     label: 'Estudiante' },
];

const ROLE_BADGE = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin:       'bg-indigo-100 text-indigo-700',
  coordinator: 'bg-blue-100 text-blue-700',
  tutor:       'bg-teal-100 text-teal-700',
  parent:      'bg-amber-100 text-amber-700',
  student:     'bg-slate-100 text-slate-600',
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminUserManagement() {
  const { toast } = useToast();

  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [resetOpen, setResetOpen]   = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  // Formulario de creación
  const [createForm, setCreateForm] = useState({
    email: '', password: '', firstName: '', lastName: '', role: ROLES.PARENT,
  });
  const [showCreatePwd, setShowCreatePwd] = useState(false);

  // Formulario de edición de perfil
  const EDIT_DEFAULTS = { firstName: '', lastName: '', role: '', isActive: true };
  const [editForm, setEditForm] = useState(EDIT_DEFAULTS);

  // ─── Carga de usuarios ──────────────────────────────────────────────────────

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
      console.error('[AdminUserManagement] loadUsers:', err);
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  // ─── Crear usuario ──────────────────────────────────────────────────────────
  // NOTA: La creación real de usuarios en auth.users requiere una Edge Function
  // con service_role key. Esta llamada solo funciona si el cliente tiene permisos
  // de admin (no recomendado en producción con anon key).
  // PENDIENTE BACKEND: Mover handleCreateUser a una Edge Function de Supabase.

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Registrar usuario con email/password; confirmar automáticamente el email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: createForm.email,
        password: createForm.password,
        options: {
          data: {
            first_name: createForm.firstName,
            last_name: createForm.lastName,
          },
        },
      });
      if (authError) throw authError;

      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error('No se recibió el ID del nuevo usuario.');

      // Actualizar el perfil con nombre y rol
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: createForm.firstName,
          last_name:  createForm.lastName,
          role:       createForm.role,
        })
        .eq('id', newUserId);

      if (profileError) throw profileError;

      toast({ title: 'Usuario creado', description: `${createForm.email} fue registrado. Debe confirmar su correo.` });
      setCreateOpen(false);
      setCreateForm({ email: '', password: '', firstName: '', lastName: '', role: ROLES.PARENT });
      await loadUsers();
    } catch (err) {
      console.error('[AdminUserManagement] createUser:', err);
      toast({ title: 'Error al crear', description: err.message || 'No se pudo crear el usuario.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Editar perfil ──────────────────────────────────────────────────────────
  // Solo modifica datos en public.profiles (nombre, rol, is_active).
  // Cambio de email o contraseña requiere backend → marcado como PENDIENTE.

  const openEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.first_name || '',
      lastName:  user.last_name  || '',
      role:      user.role       || ROLES.STUDENT,
      isActive:  user.is_active  ?? true,
    });
    setEditOpen(true);
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editForm.firstName.trim(),
          last_name:  editForm.lastName.trim(),
          role:       editForm.role,
          is_active:  editForm.isActive,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({ title: 'Perfil actualizado', description: `El perfil de ${selectedUser.email} fue modificado.` });
      setEditOpen(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      console.error('[AdminUserManagement] editProfile:', err);
      toast({ title: 'Error al editar', description: err.message || 'No se pudo actualizar el perfil.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Enviar email de recuperación de contraseña ───────────────────────────
  // Usa el flujo estándar de Supabase Auth (no requiere service key).

  const openReset = (user) => {
    setSelectedUser(user);
    setResetOpen(true);
  };

  const handleSendRecoveryEmail = async () => {
    if (!selectedUser?.email) return;
    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email, { redirectTo });
      if (error) throw error;

      toast({ title: 'Correo enviado', description: `Se envió el enlace de recuperación a ${selectedUser.email}.` });
      setResetOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('[AdminUserManagement] sendRecovery:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo enviar el correo.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Gestión de Usuarios
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Administra perfiles, roles y accesos del sistema.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por nombre, email o rol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 text-sm"
        />
      </div>

      {/* Aviso pendiente backend */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800">Funciones pendientes de implementación backend</p>
          <p className="text-amber-700 mt-0.5">
            Cambiar el <strong>email</strong> o la <strong>contraseña</strong> de otros usuarios requiere una Edge Function con
            service_role key. Por seguridad, estas acciones no se ejecutan desde el cliente.
            El envío del enlace de recuperación sí funciona con el flujo estándar de Supabase Auth.
          </p>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-bold">Nombre</th>
                  <th className="p-4 font-bold">Email</th>
                  <th className="p-4 font-bold text-center">Rol</th>
                  <th className="p-4 font-bold text-center">Estado</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => (
                  <tr key={user.id} className={`hover:bg-slate-50 ${!user.is_active ? 'opacity-50' : ''}`}>
                    <td className="p-4 font-bold text-slate-800">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{user.email}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${ROLE_BADGE[user.role] || 'bg-gray-100 text-gray-700'}`}>
                        {user.role || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {user.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                          title="Editar perfil"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openReset(user)}
                          className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                          title="Enviar enlace de recuperación"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-400">
                      No se encontraron usuarios.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal: Crear usuario ── */}
      {createOpen && (
        <ModalShell title="Nuevo Usuario" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre">
                <input
                  required type="text"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                  className={INPUT_CLS} placeholder="Juan"
                />
              </Field>
              <Field label="Apellido">
                <input
                  required type="text"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                  className={INPUT_CLS} placeholder="Pérez"
                />
              </Field>
            </div>
            <Field label="Correo electrónico">
              <input
                required type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className={INPUT_CLS} placeholder="usuario@chanakacademy.org"
              />
            </Field>
            <Field label="Contraseña temporal">
              <div className="relative">
                <input
                  required
                  type={showCreatePwd ? 'text' : 'password'}
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className={`${INPUT_CLS} pr-10`} placeholder="Mínimo 8 caracteres"
                />
                <button type="button" onClick={() => setShowCreatePwd(!showCreatePwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCreatePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <Field label="Rol">
              <RoleSelect value={createForm.role} onChange={(v) => setCreateForm({ ...createForm, role: v })} />
            </Field>
            <ModalActions onCancel={() => setCreateOpen(false)} submitting={submitting} label="Crear usuario" />
          </form>
        </ModalShell>
      )}

      {/* ── Modal: Editar perfil ── */}
      {editOpen && selectedUser && (
        <ModalShell title={`Editar perfil — ${selectedUser.email}`} onClose={() => setEditOpen(false)}>
          <form onSubmit={handleEditProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Nombre">
                <input
                  required type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className={INPUT_CLS}
                />
              </Field>
              <Field label="Apellido">
                <input
                  required type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className={INPUT_CLS}
                />
              </Field>
            </div>
            <Field label="Rol">
              <RoleSelect value={editForm.role} onChange={(v) => setEditForm({ ...editForm, role: v })} />
            </Field>
            <Field label="Estado">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-blue-600"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700 select-none">
                  Usuario activo
                </label>
              </div>
            </Field>

            {/* Acciones no implementadas en frontend → pendiente backend */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Pendiente (Edge Function):</strong> cambio de email y contraseña de
              terceros requiere service_role key en el servidor. Usa el botón de correo de recuperación para que el
              usuario restablezca su propia contraseña.
            </div>

            <ModalActions onCancel={() => setEditOpen(false)} submitting={submitting} label="Guardar cambios" />
          </form>
        </ModalShell>
      )}

      {/* ── Modal: Enviar email de recuperación ── */}
      {resetOpen && selectedUser && (
        <ModalShell title="Enviar enlace de recuperación" onClose={() => setResetOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Se enviará un enlace de recuperación de contraseña a{' '}
              <strong className="text-slate-800">{selectedUser.email}</strong>.
              El usuario podrá establecer una nueva contraseña a través del enlace.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setResetOpen(false); setSelectedUser(null); }}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendRecoveryEmail}
                disabled={submitting}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Enviar enlace
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

const INPUT_CLS = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function RoleSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={INPUT_CLS}
    >
      {ROLE_OPTIONS.map((r) => (
        <option key={r.value} value={r.value}>{r.label}</option>
      ))}
    </select>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, submitting, label }) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center"
      >
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : label}
      </button>
    </div>
  );
}
