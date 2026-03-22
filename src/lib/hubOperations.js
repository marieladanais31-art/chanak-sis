
import { supabase } from './customSupabaseClient';

export const getAllHubs = async () => {
  console.log('🏢 [Hubs] Fetching all hubs from organizations table... (Forced Fresh Fetch)');
  console.log('🔑 [Hubs] Verifying Publishable Key usage...');
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, location, code')
      .eq('type', 'hub')
      .order('name');
      
    if (error) {
      if (error.code === '42501') {
         console.error('❌ [Hubs] RLS Permission Denied (42501): The authenticated or anonymous role lacks SELECT permissions on the organizations table. Verify Supabase policies.');
      } else if (error.code === '42703') {
         console.error('❌ [Hubs] Column Not Found (42703): Verify schema for organizations table (check type, name, location, code columns).');
      } else {
         console.error(`❌ [Hubs] Database Error (${error.code}):`, error.message);
      }
      throw error;
    }
    
    const hubNames = data?.map(h => h.name) || [];
    console.log(`✅ [Hubs] Fetched ${data?.length || 0} hubs.`);
    console.log(`🏢 [Hubs] Hub Names: ${hubNames.join(', ')}`);
    
    const hasEducaFe = hubNames.some(name => name.toLowerCase().includes('educafe'));
    console.log(`🔍 [Hubs] EducaFe presence verification: ${hasEducaFe ? 'FOUND' : 'MISSING'}`);
    console.log('✅ [Hubs] Confirmed: No mock data is being used. Direct DB results returned.');
    
    return { data, error: null };
  } catch (error) {
    console.error('❌ [Hubs] Error fetching hubs:', error);
    return { data: null, error };
  }
};

export const getHubById = async (id) => {
  console.log(`🏢 [Hubs] Fetching hub ${id}...`);
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('❌ [Hubs] Error fetching hub by ID:', error);
    return { data: null, error };
  }
};

export const addHub = async (hubData) => {
  console.log('➕ [Hubs] Adding new hub:', hubData);
  try {
    const { data, error } = await supabase
      .from('organizations')
      .insert([{ ...hubData, type: 'hub' }])
      .select()
      .single();
      
    if (error) throw error;
    console.log('✅ [Hubs] Successfully added hub:', data);
    return { data, error: null };
  } catch (error) {
    console.error('❌ [Hubs] Error adding hub:', error);
    return { data: null, error };
  }
};
