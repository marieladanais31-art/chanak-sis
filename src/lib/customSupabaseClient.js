import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gepsbesbhsxfyxymemim.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcHNiZXNiaHN4Znl4eW1lbWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjg1MjgsImV4cCI6MjA4Mzc0NDUyOH0.VQ6q4ex-tWp2Nr2YK-Sd7PPGCZgcQvQUmTGNNjZtp5Q';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
