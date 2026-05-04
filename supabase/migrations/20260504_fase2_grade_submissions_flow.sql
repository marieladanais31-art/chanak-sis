-- Fase 2: Flujo seguro de envío y revisión de notas
-- Agrega columnas de estado de envío y funciones RPC para el flujo draft → submitted → approved/rejected.

-- ─── Columnas de seguimiento en student_grade_entries ─────────────────────────

alter table public.student_grade_entries
  add column if not exists submission_status text not null default 'draft'
    check (submission_status in ('draft', 'submitted', 'approved', 'rejected')),
  add column if not exists submitted_by uuid references auth.users(id),
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_comment text;

-- ─── Columnas de seguimiento en student_subjects ──────────────────────────────

alter table public.student_subjects
  add column if not exists grade_submission_status text not null default 'draft'
    check (grade_submission_status in ('draft', 'submitted', 'approved', 'rejected')),
  add column if not exists grade_submitted_by uuid references auth.users(id),
  add column if not exists grade_submitted_at timestamptz,
  add column if not exists grade_reviewed_by uuid references auth.users(id),
  add column if not exists grade_reviewed_at timestamptz,
  add column if not exists grade_review_comment text;

-- ─── Índices ───────────────────────────────────────────────────────────────────

create index if not exists idx_student_subjects_grade_submission_status
  on public.student_subjects (grade_submission_status);

create index if not exists idx_student_grade_entries_submission_status
  on public.student_grade_entries (submission_status);

-- ─── RPC: submit_subject_grades ───────────────────────────────────────────────
-- Envía para revisión todas las entradas en borrador de una materia.
-- Puede ser llamado por padres, tutores, coordinadores y admins.

create or replace function public.submit_subject_grades(p_student_subject_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
  v_student_id uuid;
begin
  v_role := public.get_current_user_role();

  -- Verificar que el sujeto existe y obtener student_id
  select student_id into v_student_id
  from public.student_subjects
  where id = p_student_subject_id;

  if not found then
    raise exception 'Materia no encontrada.';
  end if;

  -- Verificar permisos: solo puede enviar quien tiene acceso al estudiante
  if v_role = 'parent' and not public.is_parent_of(v_student_id) then
    raise exception 'Sin permisos para enviar notas de este estudiante.';
  end if;

  if v_role = 'tutor' and not public.is_tutor_of(v_student_id) then
    raise exception 'Sin permisos para enviar notas de este estudiante.';
  end if;

  -- Marcar entradas draft como submitted
  update public.student_grade_entries
  set
    submission_status = 'submitted',
    submitted_by      = auth.uid(),
    submitted_at      = now()
  where student_subject_id = p_student_subject_id
    and submission_status  = 'draft';

  -- Actualizar estado en la materia
  update public.student_subjects
  set
    grade_submission_status = 'submitted',
    grade_submitted_by      = auth.uid(),
    grade_submitted_at      = now(),
    grade_review_comment    = null
  where id = p_student_subject_id;
end;
$$;

-- ─── RPC: review_subject_grades ───────────────────────────────────────────────
-- Aprueba o rechaza las notas enviadas de una materia.
-- Solo disponible para admin, director y coordinador.

create or replace function public.review_subject_grades(
  p_student_subject_id uuid,
  p_action             text,
  p_comment            text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
begin
  v_role := public.get_current_user_role();

  if v_role not in ('admin', 'super_admin', 'director', 'coordinator') then
    raise exception 'Solo administradores y coordinadores pueden revisar notas.';
  end if;

  if p_action not in ('approved', 'rejected') then
    raise exception 'Acción inválida. Use "approved" o "rejected".';
  end if;

  -- Actualizar entradas submitted
  update public.student_grade_entries
  set
    submission_status = p_action,
    reviewed_by       = auth.uid(),
    reviewed_at       = now(),
    review_comment    = p_comment
  where student_subject_id = p_student_subject_id
    and submission_status  = 'submitted';

  -- Actualizar la materia
  update public.student_subjects
  set
    grade_submission_status = p_action,
    grade_reviewed_by       = auth.uid(),
    grade_reviewed_at       = now(),
    grade_review_comment    = p_comment
  where id = p_student_subject_id;
end;
$$;

-- ─── RPC: reset_subject_grades_to_draft ───────────────────────────────────────
-- Regresa a borrador (tras un rechazo) para permitir correcciones.

create or replace function public.reset_subject_grades_to_draft(p_student_subject_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
begin
  v_role := public.get_current_user_role();

  if v_role not in ('admin', 'super_admin', 'director', 'coordinator') then
    raise exception 'Solo administradores y coordinadores pueden restablecer notas.';
  end if;

  update public.student_grade_entries
  set
    submission_status = 'draft',
    submitted_by      = null,
    submitted_at      = null,
    reviewed_by       = null,
    reviewed_at       = null,
    review_comment    = null
  where student_subject_id = p_student_subject_id;

  update public.student_subjects
  set
    grade_submission_status = 'draft',
    grade_submitted_by      = null,
    grade_submitted_at      = null,
    grade_reviewed_by       = null,
    grade_reviewed_at       = null,
    grade_review_comment    = null
  where id = p_student_subject_id;
end;
$$;
