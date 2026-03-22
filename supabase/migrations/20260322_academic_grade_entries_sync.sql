create extension if not exists pgcrypto;

create table if not exists public.student_grade_entries (
  id uuid primary key default gen_random_uuid(),
  student_subject_id uuid not null references public.student_subjects (id) on delete cascade,
  student_id uuid not null,
  quarter text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  school_year text not null,
  assessment_name text not null default 'Actividad',
  score numeric(5,2),
  date_recorded date not null default current_date,
  entry_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_student_grade_entries_subject_context
  on public.student_grade_entries (student_subject_id, student_id, school_year, quarter);

create or replace function public.set_student_grade_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_student_grade_entries_set_updated_at on public.student_grade_entries;

create trigger trg_student_grade_entries_set_updated_at
before update on public.student_grade_entries
for each row
execute function public.set_student_grade_entries_updated_at();

create or replace function public.sync_student_subject_average_from_entries()
returns trigger
language plpgsql
as $$
declare
  target_subject_id uuid;
  target_student_id uuid;
  target_quarter text;
  target_school_year text;
  calculated_average numeric(5,2);
begin
  target_subject_id := coalesce(new.student_subject_id, old.student_subject_id);
  target_student_id := coalesce(new.student_id, old.student_id);
  target_quarter := coalesce(new.quarter, old.quarter);
  target_school_year := coalesce(new.school_year, old.school_year);

  select round(avg(score)::numeric, 2)
    into calculated_average
  from public.student_grade_entries
  where student_subject_id = target_subject_id
    and student_id = target_student_id
    and quarter = target_quarter
    and school_year = target_school_year
    and score is not null;

  update public.student_subjects
     set grade = calculated_average,
         submitted_at = now()
   where id = target_subject_id
     and student_id = target_student_id
     and quarter = target_quarter
     and school_year = target_school_year;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_student_subject_average_from_entries on public.student_grade_entries;

create trigger trg_sync_student_subject_average_from_entries
after insert or update or delete on public.student_grade_entries
for each row
execute function public.sync_student_subject_average_from_entries();


update public.student_subjects as ss
   set grade = aggregated.average_grade,
       submitted_at = now()
  from (
    select student_subject_id,
           student_id,
           quarter,
           school_year,
           round(avg(score)::numeric, 2) as average_grade
      from public.student_grade_entries
     where score is not null
     group by student_subject_id, student_id, quarter, school_year
  ) as aggregated
 where ss.id = aggregated.student_subject_id
   and ss.student_id = aggregated.student_id
   and ss.quarter = aggregated.quarter
   and ss.school_year = aggregated.school_year;
