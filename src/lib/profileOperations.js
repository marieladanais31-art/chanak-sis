
import { supabase } from '@/lib/customSupabaseClient';

export const getProfileById = async (id) => {
  console.log(`🔍 [profileOperations] Fetching profile for user ID: ${id}`);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn(`⚠️ [profileOperations] Profile not found (PGRST116 - 0 rows) for ID: ${id}. Returning null instead of crashing.`);
        return null;
      }
      console.error(`❌ [profileOperations] Supabase error fetching profile:`, error.message);
      throw error;
    }

    console.log(`✅ [profileOperations] Profile fetched successfully for ID: ${id}`);
    return data;
  } catch (err) {
    console.error('❌ [profileOperations] Exception in getProfileById:', err);
    return null;
  }
};

export const getProfileByIdWithFallback = async (user) => {
  if (!user || !user.id) {
    console.warn('⚠️ [profileOperations] No valid user object provided to fallback function.');
    return null;
  }

  console.log(`🔄 [profileOperations] Fetching profile with fallback for user ID: ${user.id}`);
  const profile = await getProfileById(user.id);

  if (profile) {
    return profile;
  }

  console.log(`🏗️ [profileOperations] Constructing fallback JSON profile structure for missing profile: ${user.id}`);
  return {
    id: user.id,
    email: user.email || '',
    first_name: user.user_metadata?.first_name || '',
    last_name: user.user_metadata?.last_name || '',
    role: user.user_metadata?.role || 'parent',
    created_at: user.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
};

export const profileExists = async (id) => {
  console.log(`❓ [profileOperations] Checking existence of profile ID: ${id}`);
  const profile = await getProfileById(id);
  const exists = !!profile;
  console.log(`ℹ️ [profileOperations] Profile ID ${id} exists: ${exists}`);
  return exists;
};
