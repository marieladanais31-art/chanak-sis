
import { supabase } from './customSupabaseClient';

export const addStudent = async (studentData) => {
  console.log('➕ [Students] Adding new student:', studentData);
  try {
    const { data, error } = await supabase
      .from('students')
      .insert([studentData])
      .select()
      .single();
      
    if (error) throw error;
    console.log('✅ [Students] Successfully added student:', data);
    return { data, error: null };
  } catch (error) {
    console.error('❌ [Students] Error adding student:', error);
    return { data: null, error };
  }
};

export const editStudent = async (id, updateData) => {
  console.log(`✏️ [Students] Editing student ${id}:`, updateData);
  try {
    const { data, error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    console.log('✅ [Students] Successfully edited student:', data);
    return { data, error: null };
  } catch (error) {
    console.error('❌ [Students] Error editing student:', error);
    return { data: null, error };
  }
};

export const getAllStudents = async () => {
  console.log('📖 [Students] Fetching all students from database...');
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    console.log(`✅ [Students] Successfully fetched ${data?.length || 0} students.`);
    return { data, error: null };
  } catch (error) {
    console.error('❌ [Students] Error fetching students:', error);
    return { data: null, error };
  }
};

export const deleteStudent = async (id) => {
  console.log(`🗑️ [Students] Deleting student ${id}...`);
  try {
    const { data, error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)
      .select();
      
    if (error) throw error;
    console.log('✅ [Students] Successfully deleted student.');
    return { data, error: null };
  } catch (error) {
    console.error('❌ [Students] Error deleting student:', error);
    return { data: null, error };
  }
};
