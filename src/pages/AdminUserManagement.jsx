import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Pencil,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'coordinator', label: 'Coordinador' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'parent', label: 'Padre' },
  { value: 'family', label: 'Familia' },
  { value: 'student', label: 'Estudiante' },
];

const CANONICAL_ROLES = ROLE_OPTIONS.map((role) => role.value);
const COORDINATOR_ROLES = ['coordinator'];
const TUTOR_ROLES = ['tutor', 'mentor'];
const FAMILY_ROLES = ['parent', 'family'];

const ROLE_BADGE = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-indigo-100 text-indigo-700',
  coordinator: 'bg-blue-100 text-blue-700',
  tutor: 'bg-teal-100 text-teal-700',
  mentor: 'bg-cyan-100 text-cyan-700',
  parent: 'bg-amber-100 text-amber-700',
  family: 'bg-orange-100 text-orange-700',
  student: 'bg-slate-100 text-slate-600',
};

const EMPTY_CREATE = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'parent',
  hubId: '',
  tutorStudentIds: [],
  familyStudentIds: [],
  emailConfirm: true,
};

const EMPTY_EDIT = {
  firstName: '',
  lastName: '',
  role: 'student',
  isActive: true,
  hubId: '',
  tutorStudentIds: [],
  familyStudentIds: [],
};

const INPUT_CLS = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';

function getFullName(firstName, lastName, fallback = '') {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || fallback;
}

function getStudentName(student) {
  return getFullName(student.first_name, student.last_name, student.full_name || 'Estudiante sin nombre');
}

function uniqueIds(ids) {
  return [...new Set((ids || []).filter(Boolean))];
}

function serializeErrorDetail(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.message;
  try {
    return JSON.stringify(value, null, 2);
  } catch (_err) {
    return String(value);
  }
}

async function getFunctionErrorDetails(data, error) {
  const details = [];

  if (error) {
    details.push(error.message || serializeErrorDetail(error));

    const response = error.context;
    if (response && typeof response.clone === 'function') {
      try {
        const body = await response.clone().json();
        details.push(serializeErrorDetail(body));
      } catch (_jsonError) {
        try {
          const text = await response.clone().text();
          if (text) details.push(text);
        } catch (_textError) {
          // Keep the original Functions error when the response body cannot be read.
        }
      }
    }
  }

  if (data?.error) details.push(data.error);
  if (data?.details) details.push(serializeErrorDetail(data.details));

  return [...new Set(details.filter(Boolean))].join(' | ');
}

export default function AdminUserManagement() {
  const { toast } = useToast();

  const [profiles, setProfiles] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [familyStudents, setFamilyStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [showCreatePwd, setShowCreatePwd] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profilesRes, hubsRes, studentsRes, familyLinksRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('organizations').select('id, name').order('name'),
        supabase
          .from('students')
          .select('id, first_name, last_name, full_name, grade_level, us_grade_level, hub_id, tutor_id')
          .order('first_name', { ascending: true }),
        supabase.from('family_students').select('family_id, student_id'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (hubsRes.error) throw hubsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (familyLinksRes.error) throw familyLinksRes.error;

      setProfiles(profilesRes.data || []);
      setHubs(hubsRes.data || []);
      setStudents(studentsRes.data || []);
      setFamilyStudents(familyLinksRes.data || []);
    } catch (err) {
      console.error('[AdminUserManagement] loadData:', err);
      toast({ title: 'Error', description: err.message || 'No se pudieron cargar usuarios y asignaciones.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const reloadFamilyStudents = async () => {
    const { data, error } = await supabase
      .from('family_students')
      .select('family_id, student_id');
    if (error) throw error;

    const familyStudents = data || [];
    setFamilyStudents(familyStudents);
    return familyStudents;
  };

  const filteredProfiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((profile) => (
      profile.email?.toLowerCase().includes(q)
      || profile.first_name?.toLowerCase().includes(q)
      || profile.last_name?.toLowerCase().includes(q)
      || profile.full_name?.toLowerCase().includes(q)
      || profile.role?.toLowerCase().includes(q)
    ));
  }, [profiles, searchTerm]);

  const studentsByTutor = useMemo(() => {
    const map = new Map();
    students.forEach((student) => {
      if (!student.tutor_id) return;
      const existing = map.get(student.tutor_id) || [];
      existing.push(student.id);
      map.set(student.tutor_id, existing);
    });
    return map;
  }, [students]);

  const studentsByFamily = useMemo(() => {
    const map = new Map();
    familyStudents.forEach((link) => {
      if (!link.family_id || !link.student_id) return;
      const existing = map.get(link.family_id) || [];
      existing.push(link.student_id);
      map.set(link.family_id, existing);
    });
    return map;
  }, [familyStudents]);

  const resetCreateForm = () => {
    setCreateForm(EMPTY_CREATE);
    setShowCreatePwd(false);
  };

  const validateUserForm = (form, { requirePassword = false } = {}) => {
    if (!form.email?.trim() && requirePassword) return 'El email es obligatorio.';
    if (!form.firstName?.trim()) return 'El nombre es obligatorio.';
    if (!form.lastName?.trim()) return 'El apellido es obligatorio.';
    if (!form.role || !CANONICAL_ROLES.includes(form.role)) return 'Debe seleccionar un rol válido.';
    if (requirePassword && (!form.password || form.password.length < 8)) return 'La contraseña temporal debe tener al menos 8 caracteres.';
    return null;
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    const validationError = validateUserForm(createForm, { requirePassword: true });
    if (validationError) {
      toast({ title: 'Validación', description: validationError, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: createForm.email.trim().toLowerCase(),
          password: createForm.password,
          first_name: createForm.firstName.trim(),
          last_name: createForm.lastName.trim(),
          role: createForm.role,
          hub_id: COORDINATOR_ROLES.includes(createForm.role) ? createForm.hubId || null : null,
          tutor_student_ids: TUTOR_ROLES.includes(createForm.role) ? uniqueIds(createForm.tutorStudentIds) : [],
          family_student_ids: FAMILY_ROLES.includes(createForm.role) ? uniqueIds(createForm.familyStudentIds) : [],
          email_confirm: createForm.emailConfirm,
        },
      });

      const functionErrorDetails = await getFunctionErrorDetails(data, error);
      if (functionErrorDetails) {
        console.error('[AdminUserManagement] admin-create-user failed:', { data, error, details: functionErrorDetails });
        throw new Error(functionErrorDetails);
      }

      toast({ title: 'Usuario creado', description: `${createForm.email} fue creado con perfil y asignaciones.` });
      setCreateOpen(false);
      resetCreateForm();
      await loadData();
    } catch (err) {
      const message = err.message || serializeErrorDetail(err) || 'No se pudo crear el usuario.';
      console.error('[AdminUserManagement] createUser:', err, { fullError: serializeErrorDetail(err) });
      toast({ title: 'Error al crear usuario', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (profile) => {
    setSelectedUser(profile);
    setEditForm({
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      role: CANONICAL_ROLES.includes(profile.role) ? profile.role : 'student',
      isActive: profile.is_active ?? true,
      hubId: profile.hub_id || '',
      tutorStudentIds: studentsByTutor.get(profile.id) || [],
      familyStudentIds: studentsByFamily.get(profile.id) || [],
    });
    setEditOpen(true);
  };

  const syncTutorStudents = async (profileId, selectedIds) => {
    const desiredIds = uniqueIds(selectedIds);
    const currentIds = studentsByTutor.get(profileId) || [];
    const idsToClear = currentIds.filter((id) => !desiredIds.includes(id));

    if (idsToClear.length > 0) {
      const { error } = await supabase
        .from('students')
        .update({ tutor_id: null })
        .in('id', idsToClear)
        .eq('tutor_id', profileId);
      if (error) throw error;
    }

    if (desiredIds.length > 0) {
      const { error } = await supabase
        .from('students')
        .update({ tutor_id: profileId })
        .in('id', desiredIds);
      if (error) throw error;
    }
  };

  const syncFamilyStudents = async (profile, selectedIds) => {
    const desiredIds = uniqueIds(selectedIds);

    const { error: deleteError } = await supabase
      .from('family_students')
      .delete()
      .eq('family_id', profile.id);
    if (deleteError) throw deleteError;

    let linksToInsert = [];
    if (desiredIds.length > 0) {
      linksToInsert = desiredIds.map((studentId) => ({
        family_id: profile.id,
        student_id: studentId,
      }));
      const { data, error: insertError } = await supabase
        .from('family_students')
        .insert(linksToInsert)
        .select('family_id, student_id');
      if (insertError) throw insertError;
      linksToInsert = data || linksToInsert;
    }

    try {
      const { error: clearParentError } = await supabase
        .from('students')
        .update({ parent_id: null })
        .eq('parent_id', profile.id);
      if (clearParentError) throw clearParentError;

      if (desiredIds.length > 0) {
        const { error: parentError } = await supabase
          .from('students')
          .update({ parent_id: profile.id })
          .in('id', desiredIds);
        if (parentError) throw parentError;
      }
    } catch (compatError) {
      console.error('[AdminUserManagement] students.parent_id compatibility update failed', compatError);
    }

    const { count, error: countError } = await supabase
      .from('family_students')
      .select('student_id', { count: 'exact', head: true })
      .eq('family_id', profile.id);
    if (countError) throw countError;

    await reloadFamilyStudents();
  };

  const handleEditProfile = async (event) => {
    event.preventDefault();
    if (!selectedUser) return;

    const validationError = validateUserForm({ ...editForm, email: selectedUser.email }, { requirePassword: false });
    if (validationError) {
      toast({ title: 'Validación', description: validationError, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const role = editForm.role;
      const profilePayload = {
        first_name: editForm.firstName.trim(),
        last_name: editForm.lastName.trim(),
        full_name: getFullName(editForm.firstName.trim(), editForm.lastName.trim()),
        role,
        is_active: editForm.isActive,
        hub_id: COORDINATOR_ROLES.includes(role) ? editForm.hubId || null : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', selectedUser.id);
      if (error) throw error;

      await syncTutorStudents(selectedUser.id, TUTOR_ROLES.includes(role) ? editForm.tutorStudentIds : []);
      if (FAMILY_ROLES.includes(role) || FAMILY_ROLES.includes(selectedUser.role)) {
        await syncFamilyStudents(selectedUser, FAMILY_ROLES.includes(role) ? editForm.familyStudentIds : []);
      }

      toast({ title: 'Usuario actualizado', description: `Perfil y asignaciones de ${selectedUser.email} actualizados.` });
      setEditOpen(false);
      setSelectedUser(null);
      await loadData();
    } catch (err) {
      console.error('[AdminUserManagement] editProfile:', err);
      toast({ title: 'Error al editar', description: err.message || 'No se pudo actualizar el usuario.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openReset = (profile) => {
    setSelectedUser(profile);
    setResetOpen(true);
  };

  const handleSendRecoveryEmail = async () => {
    if (!selectedUser?.email) return;
    setSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/auth/reset`;
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

  const renderAssignmentSummary = (profile) => {
    if (COORDINATOR_ROLES.includes(profile.role)) {
      const hub = hubs.find((item) => item.id === profile.hub_id);
      return hub?.name || 'Sin hub asignado';
    }
    if (TUTOR_ROLES.includes(profile.role)) {
      const count = (studentsByTutor.get(profile.id) || []).length;
      return `${count} estudiante${count === 1 ? '' : 's'}`;
    }
    if (FAMILY_ROLES.includes(profile.role)) {
      const count = familyStudents.filter((fs) => fs.family_id === profile.id).length;
      return `${count} hijo${count === 1 ? '' : 's'} vinculado${count === 1 ? '' : 's'}`;
    }
    return '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Gestión de Usuarios
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Flujo único: auth.users + public.profiles + asignaciones académicas oficiales.
          </p>
        </div>
        <button
          onClick={() => { resetCreateForm(); setCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm">
        <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-blue-900">Fuente oficial de accesos</p>
          <p className="text-blue-800 mt-0.5">
            El usuario se crea en <strong>auth.users</strong>; rol y estado viven en <strong>public.profiles</strong>.
            Coordinadores usan <strong>profiles.hub_id</strong>, tutores usan <strong>students.tutor_id</strong> y familias usan <strong>family_students</strong>.
          </p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre, email o rol..."
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        className="w-full pl-4 pr-4 py-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 text-slate-800 text-sm"
      />

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
                  <th className="p-4 font-bold">Asignación</th>
                  <th className="p-4 font-bold text-center">Estado</th>
                  <th className="p-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.map((profile) => (
                  <tr key={profile.id} className={`hover:bg-slate-50 ${profile.is_active === false ? 'opacity-50' : ''}`}>
                    <td className="p-4 font-bold text-slate-800">
                      {getFullName(profile.first_name, profile.last_name, profile.full_name || 'Sin nombre')}
                    </td>
                    <td className="p-4 text-slate-600 text-sm">
                      <div>{profile.email}</div>
                      {!profile.user_id && <div className="text-[10px] text-red-500 font-bold mt-0.5">user_id pendiente</div>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${ROLE_BADGE[profile.role] || 'bg-gray-100 text-gray-700'}`}>
                        {profile.role || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 text-xs font-semibold">{renderAssignmentSummary(profile)}</td>
                    <td className="p-4 text-center">
                      {profile.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">Inactivo</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openEdit(profile)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Editar usuario">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => openReset(profile)} className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors" title="Enviar enlace de recuperación">
                          <Mail className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400">No se encontraron usuarios.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createOpen && (
        <ModalShell title="Nuevo usuario SIS" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <NameFields form={createForm} setForm={setCreateForm} />
            <Field label="Correo electrónico *">
              <input required type="email" value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} className={INPUT_CLS} placeholder="usuario@chanakacademy.org" />
            </Field>
            <Field label="Contraseña temporal *">
              <div className="relative">
                <input required type={showCreatePwd ? 'text' : 'password'} minLength={8} value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} className={`${INPUT_CLS} pr-10`} placeholder="Mínimo 8 caracteres" />
                <button type="button" onClick={() => setShowCreatePwd(!showCreatePwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showCreatePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <RoleAndAssignments form={createForm} setForm={setCreateForm} hubs={hubs} students={students} />
            <label className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
              <input type="checkbox" checked={createForm.emailConfirm} onChange={(event) => setCreateForm({ ...createForm, emailConfirm: event.target.checked })} className="mt-0.5 accent-blue-600" />
              Confirmar email al crear el usuario. Si se desactiva, Supabase requerirá confirmación antes del acceso.
            </label>
            <ModalActions onCancel={() => setCreateOpen(false)} submitting={submitting} label="Crear usuario" />
          </form>
        </ModalShell>
      )}

      {editOpen && selectedUser && (
        <ModalShell title={`Editar usuario — ${selectedUser.email}`} onClose={() => setEditOpen(false)} wide>
          <form onSubmit={handleEditProfile} className="space-y-4">
            <NameFields form={editForm} setForm={setEditForm} />
            <Field label="Rol *">
              <RoleSelect value={editForm.role} onChange={(role) => setEditForm({ ...editForm, role })} />
            </Field>
            <RoleAndAssignments form={editForm} setForm={setEditForm} hubs={hubs} students={students} />
            <Field label="Estado">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700 select-none">
                <input type="checkbox" checked={editForm.isActive} onChange={(event) => setEditForm({ ...editForm, isActive: event.target.checked })} className="w-4 h-4 accent-blue-600" />
                Usuario activo
              </label>
            </Field>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 leading-relaxed">
              La edición solo modifica <strong>public.profiles</strong> y asignaciones académicas. Email y contraseña se gestionan por el flujo de recuperación existente.
            </div>
            <ModalActions onCancel={() => setEditOpen(false)} submitting={submitting} label="Guardar cambios" />
          </form>
        </ModalShell>
      )}

      {resetOpen && selectedUser && (
        <ModalShell title="Enviar enlace de recuperación" onClose={() => setResetOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Se enviará un enlace de recuperación de contraseña a <strong className="text-slate-800">{selectedUser.email}</strong>.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setResetOpen(false); setSelectedUser(null); }} className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
              <button type="button" onClick={handleSendRecoveryEmail} disabled={submitting} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
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

function NameFields({ form, setForm }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Nombre *">
        <input required type="text" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className={INPUT_CLS} placeholder="Nombre" />
      </Field>
      <Field label="Apellido *">
        <input required type="text" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className={INPUT_CLS} placeholder="Apellido" />
      </Field>
    </div>
  );
}

function RoleAndAssignments({ form, setForm, hubs, students }) {
  const isCoordinator = COORDINATOR_ROLES.includes(form.role);
  const isTutor = TUTOR_ROLES.includes(form.role);
  const isFamily = FAMILY_ROLES.includes(form.role);

  return (
    <div className="space-y-4">
      {'email' in form && (
        <Field label="Rol *">
          <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} />
        </Field>
      )}

      {isCoordinator && (
        <Field label="Hub asignado para coordinator">
          <select value={form.hubId || ''} onChange={(event) => setForm({ ...form, hubId: event.target.value })} className={INPUT_CLS}>
            <option value="">— Sin hub asignado —</option>
            {hubs.map((hub) => <option key={hub.id} value={hub.id}>{hub.name}</option>)}
          </select>
        </Field>
      )}

      {isTutor && (
        <StudentMultiSelect
          label="Estudiantes asignados para tutor/mentor"
          value={form.tutorStudentIds || []}
          onChange={(ids) => setForm({ ...form, tutorStudentIds: ids })}
          students={students}
        />
      )}

      {isFamily && (
        <StudentMultiSelect
          label="Hijos vinculados para parent/family"
          value={form.familyStudentIds || []}
          onChange={(ids) => setForm({ ...form, familyStudentIds: ids })}
          students={students}
        />
      )}
    </div>
  );
}

function StudentMultiSelect({ label, value, onChange, students }) {
  const selected = new Set(value || []);

  const toggle = (studentId) => {
    const next = new Set(selected);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    onChange([...next]);
  };

  return (
    <Field label={label}>
      <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
        {students.length === 0 ? (
          <p className="p-4 text-sm text-slate-400 text-center">No hay estudiantes disponibles.</p>
        ) : students.map((student) => (
          <label key={student.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer text-sm">
            <input type="checkbox" checked={selected.has(student.id)} onChange={() => toggle(student.id)} className="accent-blue-600" />
            <span className="flex-1">
              <span className="font-bold text-slate-700">{getStudentName(student)}</span>
              <span className="text-slate-400 ml-2">{student.us_grade_level || student.grade_level || 'Sin grado'}</span>
            </span>
          </label>
        ))}
      </div>
    </Field>
  );
}

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
    <select value={value} onChange={(event) => onChange(event.target.value)} className={INPUT_CLS}>
      {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
    </select>
  );
}

function ModalShell({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600" type="button">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({ onCancel, submitting, label }) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50">Cancelar</button>
      <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center">
        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : label}
      </button>
    </div>
  );
}
