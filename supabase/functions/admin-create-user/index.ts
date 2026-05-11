import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CANONICAL_ROLES = new Set([
  'super_admin',
  'admin',
  'coordinator',
  'tutor',
  'mentor',
  'parent',
  'family',
  'student',
]);
const ADMIN_ROLES = new Set(['super_admin', 'admin']);
const TUTOR_ROLES = new Set(['tutor', 'mentor']);
const FAMILY_ROLES = new Set(['parent', 'family']);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))] : [];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return jsonResponse({ error: 'Missing authorization token.' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerError } = await admin.auth.getUser(token);
  if (callerError || !callerData.user) return jsonResponse({ error: 'Invalid authorization token.' }, 401);

  const { data: callerProfile, error: callerProfileError } = await admin
    .from('profiles')
    .select('id, role')
    .or(`user_id.eq.${callerData.user.id},id.eq.${callerData.user.id}`)
    .limit(1)
    .maybeSingle();

  if (callerProfileError) return jsonResponse({ error: callerProfileError.message }, 500);
  if (!callerProfile || !ADMIN_ROLES.has(callerProfile.role)) {
    return jsonResponse({ error: 'Only admin and super_admin can create SIS users.' }, 403);
  }

  const payload = await req.json();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const firstName = String(payload.first_name || '').trim();
  const lastName = String(payload.last_name || '').trim();
  const role = String(payload.role || '').trim();
  const hubId = typeof payload.hub_id === 'string' && payload.hub_id ? payload.hub_id : null;
  const emailConfirm = payload.email_confirm !== false;
  const tutorStudentIds = asStringArray(payload.tutor_student_ids);
  const familyStudentIds = asStringArray(payload.family_student_ids);

  if (!email) return jsonResponse({ error: 'Email is required.' }, 400);
  if (!password || password.length < 8) return jsonResponse({ error: 'Temporary password must be at least 8 characters.' }, 400);
  if (!firstName) return jsonResponse({ error: 'First name is required.' }, 400);
  if (!lastName) return jsonResponse({ error: 'Last name is required.' }, 400);
  if (!CANONICAL_ROLES.has(role)) return jsonResponse({ error: 'Invalid role.' }, 400);

  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  const { data: authData, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: emailConfirm,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      role,
    },
  });

  if (createError || !authData.user) {
    return jsonResponse({ error: createError?.message || 'Auth user was not created.' }, 400);
  }

  const userId = authData.user.id;
  const profilePayload = {
    id: userId,
    user_id: userId,
    email,
    first_name: firstName,
    last_name: lastName,
    full_name: fullName,
    role,
    hub_id: role === 'coordinator' ? hubId : null,
    is_active: true,
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' });

  if (profileError) {
    return jsonResponse({ error: `Auth created, but profile upsert failed: ${profileError.message}` }, 500);
  }

  if (TUTOR_ROLES.has(role) && tutorStudentIds.length > 0) {
    const { error: tutorError } = await admin
      .from('students')
      .update({ tutor_id: userId })
      .in('id', tutorStudentIds);
    if (tutorError) return jsonResponse({ error: `User created, but tutor assignment failed: ${tutorError.message}` }, 500);
  }

  if (FAMILY_ROLES.has(role) && familyStudentIds.length > 0) {
    const familyRows = familyStudentIds.map((studentId) => ({ family_id: userId, student_id: studentId }));
    const { error: familyError } = await admin.from('family_students').insert(familyRows);
    if (familyError) return jsonResponse({ error: `User created, but family link failed: ${familyError.message}` }, 500);

    const { error: parentCompatError } = await admin
      .from('students')
      .update({ parent_id: userId })
      .in('id', familyStudentIds);
    if (parentCompatError) return jsonResponse({ error: `User created, but parent compatibility update failed: ${parentCompatError.message}` }, 500);
  }

  return jsonResponse({
    success: true,
    user: { id: userId, email },
    profile: profilePayload,
  });
});
