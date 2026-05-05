-- Fase 3: RLS en profiles, columna is_active, columna students.tutor_id
-- Aplica de forma segura (IF NOT EXISTS / IF NOT EXISTS policies).

-- ─── 1. Columna is_active en profiles ────────────────────────────────────────

alter table public.profiles
  add column if not exists is_active boolean not null default true;

create index if not exists idx_profiles_role      on public.profiles (role);
create index if not exists idx_profiles_is_active on public.profiles (is_active);

-- ─── 2. Columna tutor_id en students ─────────────────────────────────────────
-- Si la columna ya existe no hace nada. Si falta, la agrega con FK opcional.

alter table public.students
  add column if not exists tutor_id uuid references auth.users(id) on delete set null;

create index if not exists idx_students_tutor_id on public.students (tutor_id);

-- ─── 3. RLS en la tabla profiles ─────────────────────────────────────────────

alter table public.profiles enable row level security;

-- Limpiar políticas previas para evitar conflictos
drop policy if exists "rls_profiles_select_own"        on public.profiles;
drop policy if exists "rls_profiles_select_admin"      on public.profiles;
drop policy if exists "rls_profiles_select_coordinator" on public.profiles;
drop policy if exists "rls_profiles_update_own"        on public.profiles;
drop policy if exists "rls_profiles_update_admin"      on public.profiles;
drop policy if exists "rls_profiles_insert_admin"      on public.profiles;

-- Cada usuario autenticado puede leer su propio perfil
create policy "rls_profiles_select_own"
  on public.profiles
  as permissive
  for select
  to authenticated
  using (id = auth.uid());

-- Admin / director: lectura de todos los perfiles
create policy "rls_profiles_select_admin"
  on public.profiles
  as permissive
  for select
  to authenticated
  using (public.is_admin_or_director());

-- Coordinador: lectura de todos salvo super_admin
create policy "rls_profiles_select_coordinator"
  on public.profiles
  as permissive
  for select
  to authenticated
  using (
    public.get_current_user_role() = 'coordinator'
    and role <> 'super_admin'
  );

-- Cada usuario puede actualizar sus propios datos básicos (nombre, etc.)
-- No puede cambiar su propio rol ni is_active
create policy "rls_profiles_update_own"
  on public.profiles
  as permissive
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- El usuario no puede escalarse a admin ni desactivarse a sí mismo
    and role = (select role from public.profiles where id = auth.uid())
    and is_active = true
  );

-- Admin / director: puede actualizar cualquier perfil (incluyendo rol e is_active)
create policy "rls_profiles_update_admin"
  on public.profiles
  as permissive
  for update
  to authenticated
  using (public.is_admin_or_director())
  with check (public.is_admin_or_director());

-- Admin / director: puede insertar perfiles (creación de usuarios)
create policy "rls_profiles_insert_admin"
  on public.profiles
  as permissive
  for insert
  to authenticated
  with check (public.is_admin_or_director());

-- ─── 4. Vista segura de perfiles para el panel admin ─────────────────────────
-- Solo devuelve columnas seguras; excluye datos sensibles internos.

create or replace view public.profiles_admin_view as
  select
    id,
    email,
    first_name,
    last_name,
    role,
    hub_id,
    is_active,
    created_at
  from public.profiles;

-- La vista hereda las políticas de la tabla base.
-- El admin puede leerla porque tiene la policy "rls_profiles_select_admin".
