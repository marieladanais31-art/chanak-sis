import { supabase } from '@/lib/customSupabaseClient';
import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables for the temporary client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const userService = {
  /**
   * Creates a new user in Supabase Auth and a corresponding profile.
   * Uses a temporary Supabase client to avoid logging out the current admin.
   */
  createUser: async (email, name, role) => {
    try {
      // 1. Create a temporary client with no persistence to avoid replacing the current admin session
      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 2. Sign up the user
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email,
        password: 'ChangeMe123!', // Temporary password
        options: {
          data: {
            full_name: name,
            role: role
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('User creation failed - no user returned');

      const userId = authData.user.id;

      // 3. Upsert profile in public.profiles
      // Using the MAIN client (authenticated as admin) to ensure we have permission to write to profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          user_id: userId,
          email: email,
          full_name: name,
          first_name: name.split(' ')[0], // Best effort split
          last_name: name.split(' ').slice(1).join(' ') || '',
          role: role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        // Warning: User created in Auth but profile failed. 
        console.error('Profile creation error:', profileError);
        throw new Error(`Auth created, but profile failed: ${profileError.message}`);
      }

      return { success: true, user: authData.user };
    } catch (error) {
      console.error('createUser error:', error);
      return { success: false, error: error.message };
    }
  },

  getUsers: async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateUser: async (id, name, role) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: name,
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' ') || '',
          role: role,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteUser: async (id) => {
    try {
      // Delete from profiles
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Note: Deleting from auth.users usually requires Service Role key (backend only).
      // We can only delete the profile here unless we have an Edge Function.
      // For now, we return success if profile is deleted.
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};