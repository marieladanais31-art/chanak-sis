
import { supabase } from './customSupabaseClient';

export const linkStudentToGuardian = async (studentId, guardianId, relationship = 'Parent') => {
  console.log(`🔗 [Family] Linking student ${studentId} to guardian ${guardianId}...`);
  try {
    const { data, error } = await supabase
      .from('student_guardians')
      .insert([{ 
        student_id: studentId, 
        guardian_id: guardianId,
        parent_id: guardianId, // mapping to older fields if required
        relationship 
      }])
      .select();
      
    if (error) throw error;
    console.log('✅ [Family] Successfully linked student to guardian:', data);
    return { data, error: null };
  } catch (error) {
    console.error('❌ [Family] Error linking student:', error);
    return { data: null, error };
  }
};

export const getGuardianStudents = async (guardianId) => {
  console.log(`📖 [Family] Fetching students for guardian ${guardianId}...`);
  try {
    const { data: linkData, error: linkError } = await supabase
      .from('student_guardians')
      .select('student_id')
      .eq('guardian_id', guardianId);
      
    if (linkError) throw linkError;
    
    if (!linkData || linkData.length === 0) {
      return { data: [], error: null };
    }
    
    const studentIds = linkData.map(l => l.student_id);
    
    const { data: students, error: stdError } = await supabase
      .from('students')
      .select('*')
      .in('id', studentIds);
      
    if (stdError) throw stdError;
    
    console.log(`✅ [Family] Found ${students?.length || 0} students for guardian.`);
    return { data: students, error: null };
  } catch (error) {
    console.error('❌ [Family] Error fetching guardian students:', error);
    return { data: null, error };
  }
};

export const unlinkStudentFromGuardian = async (studentId, guardianId) => {
  console.log(`✂️ [Family] Unlinking student ${studentId} from guardian ${guardianId}...`);
  try {
    const { data, error } = await supabase
      .from('student_guardians')
      .delete()
      .match({ student_id: studentId, guardian_id: guardianId })
      .select();
      
    if (error) throw error;
    console.log('✅ [Family] Successfully unlinked student.');
    return { data, error: null };
  } catch (error) {
    console.error('❌ [Family] Error unlinking student:', error);
    return { data: null, error };
  }
};
