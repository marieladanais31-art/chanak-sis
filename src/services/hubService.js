import { supabase } from '@/lib/customSupabaseClient';

export const hubService = {
  // --- Hubs CRUD ---

  getHubs: async () => {
    try {
      const { data, error } = await supabase
        .from('hubs')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('getHubs error:', error);
      return { success: false, error: error.message };
    }
  },

  createHub: async (name, code, address) => {
    try {
      const { data, error } = await supabase
        .from('hubs')
        .insert([{ name, code, address }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateHub: async (id, name, code, address) => {
    try {
      const { data, error } = await supabase
        .from('hubs')
        .update({ name, code, address })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteHub: async (id) => {
    try {
      const { error } = await supabase
        .from('hubs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // --- Student Guardians / Assignments ---

  getStudentGuardians: async (hubId) => {
    try {
      // We join profiles to get names for the UI
      const { data, error } = await supabase
        .from('student_guardians')
        .select(`
          *,
          student:student_id (id, full_name, email),
          parent:parent_id (id, full_name, email),
          tutor:tutor_id (id, full_name, email)
        `)
        .eq('hub_id', hubId);

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  createAssignment: async (hubId, studentId, parentId, tutorId) => {
    try {
      const { data, error } = await supabase
        .from('student_guardians')
        .insert([{
          hub_id: hubId,
          student_id: studentId,
          parent_id: parentId,
          tutor_id: tutorId
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  updateAssignment: async (id, parentId, tutorId) => {
    try {
      const { data, error } = await supabase
        .from('student_guardians')
        .update({
          parent_id: parentId,
          tutor_id: tutorId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteAssignment: async (id) => {
    try {
      const { error } = await supabase
        .from('student_guardians')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // --- Helpers ---

  getUsersByRole: async (role) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('role', role)
        .order('full_name');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};