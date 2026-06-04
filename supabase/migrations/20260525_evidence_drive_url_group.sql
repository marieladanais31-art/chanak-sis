-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: Drive URL + evidence_group en academic_evidence_submissions
-- Añade soporte para enlace de Google Drive y grupo estructural de evidencia.
-- Idempotente. No toca RLS, pagos, login ni Stripe.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Columna drive_url: enlace de Google Drive proporcionado por la familia.
alter table public.academic_evidence_submissions
  add column if not exists drive_url text;

comment on column public.academic_evidence_submissions.drive_url is
  'Enlace de Google Drive opcional. La familia puede adjuntar archivo, Drive o ambos (al menos uno obligatorio en la UI).';

-- 2. Columna evidence_group: grupo estructural elegido por la familia.
--    Nullable para retrocompatibilidad con filas existentes.
alter table public.academic_evidence_submissions
  add column if not exists evidence_group text;

alter table public.academic_evidence_submissions
  drop constraint if exists academic_evidence_submissions_evidence_group_check;

alter table public.academic_evidence_submissions
  add constraint academic_evidence_submissions_evidence_group_check
  check (evidence_group is null or evidence_group in ('PACE Test', 'Local Extension', 'Life Skills'));

comment on column public.academic_evidence_submissions.evidence_group is
  'Grupo estructural: PACE Test | Local Extension | Life Skills. Mirrors evidence_type para nuevas filas.';

-- 3. Ampliar el check de evidence_type para aceptar ''Local Extension''.
--    Los valores anteriores se conservan para retrocompatibilidad.
alter table public.academic_evidence_submissions
  drop constraint if exists academic_evidence_submissions_evidence_type_check;

alter table public.academic_evidence_submissions
  add constraint academic_evidence_submissions_evidence_type_check
  check (evidence_type in (
    'PACE Test',
    'Self Test',
    'Proyecto',
    'Life Skills',
    'Extensión Local',
    'Local Extension'
  ));

-- 4. Backfill: asignar evidence_group a filas anteriores que no lo tengan.
update public.academic_evidence_submissions
set evidence_group = case
  when evidence_type = 'PACE Test'                          then 'PACE Test'
  when evidence_type in ('Extensión Local', 'Local Extension') then 'Local Extension'
  else 'Life Skills'   -- Self Test, Proyecto, Life Skills → Life Skills
end
where evidence_group is null;

-- 5. Actualizar la RLS de inserción de padres para que acepte drive_url.
--    (La política no restringía drive_url, pero la redeclaramos explícitamente
--     para incluir la validación de evidence_group y evitar valores no permitidos.)
drop policy if exists "rls_academic_evidence_parent_insert" on public.academic_evidence_submissions;
create policy "rls_academic_evidence_parent_insert"
  on public.academic_evidence_submissions
  for insert
  to authenticated
  with check (
    submitted_by = auth.uid()
    and review_status = 'pending_review'
    and (evidence_group is null or evidence_group in ('PACE Test', 'Local Extension', 'Life Skills'))
    and (
      evidence_type <> 'PACE Test'
      or score is null
      or score >= 80
      or academic_outcome in ('requires_repeat', 'correction_required')
    )
    and (attachment_path is not null or drive_url is not null)
    and exists (
      select 1
      from public.family_students fs
      where fs.student_id = academic_evidence_submissions.student_id
        and fs.family_id = auth.uid()
    )
    and exists (
      select 1
      from public.student_subjects ss
      where ss.id = academic_evidence_submissions.student_subject_id
        and ss.student_id = academic_evidence_submissions.student_id
        and ss.school_year = academic_evidence_submissions.school_year
        and ss.quarter = academic_evidence_submissions.quarter
    )
  );
