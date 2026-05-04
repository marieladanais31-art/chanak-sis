-- Fase 1: RLS y seguridad por roles
-- Habilita Row Level Security en tablas críticas y define políticas por rol.

-- ─── Funciones helper ──────────────────────────────────────────────────────────

create or replace function public.get_current_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_parent_of(p_student_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.family_students
    where family_id = auth.uid() and student_id = p_student_id
  )
$$;

create or replace function public.is_tutor_of(p_student_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.students
    where id = p_student_id and tutor_id = auth.uid()
  )
$$;

create or replace function public.is_admin_or_director()
returns boolean
language sql
security definer
stable
as $$
  select public.get_current_user_role() in ('admin', 'super_admin', 'director')
$$;

-- ─── RLS: student_grade_entries ────────────────────────────────────────────────

alter table public.student_grade_entries enable row level security;

drop policy if exists "rls_grade_entries_admin_all" on public.student_grade_entries;
drop policy if exists "rls_grade_entries_coordinator_select" on public.student_grade_entries;
drop policy if exists "rls_grade_entries_coordinator_update" on public.student_grade_entries;
drop policy if exists "rls_grade_entries_parent_select" on public.student_grade_entries;
drop policy if exists "rls_grade_entries_tutor_all" on public.student_grade_entries;

-- Admin / director: acceso total
create policy "rls_grade_entries_admin_all"
  on public.student_grade_entries
  as permissive
  for all
  to authenticated
  using (public.is_admin_or_director())
  with check (public.is_admin_or_director());

-- Coordinador: lectura total + actualización (flujo de revisión)
create policy "rls_grade_entries_coordinator_select"
  on public.student_grade_entries
  as permissive
  for select
  to authenticated
  using (public.get_current_user_role() = 'coordinator');

create policy "rls_grade_entries_coordinator_update"
  on public.student_grade_entries
  as permissive
  for update
  to authenticated
  using (public.get_current_user_role() = 'coordinator')
  with check (public.get_current_user_role() = 'coordinator');

-- Padre: solo lectura de sus propios hijos
create policy "rls_grade_entries_parent_select"
  on public.student_grade_entries
  as permissive
  for select
  to authenticated
  using (
    public.get_current_user_role() = 'parent'
    and public.is_parent_of(student_id)
  );

-- Tutor: CRUD solo para sus estudiantes asignados
create policy "rls_grade_entries_tutor_all"
  on public.student_grade_entries
  as permissive
  for all
  to authenticated
  using (
    public.get_current_user_role() = 'tutor'
    and public.is_tutor_of(student_id)
  )
  with check (
    public.get_current_user_role() = 'tutor'
    and public.is_tutor_of(student_id)
  );

-- ─── RLS: student_subjects ─────────────────────────────────────────────────────

alter table public.student_subjects enable row level security;

drop policy if exists "rls_student_subjects_admin_all" on public.student_subjects;
drop policy if exists "rls_student_subjects_coordinator_select" on public.student_subjects;
drop policy if exists "rls_student_subjects_coordinator_update" on public.student_subjects;
drop policy if exists "rls_student_subjects_parent_select" on public.student_subjects;
drop policy if exists "rls_student_subjects_tutor_select" on public.student_subjects;
drop policy if exists "rls_student_subjects_tutor_update" on public.student_subjects;

create policy "rls_student_subjects_admin_all"
  on public.student_subjects
  as permissive
  for all
  to authenticated
  using (public.is_admin_or_director())
  with check (public.is_admin_or_director());

create policy "rls_student_subjects_coordinator_select"
  on public.student_subjects
  as permissive
  for select
  to authenticated
  using (public.get_current_user_role() = 'coordinator');

create policy "rls_student_subjects_coordinator_update"
  on public.student_subjects
  as permissive
  for update
  to authenticated
  using (public.get_current_user_role() = 'coordinator')
  with check (public.get_current_user_role() = 'coordinator');

create policy "rls_student_subjects_parent_select"
  on public.student_subjects
  as permissive
  for select
  to authenticated
  using (
    public.get_current_user_role() = 'parent'
    and public.is_parent_of(student_id)
  );

create policy "rls_student_subjects_tutor_select"
  on public.student_subjects
  as permissive
  for select
  to authenticated
  using (
    public.get_current_user_role() = 'tutor'
    and public.is_tutor_of(student_id)
  );

create policy "rls_student_subjects_tutor_update"
  on public.student_subjects
  as permissive
  for update
  to authenticated
  using (
    public.get_current_user_role() = 'tutor'
    and public.is_tutor_of(student_id)
  )
  with check (
    public.get_current_user_role() = 'tutor'
    and public.is_tutor_of(student_id)
  );

-- ─── RLS: students ─────────────────────────────────────────────────────────────

alter table public.students enable row level security;

drop policy if exists "rls_students_admin_all" on public.students;
drop policy if exists "rls_students_coordinator_select" on public.students;
drop policy if exists "rls_students_parent_select" on public.students;
drop policy if exists "rls_students_tutor_select" on public.students;

create policy "rls_students_admin_all"
  on public.students
  as permissive
  for all
  to authenticated
  using (public.is_admin_or_director())
  with check (public.is_admin_or_director());

create policy "rls_students_coordinator_select"
  on public.students
  as permissive
  for select
  to authenticated
  using (public.get_current_user_role() = 'coordinator');

create policy "rls_students_parent_select"
  on public.students
  as permissive
  for select
  to authenticated
  using (
    public.get_current_user_role() = 'parent'
    and public.is_parent_of(id)
  );

create policy "rls_students_tutor_select"
  on public.students
  as permissive
  for select
  to authenticated
  using (
    public.get_current_user_role() = 'tutor'
    and tutor_id = auth.uid()
  );

-- ─── RLS: family_students ──────────────────────────────────────────────────────

alter table public.family_students enable row level security;

drop policy if exists "rls_family_students_admin_all" on public.family_students;
drop policy if exists "rls_family_students_parent_select" on public.family_students;
drop policy if exists "rls_family_students_coordinator_select" on public.family_students;

create policy "rls_family_students_admin_all"
  on public.family_students
  as permissive
  for all
  to authenticated
  using (public.is_admin_or_director())
  with check (public.is_admin_or_director());

create policy "rls_family_students_parent_select"
  on public.family_students
  as permissive
  for select
  to authenticated
  using (
    public.get_current_user_role() = 'parent'
    and family_id = auth.uid()
  );

create policy "rls_family_students_coordinator_select"
  on public.family_students
  as permissive
  for select
  to authenticated
  using (public.get_current_user_role() = 'coordinator');
