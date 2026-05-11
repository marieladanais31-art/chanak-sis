-- Connect official report cards to approved student_grade_entries only.
-- These nullable fields preserve ACE mastery details and qualitative/local area notes
-- in transcript_courses generated from approved period grades.

alter table public.transcript_courses
  add column if not exists assessment_count integer not null default 0,
  add column if not exists qualitative_evaluation text,
  add column if not exists evaluation_note text,
  add column if not exists mastery_status text
    check (mastery_status is null or mastery_status in ('approved', 'not_mastered'));

create index if not exists idx_student_grade_entries_period_status
  on public.student_grade_entries (student_id, school_year, quarter, submission_status);

comment on column public.transcript_courses.assessment_count is
  'Number of approved student_grade_entries used to calculate this report-card course.';
comment on column public.transcript_courses.qualitative_evaluation is
  'Qualitative evaluation text for Life Skills and Extensión Local when configured without numeric score.';
comment on column public.transcript_courses.evaluation_note is
  'Approved reviewer/commentary carried from student_grade_entries for report-card context.';
comment on column public.transcript_courses.mastery_status is
  'ACE mastery status derived from approved PACE test average; approved requires average >= 80/100.';
