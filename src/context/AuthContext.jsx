
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN:       'admin',
  COORDINATOR: 'coordinator',
  PARENT:      'parent',
  TUTOR:       'tutor',
  STUDENT:     'student'
};

// Columnas que se seleccionan del perfil — incluye user_id, full_name, status, family_id
const PROFILE_FIELDS =
  'id, user_id, email, first_name, last_name, full_name, role, status, is_active, hub_id, family_id';

/**
 * Determina si un perfil está activo.
 * Reglas:
 *  - is_active === false  → inactivo (prioridad máxima)
 *  - status existe y NO es 'active'/'Active'/'ACTIVE' → inactivo
 *  - cualquier otro caso → activo
 */
function isProfileActive(profile) {
  if (profile.is_active === false) return false;
  if (
    profile.status != null &&
    !['active', 'Active', 'ACTIVE'].includes(profile.status)
  ) return false;
  return true;
}

/**
 * Normaliza el nombre a mostrar usando full_name → first+last → email.
 * No usa la columna display_name (no existe en el schema).
 */
function resolveDisplayName(profile) {
  if (profile.full_name) return profile.full_name;
  const parts = [profile.first_name, profile.last_name].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return profile.email || '';
}

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [session,            setSession]            = useState(null);
  const [user,               setUser]               = useState(null);
  const [profile,            setProfile]            = useState(null);
  const [isInitialized,      setIsInitialized]      = useState(false);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState(null);
  const [blockedReason,      setBlockedReason]      = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // ─── fetchProfile ────────────────────────────────────────────────────────────
  // Búsqueda robusta en 3 pasos para soportar perfiles legacy donde
  // profiles.id ≠ auth.uid() y el enlace está en profiles.user_id (puede ser null).
  //
  // 1. user_id = auth.uid()          → perfiles nuevos / actualizados
  // 2. id      = auth.uid()          → perfiles legacy (id = auth.uid())
  // 3. email   = auth.user.email     → perfiles sin user_id; auto-parchea user_id
  //
  // Si el perfil está inactivo, setBlockedReason y retorna null.
  const fetchProfile = useCallback(async (userId, userEmail) => {
    setBlockedReason(null);
    try {
      let data = null;

      // ── Paso 1: user_id = auth.uid() ─────────────────────────────────────
      {
        const { data: d } = await supabase
          .from('profiles')
          .select(PROFILE_FIELDS)
          .eq('user_id', userId)
          .maybeSingle();
        if (d) {
          data = d;
          console.log('✅ AuthContext: Perfil encontrado por user_id');
        }
      }

      // ── Paso 2: id = auth.uid() ──────────────────────────────────────────
      if (!data) {
        const { data: d } = await supabase
          .from('profiles')
          .select(PROFILE_FIELDS)
          .eq('id', userId)
          .maybeSingle();
        if (d) {
          data = d;
          console.log('✅ AuthContext: Perfil encontrado por id');
        }
      }

      // ── Paso 3: email match ──────────────────────────────────────────────
      if (!data && userEmail) {
        const { data: d } = await supabase
          .from('profiles')
          .select(PROFILE_FIELDS)
          .eq('email', userEmail)
          .maybeSingle();
        if (d) {
          data = d;
          console.log('✅ AuthContext: Perfil encontrado por email');
          // Auto-parchar user_id si estaba vacío
          if (!data.user_id) {
            console.log('🔧 AuthContext: Parcheando user_id en perfil legacy');
            const { error: patchErr } = await supabase
              .from('profiles')
              .update({ user_id: userId })
              .eq('id', data.id);
            if (!patchErr) {
              data = { ...data, user_id: userId };
              console.log('🔧 AuthContext: user_id actualizado correctamente');
            } else {
              console.warn('⚠️ AuthContext: No se pudo parchear user_id (puede ser RLS):', patchErr.message);
            }
          }
        }
      }

      // ── Auto-create si no existe en ningún paso ──────────────────────────
      if (!data) {
        console.log(`⚠️ AuthContext: Sin perfil para ${userEmail}. Auto-creando...`);
        const defaultRole =
          userEmail === 'administration@chanakacademy.org'
            ? ROLES.SUPER_ADMIN
            : ROLES.STUDENT;
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{
            user_id:    userId,
            email:      userEmail,
            role:       defaultRole,
            first_name: defaultRole === ROLES.SUPER_ADMIN ? 'Admin' : 'Nuevo',
            last_name:  defaultRole === ROLES.SUPER_ADMIN ? 'Chanak' : 'Usuario',
            is_active:  true,
            status:     'active',
          }])
          .select(PROFILE_FIELDS)
          .single();
        if (insertError) throw insertError;
        console.log(`✅ AuthContext: Perfil auto-creado. Rol: ${newProfile?.role}`);
        return newProfile;
      }

      // ── Verificar estado activo ──────────────────────────────────────────
      if (!isProfileActive(data)) {
        console.warn(
          `🚫 AuthContext: Perfil inactivo. is_active=${data.is_active}, status=${data.status}`
        );
        setBlockedReason(
          'Tu cuenta está desactivada. Contacta al administrador de Chanak Academy.'
        );
        return null;
      }

      const displayName = resolveDisplayName(data);
      console.log(
        `✅ AuthContext: Perfil listo. Rol: ${data.role} | Nombre: ${displayName}`
      );
      return data;

    } catch (err) {
      console.error('❌ AuthContext: Error en fetchProfile:', err);
      return null;
    }
  }, []);

  // ─── initializeAuth ──────────────────────────────────────────────────────────
  const initializeAuth = useCallback(async (currentSession) => {
    setLoading(true);
    setError(null);
    try {
      if (!currentSession?.user) {
        setUser(null);
        setProfile(null);
        setIsInitialized(true);
        setLoading(false);
        return;
      }
      const currentUser = currentSession.user;
      setUser(currentUser);
      const fetchedProfile = await fetchProfile(currentUser.id, currentUser.email);
      setProfile(fetchedProfile ?? null);
      if (fetchedProfile) {
        console.log(`✅ AuthContext inicializado. Email: ${currentUser.email} | Rol: ${fetchedProfile.role}`);
      } else {
        console.warn('⚠️ AuthContext: Sin perfil tras inicialización.');
      }
    } catch (err) {
      console.error('❌ AuthContext: Error de inicialización:', err);
      setError(err);
      setProfile(null);
    } finally {
      setIsInitialized(true);
      setLoading(false);
    }
  }, [fetchProfile]);

  // ─── Setup auth listener ─────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const setupAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(initialSession);
        await initializeAuth(initialSession);
      }
    };
    setupAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log(`🔄 AuthContext: Auth event [${event}]`);
        if (!isMounted) return;
        setSession(newSession);

        if (event === 'PASSWORD_RECOVERY') {
          console.log('🔑 AuthContext: PASSWORD_RECOVERY — esperando nueva contraseña.');
          setIsPasswordRecovery(true);
          setUser(newSession?.user || null);
          setProfile(null);
          setIsInitialized(true);
          setLoading(false);
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setIsPasswordRecovery(false);
          if (newSession?.user) await initializeAuth(newSession);
        } else if (event === 'SIGNED_OUT') {
          setIsPasswordRecovery(false);
          setUser(null);
          setProfile(null);
          setSession(null);
          setBlockedReason(null);
          setLoading(false);
          setIsInitialized(true);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  // ─── login ───────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    console.log(`🔐 Login: ${email}`);
    setLoading(true);
    setBlockedReason(null);
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        console.error(`❌ Login error:`, result.error.message);
        setLoading(false);
        return { success: false, error: result.error.message };
      }
      if (result.data?.user) {
        const prof = await fetchProfile(result.data.user.id, result.data.user.email);
        // blockedReason ya fue seteado en fetchProfile si el perfil está inactivo
        if (!prof) {
          setLoading(false);
          // Si hay blockedReason, el login page lo mostrará desde el contexto
          return {
            success: false,
            error: 'No se pudo cargar el perfil de usuario.',
          };
        }
        setUser(result.data.user);
        setProfile(prof);
        setSession(result.data.session);
        setLoading(false);
        return { success: true, user: result.data.user, profile: prof };
      }
      setLoading(false);
      return { success: false, error: 'Error desconocido durante el inicio de sesión.' };
    } catch (err) {
      console.error('❌ Login inesperado:', err);
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  // ─── logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setBlockedReason(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile,
      isInitialized, loading, error,
      isPasswordRecovery,
      blockedReason,
      login, logout,
      ROLES,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
