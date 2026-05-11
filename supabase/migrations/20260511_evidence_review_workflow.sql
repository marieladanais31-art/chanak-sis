-- Flujo de revisión de evidencias para tutor/coordinador/admin.
-- Idempotente. No toca pagos, Stripe, DNS, SMTP, login ni reset.

-- Auditoría adicional solicitada para evidencias aprobadas y comentarios internos.
alter table public.academic_evidence_submissions
  add column if not exists internal_comment text,
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz;

-- Enlace de una evidencia aprobada con una nota oficial sobre 100.
alter table public.student_grade_entries
  add column if not exists evidence_submission_id uuid references public.academic_evidence_submissions(id) on delete set null,
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz;

create unique index if not exists idx_student_grade_entries_evidence_submission
  on public.student_grade_entries (evidence_submission_id)
  where evidence_submission_id is not null;

create index if not exists idx_academic_evidence_approved_by
  on public.academic_evidence_submissions (approved_by, approved_at);

-- Helper de perfil actual: usa profiles.user_id y profiles.id para soportar perfiles modernos/legacy.
create or replace function public.current_profile_id()
returns uuid
language sql security definer stable
as $$
  select p.id
  from public.profiles p
  where p.user_id = auth.uid() or p.id = auth.uid()
  order by case when p.user_id = auth.uid() then 0 else 1 end
  limit 1
$$;

create or replace function public.can_review_academic_evidence(p_student_id uuid)
returns boolean
language sql security definer stable
as $$
  select coalesce(public.get_current_user_role(), '') in ('admin', 'super_admin', 'director')
    or public.is_tutor_of(p_student_id)
    or exists (
      select 1
      from public.students s
      join public.profiles p on (p.user_id = auth.uid() or p.id = auth.uid())
      where s.id = p_student_id
        and p.role = 'coordinator'
        and p.hub_id is not null
        and s.hub_id = p.hub_id
    )
$$;

-- RLS: padres ven/crean sus envíos; revisores solo según alcance real.
drop policy if exists "rls_academic_evidence_admin_coordinator_all" on public.academic_evidence_submissions;
drop policy if exists "rls_academic_evidence_reviewer_select" on public.academic_evidence_submissions;
create policy "rls_academic_evidence_reviewer_select"
  on public.academic_evidence_submissions
  for select
  to authenticated
  using (public.can_review_academic_evidence(student_id));

drop policy if exists "rls_academic_evidence_reviewer_update" on public.academic_evidence_submissions;
create policy "rls_academic_evidence_reviewer_update"
  on public.academic_evidence_submissions
  for update
  to authenticated
  using (public.can_review_academic_evidence(student_id))
  with check (public.can_review_academic_evidence(student_id));

-- Adjuntos: revisores autorizados pueden abrir evidencias del estudiante en scope.
drop policy if exists "storage_academic_evidence_reviewer_select" on storage.objects;
create policy "storage_academic_evidence_reviewer_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'academic-evidence'
    and public.can_review_academic_evidence((storage.foldername(name))[1]::uuid)
  );

create or replace function public.review_academic_evidence(
  p_submission_id uuid,
  p_action text,
  p_internal_comment text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_role text;
  v_profile_id uuid;
  v_submission public.academic_evidence_submissions%rowtype;
  v_subject public.student_subjects%rowtype;
  v_assessment_name text;
begin
  v_role := public.get_current_user_role();
  v_profile_id := public.current_profile_id();

  if v_role not in ('admin', 'super_admin', 'director', 'coordinator', 'tutor', 'mentor') then
    raise exception 'Solo tutor, coordinador, admin o super_admin pueden revisar evidencias.';
  end if;

  if p_action not in ('approved', 'correction_requested', 'rejected') then
    raise exception 'Acción inválida. Use approved, correction_requested o rejected.';
  end if;

  select *
    into v_submission
    from public.academic_evidence_submissions
   where id = p_submission_id
   for update;

  if not found then
    raise exception 'Evidencia no encontrada.';
  end if;

  if not public.can_review_academic_evidence(v_submission.student_id) then
    raise exception 'Sin permisos para revisar evidencias de este estudiante.';
  end if;

  select *
    into v_subject
    from public.student_subjects
   where id = v_submission.student_subject_id
     and student_id = v_submission.student_id
     and school_year = v_submission.school_year
     and quarter = v_submission.quarter;

  if not found then
    raise exception 'Materia dinámica no encontrada para estudiante/año/quarter.';
  end if;

  if p_action = 'approved' and v_submission.evidence_type = 'PACE Test' and v_submission.score < 80 then
    raise exception 'PACE Test con score menor de 80 no puede aprobarse como completado.';
  end if;

  update public.academic_evidence_submissions
     set review_status = p_action,
         academic_outcome = case
           when p_action = 'approved' then 'approved'
           when p_action = 'correction_requested' and evidence_type = 'PACE Test' and score < 80 then 'requires_repeat'
           when p_action = 'correction_requested' then 'correction_required'
           else 'rejected'
         end,
         reviewer_comment = p_internal_comment,
         internal_comment = p_internal_comment,
         reviewed_by = v_profile_id,
         reviewed_at = now(),
         approved_by = case when p_action = 'approved' then v_profile_id else null end,
         approved_at = case when p_action = 'approved' then now() else null end
   where id = p_submission_id;

  if p_action = 'approved' then
    v_assessment_name := concat_ws(' · ', v_submission.evidence_type, nullif(v_submission.subject_name, ''));
    if v_submission.pace_number is not null then
      v_assessment_name := concat(v_assessment_name, ' · PACE ', v_submission.pace_number);
    end if;

    insert into public.student_grade_entries (
      evidence_submission_id,
      student_subject_id,
      student_id,
      quarter,
      school_year,
      assessment_name,
      score,
      date_recorded,
      submission_status,
      submitted_by,
      submitted_at,
      reviewed_by,
      reviewed_at,
      review_comment,
      entered_by,
      entered_by_role,
      approved_by,
      approved_at
    ) values (
      p_submission_id,
      v_submission.student_subject_id,
      v_submission.student_id,
      v_submission.quarter,
      v_submission.school_year,
      v_assessment_name,
      v_submission.score,
      current_date,
      'approved',
      v_submission.submitted_by,
      v_submission.created_at,
      auth.uid(),
      now(),
      p_internal_comment,
      auth.uid(),
      v_role,
      v_profile_id,
      now()
    )
    on conflict (evidence_submission_id) where evidence_submission_id is not null
    do update set
      score = excluded.score,
      assessment_name = excluded.assessment_name,
      submission_status = 'approved',
      reviewed_by = excluded.reviewed_by,
      reviewed_at = excluded.reviewed_at,
      review_comment = excluded.review_comment,
      entered_by = excluded.entered_by,
      entered_by_role = excluded.entered_by_role,
      approved_by = excluded.approved_by,
      approved_at = excluded.approved_at,
      updated_at = now();

    update public.student_subjects
       set grade_submission_status = 'approved',
           approval_status = case when v_submission.evidence_type = 'PACE Test' then 'completed' else 'approved' end,
           grade_reviewed_by = auth.uid(),
           grade_reviewed_at = now(),
           grade_review_comment = p_internal_comment,
           approved_by_user_id = auth.uid()
     where id = v_submission.student_subject_id;
  else
    update public.student_grade_entries
       set submission_status = case when p_action = 'correction_requested' then 'revision_requested' else 'rejected' end,
           reviewed_by = auth.uid(),
           reviewed_at = now(),
           review_comment = p_internal_comment,
           approved_by = null,
           approved_at = null
     where evidence_submission_id = p_submission_id;

    update public.student_subjects
       set grade_submission_status = case when p_action = 'correction_requested' then 'revision_requested' else 'rejected' end,
           approval_status = case when p_action = 'correction_requested' then 'correction_required' else 'rejected' end,
           grade_reviewed_by = auth.uid(),
           grade_reviewed_at = now(),
           grade_review_comment = p_internal_comment,
           approved_by_user_id = null
     where id = v_submission.student_subject_id
       and exists (
         select 1
         from public.student_grade_entries sge
         where sge.evidence_submission_id = p_submission_id
       );
  end if;
end;
$$;
