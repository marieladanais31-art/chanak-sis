-- Enforce Chanak/ACE base grade rules for individual grade entries.
-- Final subject grades remain calculated as AVG(score) by
-- sync_student_subject_average_from_entries().

alter table public.student_grade_entries
  drop constraint if exists student_grade_entries_score_range;

alter table public.student_grade_entries
  add constraint student_grade_entries_score_range
  check (score is null or (score >= 0 and score <= 100));

comment on constraint student_grade_entries_score_range on public.student_grade_entries is
  'Base grade scale is 0-100. ACE mastery/PACE approval threshold is handled as score >= 80.';
