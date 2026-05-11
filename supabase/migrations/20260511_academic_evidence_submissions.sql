-- Flujo de Evidencias Académicas para familias Off Campus.
-- Las evidencias NO insertan ni aprueban notas finales; Chanak revisa oficialmente.

create table if not exists public.academic_evidence_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  student_subject_id uuid not null references public.student_subjects(id) on delete cascade,
  submitted_by uuid not null default auth.uid(),
  subject_name text not null,
  school_year text not null,
  quarter text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  pace_number integer,
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  evidence_type text not null check (evidence_type in ('PACE Test', 'Self Test', 'Proyecto', 'Life Skills', 'Extensión Local')),
  comment text,
  attachment_path text,
  attachment_url text,
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'approved', 'correction_requested', 'rejected')),
  academic_outcome text not null default 'pending_review' check (academic_outcome in ('pending_review', 'requires_repeat', 'approved', 'correction_required', 'rejected')),
  reviewer_comment text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_evidence_subject_matches_student check (student_id is not null and student_subject_id is not null),
  constraint academic_evidence_pace_minimum check (
    evidence_type <> 'PACE Test'
    or score >= 80
    or (review_status <> 'approved' and academic_outcome in ('requires_repeat', 'correction_required'))
  )
);

comment on table public.academic_evidence_submissions is
  'Evidencias reportadas por padres/familias para revisión oficial de Chanak. No son notas finales.';
comment on column public.academic_evidence_submissions.review_status is
  'pending_review, approved, correction_requested o rejected. Solo Chanak valida oficialmente.';
comment on column public.academic_evidence_submissions.academic_outcome is
  'PACE Test con score < 80 debe quedar requires_repeat/correction_required, nunca aprobado.';

create index if not exists idx_academic_evidence_student_year_quarter
  on public.academic_evidence_submissions (student_id, school_year, quarter);

create index if not exists idx_academic_evidence_subject
  on public.academic_evidence_submissions (student_subject_id);

create index if not exists idx_academic_evidence_review_status
  on public.academic_evidence_submissions (review_status);

alter table public.academic_evidence_submissions enable row level security;

-- Actualiza updated_at sin depender de funciones existentes.
create or replace function public.set_academic_evidence_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_academic_evidence_updated_at on public.academic_evidence_submissions;
create trigger trg_academic_evidence_updated_at
before update on public.academic_evidence_submissions
for each row execute function public.set_academic_evidence_updated_at();

-- Padres/familias: solo pueden ver y crear evidencias de sus hijos vinculados en family_students.
drop policy if exists "rls_academic_evidence_parent_select" on public.academic_evidence_submissions;
create policy "rls_academic_evidence_parent_select"
  on public.academic_evidence_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.family_students fs
      where fs.student_id = academic_evidence_submissions.student_id
        and fs.family_id = auth.uid()
    )
  );

drop policy if exists "rls_academic_evidence_parent_insert" on public.academic_evidence_submissions;
create policy "rls_academic_evidence_parent_insert"
  on public.academic_evidence_submissions
  for insert
  to authenticated
  with check (
    submitted_by = auth.uid()
    and review_status in ('pending_review', 'correction_requested')
    and (
      evidence_type <> 'PACE Test'
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

-- Familias no actualizan ni aprueban la evidencia después de enviada.
-- Admin/coordinador pueden revisar y actualizar estados sin tocar notas finales.
drop policy if exists "rls_academic_evidence_admin_coordinator_all" on public.academic_evidence_submissions;
create policy "rls_academic_evidence_admin_coordinator_all"
  on public.academic_evidence_submissions
  for all
  to authenticated
  using (public.get_current_user_role() in ('admin', 'super_admin', 'director', 'coordinator'))
  with check (public.get_current_user_role() in ('admin', 'super_admin', 'director', 'coordinator'));

-- Bucket privado para adjuntos opcionales.
insert into storage.buckets (id, name, public)
values ('academic-evidence', 'academic-evidence', false)
on conflict (id) do nothing;

drop policy if exists "storage_academic_evidence_parent_select" on storage.objects;
create policy "storage_academic_evidence_parent_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'academic-evidence'
    and public.is_parent_of((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "storage_academic_evidence_parent_insert" on storage.objects;
create policy "storage_academic_evidence_parent_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'academic-evidence'
    and public.is_parent_of((storage.foldername(name))[1]::uuid)
  );

drop policy if exists "storage_academic_evidence_admin_coordinator_all" on storage.objects;
create policy "storage_academic_evidence_admin_coordinator_all"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'academic-evidence'
    and public.get_current_user_role() in ('admin', 'super_admin', 'director', 'coordinator')
  )
  with check (
    bucket_id = 'academic-evidence'
    and public.get_current_user_role() in ('admin', 'super_admin', 'director', 'coordinator')
  );
