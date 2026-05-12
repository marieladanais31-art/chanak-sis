-- Cierre del flujo académico Tutor/Coordinador.
-- Idempotente. No toca login, reset password, pagos, Stripe, DNS ni SMTP.

-- Alertas académicas: tutor/coordinador/admin pueden crear alertas solo dentro de su alcance real.
drop policy if exists rls_alerts_select_admin on public.academic_alerts;
drop policy if exists rls_alerts_select_role on public.academic_alerts;
drop policy if exists rls_alerts_insert_staff on public.academic_alerts;
drop policy if exists rls_alerts_update_staff on public.academic_alerts;

create policy rls_alerts_select_admin
  on public.academic_alerts
  for select
  to authenticated
  using (public.is_admin_or_director());

create policy rls_alerts_select_role
  on public.academic_alerts
  for select
  to authenticated
  using (
    target_user_id = auth.uid()
    or (target_role = 'tutor' and public.is_tutor_of(student_id) and public.get_current_user_role() in ('tutor','mentor'))
    or (target_role = 'coordinator' and public.is_coordinator_for(student_id) and public.get_current_user_role() = 'coordinator')
    or (target_role = 'parent' and public.is_parent_of(student_id) and public.get_current_user_role() in ('parent','family'))
    or (target_role = 'admin' and public.is_admin_or_director())
  );

create policy rls_alerts_insert_staff
  on public.academic_alerts
  for insert
  to authenticated
  with check (
    public.is_admin_or_director()
    or public.is_tutor_of(student_id)
    or public.is_coordinator_for(student_id)
  );

create policy rls_alerts_update_staff
  on public.academic_alerts
  for update
  to authenticated
  using (
    public.is_admin_or_director()
    or target_user_id = auth.uid()
    or public.is_tutor_of(student_id)
    or public.is_coordinator_for(student_id)
  )
  with check (
    public.is_admin_or_director()
    or target_user_id = auth.uid()
    or public.is_tutor_of(student_id)
    or public.is_coordinator_for(student_id)
  );

-- Evidencia aprobada: genera/actualiza nota oficial aprobada sobre 100.
-- ACE/PACE solo se marca como dominio alcanzado si score >= 80.
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
  v_is_ace boolean;
  v_mastered boolean;
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

  if p_action = 'approved' and v_submission.score is null then
    raise exception 'La evidencia aprobada requiere score sobre 100 para generar nota oficial.';
  end if;

  v_is_ace := lower(coalesce(v_subject.academic_block, '')) like '%ace%'
           or lower(coalesce(v_subject.academic_block, '')) like '%core%'
           or lower(coalesce(v_subject.pillar_type, '')) like '%ace%'
           or lower(coalesce(v_subject.pillar_type, '')) like '%core%'
           or v_submission.evidence_type = 'PACE Test';
  v_mastered := coalesce(v_submission.score, 0) >= 80;

  if p_action = 'approved' and v_submission.evidence_type = 'PACE Test' and not v_mastered then
    raise exception 'PACE Test con score menor de 80 debe quedar como corrección/repetición, no como dominio completado.';
  end if;

  update public.academic_evidence_submissions
     set review_status = p_action,
         academic_outcome = case
           when p_action = 'approved' then 'approved'
           when p_action = 'correction_requested' and v_is_ace and not v_mastered then 'requires_repeat'
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
      least(greatest(v_submission.score, 0), 100),
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
           approval_status = case when v_is_ace and v_mastered then 'completed' else 'approved' end,
           grade_reviewed_by = auth.uid(),
           grade_reviewed_at = now(),
           grade_review_comment = p_internal_comment,
           approved_by_user_id = auth.uid()
     where id = v_submission.student_subject_id;

    if v_is_ace and v_mastered and v_submission.pace_number is not null then
      update public.pei_pace_projections
         set status = 'evaluated',
             grade_obtained = least(greatest(v_submission.score, 0), 100),
             actual_delivery_date = coalesce(actual_delivery_date, current_date),
             updated_at = now()
       where student_id = v_submission.student_id
         and school_year = v_submission.school_year
         and quarter = v_submission.quarter
         and student_subject_id = v_submission.student_subject_id
         and pace_number = v_submission.pace_number;
    end if;
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
