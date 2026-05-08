-- ══════════════════════════════════════════════════════════════════════════════
-- Phase 4: Flujo académico-documental — ajustes de esquema y RPCs
-- ══════════════════════════════════════════════════════════════════════════════
-- Cambios:
--  1. Añadir 'revision_requested' al CHECK de grade_submission_status
--     (tanto en student_subjects como en student_grade_entries.submission_status)
--  2. Añadir entered_by + entered_by_role a student_grade_entries
--  3. Actualizar review_subject_grades para aceptar 'revision_requested'
--  4. Actualizar submit_subject_grades para capturar entered_by_role
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. student_subjects.grade_submission_status ─────────────────────────────
-- PostgreSQL no permite ALTER CONSTRAINT; hay que DROP + ADD.
-- La constraint fue creada con ADD COLUMN IF NOT EXISTS ... CHECK (...) en fase2,
-- por lo que su nombre auto-generado es: student_subjects_grade_submission_status_check
-- (si hay conflicto, Postgres añade sufijos _check1, etc.)

DO $$
BEGIN
  -- Intentar borrar todas las variaciones posibles del nombre
  ALTER TABLE public.student_subjects
    DROP CONSTRAINT IF EXISTS student_subjects_grade_submission_status_check;
  ALTER TABLE public.student_subjects
    DROP CONSTRAINT IF EXISTS "student_subjects_grade_submission_status_check1";
  ALTER TABLE public.student_subjects
    DROP CONSTRAINT IF EXISTS student_subjects_grade_submission_status_check2;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'No se pudo borrar constraint (ya no existe): %', SQLERRM;
END $$;

ALTER TABLE public.student_subjects
  ADD CONSTRAINT student_subjects_grade_submission_status_check
  CHECK (grade_submission_status IN (
    'draft', 'submitted', 'approved', 'rejected', 'revision_requested'
  ));

-- ─── 2. student_grade_entries.submission_status ───────────────────────────────

DO $$
BEGIN
  ALTER TABLE public.student_grade_entries
    DROP CONSTRAINT IF EXISTS student_grade_entries_submission_status_check;
  ALTER TABLE public.student_grade_entries
    DROP CONSTRAINT IF EXISTS "student_grade_entries_submission_status_check1";
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'No se pudo borrar constraint (ya no existe): %', SQLERRM;
END $$;

ALTER TABLE public.student_grade_entries
  ADD CONSTRAINT student_grade_entries_submission_status_check
  CHECK (submission_status IN (
    'draft', 'submitted', 'approved', 'rejected', 'revision_requested'
  ));

-- ─── 3. Nuevas columnas en student_grade_entries ──────────────────────────────
-- entered_by:      auth.uid() del usuario que creó la entrada (padre, tutor, admin)
-- entered_by_role: rol textual en el momento de la creación ('parent', 'tutor', etc.)

ALTER TABLE public.student_grade_entries
  ADD COLUMN IF NOT EXISTS entered_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS entered_by_role text;

CREATE INDEX IF NOT EXISTS idx_sge_entered_by_role
  ON public.student_grade_entries (entered_by_role);

-- ─── 4. RPC: submit_subject_grades (actualizado) ─────────────────────────────
-- Novedad: Ahora también actualiza entered_by / entered_by_role en las entradas
-- que aún no tienen ese dato (retrocompatible).

CREATE OR REPLACE FUNCTION public.submit_subject_grades(p_student_subject_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role       text;
  v_student_id uuid;
BEGIN
  v_role := public.get_current_user_role();

  SELECT student_id INTO v_student_id
  FROM public.student_subjects
  WHERE id = p_student_subject_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Materia no encontrada.';
  END IF;

  IF v_role = 'parent' AND NOT public.is_parent_of(v_student_id) THEN
    RAISE EXCEPTION 'Sin permisos para enviar notas de este estudiante.';
  END IF;

  IF v_role IN ('tutor', 'mentor') AND NOT public.is_tutor_of(v_student_id) THEN
    RAISE EXCEPTION 'Sin permisos para enviar notas de este estudiante.';
  END IF;

  -- Marcar entradas draft como submitted, rellenar auditoría si faltaba
  UPDATE public.student_grade_entries
  SET
    submission_status = 'submitted',
    submitted_by      = auth.uid(),
    submitted_at      = NOW(),
    entered_by        = COALESCE(entered_by, auth.uid()),
    entered_by_role   = COALESCE(entered_by_role, v_role)
  WHERE student_subject_id = p_student_subject_id
    AND submission_status  = 'draft';

  -- Actualizar estado en la materia
  UPDATE public.student_subjects
  SET
    grade_submission_status = 'submitted',
    grade_submitted_by      = auth.uid(),
    grade_submitted_at      = NOW(),
    grade_review_comment    = NULL
  WHERE id = p_student_subject_id;
END;
$$;

-- ─── 5. RPC: review_subject_grades (actualizado) ─────────────────────────────
-- Novedad: acepta 'revision_requested' como acción válida (corrección solicitada
-- sin rechazo definitivo). Diferente de 'rejected': con revision_requested el
-- padre/tutor puede corregir y reenviar sin que el admin deba "reset" manualmente.

CREATE OR REPLACE FUNCTION public.review_subject_grades(
  p_student_subject_id uuid,
  p_action             text,
  p_comment            text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.get_current_user_role();

  IF v_role NOT IN ('admin', 'super_admin', 'director', 'coordinator') THEN
    RAISE EXCEPTION 'Solo administradores y coordinadores pueden revisar notas.';
  END IF;

  IF p_action NOT IN ('approved', 'rejected', 'revision_requested') THEN
    RAISE EXCEPTION 'Acción inválida. Use "approved", "rejected" o "revision_requested".';
  END IF;

  -- Actualizar entradas submitted
  UPDATE public.student_grade_entries
  SET
    submission_status = p_action,
    reviewed_by       = auth.uid(),
    reviewed_at       = NOW(),
    review_comment    = p_comment
  WHERE student_subject_id = p_student_subject_id
    AND submission_status  IN ('submitted', 'revision_requested');

  -- Actualizar la materia
  UPDATE public.student_subjects
  SET
    grade_submission_status = p_action,
    grade_reviewed_by       = auth.uid(),
    grade_reviewed_at       = NOW(),
    grade_review_comment    = p_comment
  WHERE id = p_student_subject_id;
END;
$$;

-- ─── 6. RPC: reset_subject_grades_to_draft (actualizado) ─────────────────────
-- Ahora también maneja revision_requested → draft.
-- (Sigue siendo necesario para admin que quiera forzar la corrección.)

CREATE OR REPLACE FUNCTION public.reset_subject_grades_to_draft(p_student_subject_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.get_current_user_role();

  IF v_role NOT IN ('admin', 'super_admin', 'director', 'coordinator') THEN
    RAISE EXCEPTION 'Solo administradores y coordinadores pueden restablecer notas.';
  END IF;

  UPDATE public.student_grade_entries
  SET
    submission_status = 'draft',
    submitted_by      = NULL,
    submitted_at      = NULL,
    reviewed_by       = NULL,
    reviewed_at       = NULL,
    review_comment    = NULL
  WHERE student_subject_id = p_student_subject_id;

  UPDATE public.student_subjects
  SET
    grade_submission_status = 'draft',
    grade_submitted_by      = NULL,
    grade_submitted_at      = NULL,
    grade_reviewed_by       = NULL,
    grade_reviewed_at       = NULL,
    grade_review_comment    = NULL
  WHERE id = p_student_subject_id;
END;
$$;

-- ─── 7. RPC: resubmit_subject_grades ─────────────────────────────────────────
-- Permite al padre/tutor reenviar notas después de una 'revision_requested'.
-- Similar a submit_subject_grades pero acepta el estado revision_requested.

CREATE OR REPLACE FUNCTION public.resubmit_subject_grades(p_student_subject_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role       text;
  v_student_id uuid;
  v_status     text;
BEGIN
  v_role := public.get_current_user_role();

  SELECT student_id, grade_submission_status INTO v_student_id, v_status
  FROM public.student_subjects
  WHERE id = p_student_subject_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Materia no encontrada.';
  END IF;

  IF v_status NOT IN ('revision_requested', 'rejected', 'draft') THEN
    RAISE EXCEPTION 'Las notas no están en estado editable.';
  END IF;

  IF v_role = 'parent' AND NOT public.is_parent_of(v_student_id) THEN
    RAISE EXCEPTION 'Sin permisos para reenviar notas de este estudiante.';
  END IF;

  IF v_role IN ('tutor', 'mentor') AND NOT public.is_tutor_of(v_student_id) THEN
    RAISE EXCEPTION 'Sin permisos para reenviar notas de este estudiante.';
  END IF;

  UPDATE public.student_grade_entries
  SET
    submission_status = 'submitted',
    submitted_by      = auth.uid(),
    submitted_at      = NOW()
  WHERE student_subject_id = p_student_subject_id
    AND submission_status  IN ('draft', 'revision_requested', 'rejected');

  UPDATE public.student_subjects
  SET
    grade_submission_status = 'submitted',
    grade_submitted_by      = auth.uid(),
    grade_submitted_at      = NOW(),
    grade_review_comment    = NULL
  WHERE id = p_student_subject_id;
END;
$$;
