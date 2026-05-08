-- ══════════════════════════════════════════════════════════════════════════════
-- Phase 4: Flujo académico-documental — esquema completamente idempotente
-- ══════════════════════════════════════════════════════════════════════════════
-- Ejecutar en Supabase SQL Editor.
-- Seguro para ejecutar aunque algunas columnas ya existan o no existan.
-- No borra datos. No modifica RLS.
-- Orden de operaciones:
--   1. ADD COLUMN IF NOT EXISTS (todas las columnas necesarias)
--   2. DROP + ADD CONSTRAINT (CHECK actualizado con revision_requested)
--   3. CREATE OR REPLACE FUNCTION (RPCs actualizados)
-- ══════════════════════════════════════════════════════════════════════════════


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 1: Columnas en student_grade_entries
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.student_grade_entries
  ADD COLUMN IF NOT EXISTS submission_status  text        NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS submitted_by       uuid        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by        uuid        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS review_comment     text,
  ADD COLUMN IF NOT EXISTS entered_by         uuid        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS entered_by_role    text;

CREATE INDEX IF NOT EXISTS idx_sge_submission_status
  ON public.student_grade_entries (submission_status);

CREATE INDEX IF NOT EXISTS idx_sge_entered_by_role
  ON public.student_grade_entries (entered_by_role);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 2: Columnas en student_subjects
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.student_subjects
  ADD COLUMN IF NOT EXISTS grade_submission_status  text        DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS grade_submitted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS grade_reviewed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS grade_review_comment     text,
  ADD COLUMN IF NOT EXISTS grade_submitted_by       uuid        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS grade_reviewed_by        uuid        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approval_status          text,
  ADD COLUMN IF NOT EXISTS approved_by_user_id      uuid        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at             timestamptz;

-- Rellenar NULL en grade_submission_status para filas pre-existentes
UPDATE public.student_subjects
  SET grade_submission_status = 'draft'
  WHERE grade_submission_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_subjects_grade_status
  ON public.student_subjects (grade_submission_status);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 3: CHECK constraints actualizados
-- Primero eliminar TODAS las variaciones de nombre posibles, luego crear una.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ── student_grade_entries.submission_status ───────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.student_grade_entries
    DROP CONSTRAINT IF EXISTS student_grade_entries_submission_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.student_grade_entries
    DROP CONSTRAINT IF EXISTS "student_grade_entries_submission_status_check1";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.student_grade_entries
    DROP CONSTRAINT IF EXISTS "student_grade_entries_submission_status_check2";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.student_grade_entries
  ADD CONSTRAINT student_grade_entries_submission_status_check
  CHECK (submission_status IN (
    'draft', 'submitted', 'approved', 'rejected', 'revision_requested'
  ));

-- ── student_subjects.grade_submission_status ──────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.student_subjects
    DROP CONSTRAINT IF EXISTS student_subjects_grade_submission_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.student_subjects
    DROP CONSTRAINT IF EXISTS "student_subjects_grade_submission_status_check1";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.student_subjects
    DROP CONSTRAINT IF EXISTS "student_subjects_grade_submission_status_check2";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.student_subjects
  ADD CONSTRAINT student_subjects_grade_submission_status_check
  CHECK (grade_submission_status IN (
    'draft', 'submitted', 'approved', 'rejected', 'revision_requested'
  ));


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 4: RPC submit_subject_grades
-- Envía notas a revisión. Rellena entered_by / entered_by_role si faltaba.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.submit_subject_grades(
  p_student_subject_id uuid
)
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

  -- Verificar permisos
  IF v_role = 'parent' AND NOT public.is_parent_of(v_student_id) THEN
    RAISE EXCEPTION 'Sin permisos para enviar notas de este estudiante.';
  END IF;

  IF v_role IN ('tutor', 'mentor') AND NOT public.is_tutor_of(v_student_id) THEN
    RAISE EXCEPTION 'Sin permisos para enviar notas de este estudiante.';
  END IF;

  -- Marcar entradas draft → submitted y rellenar auditoría
  UPDATE public.student_grade_entries
     SET submission_status = 'submitted',
         submitted_by      = auth.uid(),
         submitted_at      = NOW(),
         entered_by        = COALESCE(entered_by,      auth.uid()),
         entered_by_role   = COALESCE(entered_by_role, v_role)
   WHERE student_subject_id = p_student_subject_id
     AND submission_status  = 'draft';

  -- Actualizar estado en la materia
  UPDATE public.student_subjects
     SET grade_submission_status = 'submitted',
         grade_submitted_by      = auth.uid(),
         grade_submitted_at      = NOW(),
         grade_review_comment    = NULL
   WHERE id = p_student_subject_id;
END;
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 5: RPC review_subject_grades
-- Aprueba / rechaza / solicita corrección.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

  -- Actualizar entradas (submitted o revision_requested → nueva acción)
  UPDATE public.student_grade_entries
     SET submission_status = p_action,
         reviewed_by       = auth.uid(),
         reviewed_at       = NOW(),
         review_comment    = p_comment
   WHERE student_subject_id = p_student_subject_id
     AND submission_status  IN ('submitted', 'revision_requested');

  -- Actualizar la materia
  -- approval_status refleja la última acción del revisor para trazabilidad directa
  UPDATE public.student_subjects
     SET grade_submission_status = p_action,
         approval_status         = p_action,
         grade_reviewed_by       = auth.uid(),
         grade_reviewed_at       = NOW(),
         grade_review_comment    = p_comment,
         approved_by_user_id     = CASE
                                     WHEN p_action = 'approved' THEN auth.uid()
                                     ELSE approved_by_user_id
                                   END
   WHERE id = p_student_subject_id;
END;
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 6: RPC reset_subject_grades_to_draft
-- Fuerza regreso a borrador (solo admin/coordinador).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.reset_subject_grades_to_draft(
  p_student_subject_id uuid
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
    RAISE EXCEPTION 'Solo administradores y coordinadores pueden restablecer notas.';
  END IF;

  UPDATE public.student_grade_entries
     SET submission_status = 'draft',
         submitted_by      = NULL,
         submitted_at      = NULL,
         reviewed_by       = NULL,
         reviewed_at       = NULL,
         review_comment    = NULL
   WHERE student_subject_id = p_student_subject_id;

  UPDATE public.student_subjects
     SET grade_submission_status = 'draft',
         grade_submitted_by      = NULL,
         grade_submitted_at      = NULL,
         grade_reviewed_by       = NULL,
         grade_reviewed_at       = NULL,
         grade_review_comment    = NULL,
         approved_by_user_id     = NULL
   WHERE id = p_student_subject_id;
END;
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 7: RPC resubmit_subject_grades  (NUEVO)
-- Permite al padre/tutor reenviar tras revision_requested o rejected
-- sin que el admin deba hacer reset manualmente.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.resubmit_subject_grades(
  p_student_subject_id uuid
)
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

  SELECT student_id, grade_submission_status
    INTO v_student_id, v_status
    FROM public.student_subjects
   WHERE id = p_student_subject_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Materia no encontrada.';
  END IF;

  IF v_status NOT IN ('revision_requested', 'rejected', 'draft') THEN
    RAISE EXCEPTION 'Las notas no están en estado editable (estado actual: %).', v_status;
  END IF;

  IF v_role = 'parent' AND NOT public.is_parent_of(v_student_id) THEN
    RAISE EXCEPTION 'Sin permisos para reenviar notas de este estudiante.';
  END IF;

  IF v_role IN ('tutor', 'mentor') AND NOT public.is_tutor_of(v_student_id) THEN
    RAISE EXCEPTION 'Sin permisos para reenviar notas de este estudiante.';
  END IF;

  -- Marcar entradas editables → submitted
  UPDATE public.student_grade_entries
     SET submission_status = 'submitted',
         submitted_by      = auth.uid(),
         submitted_at      = NOW()
   WHERE student_subject_id = p_student_subject_id
     AND submission_status  IN ('draft', 'revision_requested', 'rejected');

  -- Actualizar la materia
  UPDATE public.student_subjects
     SET grade_submission_status = 'submitted',
         grade_submitted_by      = auth.uid(),
         grade_submitted_at      = NOW(),
         grade_review_comment    = NULL
   WHERE id = p_student_subject_id;
END;
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIN — Verificación rápida (solo lectura, no modifica nada)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT *
FROM (
  SELECT
    'student_grade_entries' AS tabla,
    column_name,
    data_type,
    is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'student_grade_entries'
    AND column_name  IN (
      'submission_status','submitted_by','submitted_at',
      'reviewed_by','reviewed_at','review_comment',
      'entered_by','entered_by_role'
    )

  UNION ALL

  SELECT
    'student_subjects' AS tabla,
    column_name,
    data_type,
    is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'student_subjects'
    AND column_name  IN (
      'grade_submission_status','grade_submitted_at','grade_reviewed_at',
      'grade_review_comment','grade_submitted_by','grade_reviewed_by',
      'approval_status','approved_by_user_id','submitted_at'
    )
) q
ORDER BY tabla, column_name;
