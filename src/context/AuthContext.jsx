
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  COORDINATOR: 'coordinator',
  PARENT: 'parent',
  TUTOR: 'tutor',
  STUDENT: 'student'
};

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Indica que la sesión activa es una sesión de recuperación de contraseña.
  // En este estado NO se hace redirect automático basado en rol.
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchProfile = async (userId, userEmail) => {
    try {
      console.log(`🔍 AuthContext: Fetching profile for user ${userId}`);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, hub_id, created_at')
        .eq('id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.log(`⚠️ AuthContext: Profile not found. Auto-creating profile for ${userEmail}`);
          const defaultRole = userEmail === 'administration@chanakacademy.org' ? ROLES.SUPER_ADMIN : ROLES.STUDENT;
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: userId,
              email: userEmail,
              role: defaultRole,
              first_name: defaultRole === ROLES.SUPER_ADMIN ? 'Admin' : 'Nuevo',
              last_name: defaultRole === ROLES.SUPER_ADMIN ? 'Chanak' : 'Usuario'
            }])
            .select('id, email, first_name, last_name, role, hub_id, created_at')
            .single();
            
          if (insertError) throw insertError;
          console.log(`✅ AuthContext: Auto-created profile successfully. Role: ${newProfile?.role}`);
          return newProfile;
        }
        throw fetchError;
      }
      
      console.log(`✅ AuthContext: Profile fetched successfully. Role: ${data?.role}`);
      return data;
    } catch (err) {
      console.error('❌ AuthContext: Error fetching/creating profile:', err);
      return null;
    }
  };

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

      if (fetchedProfile) {
        setProfile(fetchedProfile);
        console.log(`✅ AuthContext initialized. User: ${currentUser.email}, Role: ${fetchedProfile.role}`);
      } else {
        console.warn('⚠️ AuthContext: No profile found or created for user.');
        setProfile(null);
      }
    } catch (err) {
      console.error('❌ AuthContext: Initialization error:', err);
      setError(err);
      setProfile(null);
    } finally {
      setIsInitialized(true);
      setLoading(false);
    }
  }, []);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log(`🔄 AuthContext: Auth state changed [${event}]`);
      if (!isMounted) return;
      
      setSession(newSession);

      if (event === 'PASSWORD_RECOVERY') {
        // Sesión temporal para restablecer contraseña.
        // Solo actualizamos el usuario; NO cargamos perfil ni redirigimos.
        console.log('🔑 AuthContext: PASSWORD_RECOVERY — esperando nueva contraseña.');
        setIsPasswordRecovery(true);
        setUser(newSession?.user || null);
        setProfile(null);
        setIsInitialized(true);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsPasswordRecovery(false);
        if (newSession?.user) {
          await initializeAuth(newSession);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        setUser(null);
        setProfile(null);
        setSession(null);
        setLoading(false);
        setIsInitialized(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  const login = async (email, password) => {
    console.log(`🔐 Attempting login for: ${email}`);
    setLoading(true);
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      
      if (result.error) {
        console.error(`❌ Login Error:`, result.error.message);
        setLoading(false);
        return { success: false, error: result.error.message };
      }
      
      if (result.data?.user) {
        console.log(`✅ Auth successful, fetching profile...`);
        const prof = await fetchProfile(result.data.user.id, result.data.user.email);
          
        if (prof) {
          setUser(result.data.user);
          setProfile(prof);
          setSession(result.data.session);
          setLoading(false);
          return { success: true, user: result.data.user, profile: prof };
        } else {
          console.error('❌ Failed to load profile during login.');
          setLoading(false);
          return { success: false, error: 'Failed to load user profile' };
        }
      }
      
      setLoading(false);
      return { success: false, error: 'Unknown login error' };
    } catch (error) {
      console.error('❌ Unexpected error during login:', error);
      setLoading(false);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      session, user, profile,
      isInitialized, loading, error,
      isPasswordRecovery,
      login, logout,
      ROLES
    }}>
      {children}
    </AuthContext.Provider>
  );
};
