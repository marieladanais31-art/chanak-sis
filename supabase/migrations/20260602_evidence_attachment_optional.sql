-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: evidencia sin adjunto — la nota/score es suficiente
-- La familia debe poder registrar una evaluación y nota sin adjuntar archivo.
-- La evidencia (archivo/Drive) pasa a ser opcional cuando hay score.
-- Idempotente. No toca pagos, auth, Stripe, PDFs ni RLS de otras tablas.
-- ─────────────────────────────────────────────────────────────────────────────

-- Actualizar política de inserción de padres:
-- Se requiere al menos UNO de: attachment_path, drive_url, score.
-- Si hay score, el padre puede enviar sin archivo ni Drive.
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
    -- Al menos uno de: archivo, Drive o nota debe estar presente
    and (attachment_path is not null or drive_url is not null or score is not null)
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
