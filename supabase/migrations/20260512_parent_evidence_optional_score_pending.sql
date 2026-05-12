-- Parent Dashboard evidence hardening:
-- Families submit evidence for review only. Scores are optional and every new
-- parent submission must start as pending_review; final grade approval remains
-- in the reviewer workflow, not in student_grade_entries from the parent UI.

alter table public.academic_evidence_submissions
  alter column score drop not null;

alter table public.academic_evidence_submissions
  drop constraint if exists academic_evidence_submissions_score_check;

alter table public.academic_evidence_submissions
  add constraint academic_evidence_submissions_score_check
  check (score is null or (score >= 0 and score <= 100));

alter table public.academic_evidence_submissions
  drop constraint if exists academic_evidence_pace_minimum;

alter table public.academic_evidence_submissions
  add constraint academic_evidence_pace_minimum check (
    evidence_type <> 'PACE Test'
    or score is null
    or score >= 80
    or (review_status <> 'approved' and academic_outcome in ('requires_repeat', 'correction_required'))
  );

drop policy if exists "rls_academic_evidence_parent_insert" on public.academic_evidence_submissions;
create policy "rls_academic_evidence_parent_insert"
  on public.academic_evidence_submissions
  for insert
  to authenticated
  with check (
    submitted_by = auth.uid()
    and review_status = 'pending_review'
    and (
      evidence_type <> 'PACE Test'
      or score is null
      or score >= 80
      or academic_outcome in ('requires_repeat', 'correction_required')
    )
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
