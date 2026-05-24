-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260524_bulk_pace_grade_upload.sql
-- Propósito : Soporte para carga masiva de PACEs por coordinador/tutor/admin.
--             Índices, GRANTs y políticas RLS para pei_pace_projections.
-- Seguro    : Solo ADD, CREATE IF NOT EXISTS, DROP POLICY IF EXISTS + CREATE.
--             No borra datos ni altera notas existentes.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Índices para mejorar rendimiento de la carga masiva ────────────────────

-- Búsqueda rápida de proyecciones por estudiante + año + trimestre
CREATE INDEX IF NOT EXISTS idx_pei_pace_proj_student_year_q
  ON public.pei_pace_projections(student_id, school_year, quarter);

-- Búsqueda rápida de grade_entries por subject + assessment_name
CREATE INDEX IF NOT EXISTS idx_sge_subject_assessment_bulk
  ON public.student_grade_entries(student_subject_id, assessment_name, quarter, school_year);

-- ── 2. GRANTs sobre tablas usadas por la carga masiva ────────────────────────

-- pei_pace_projections: coordinador/tutor necesita SELECT y UPDATE (grade_obtained, status)
GRANT SELECT, UPDATE ON public.pei_pace_projections TO authenticated;

-- student_grade_entries: ya debería estar concedido; por idempotencia lo repetimos
GRANT SELECT, INSERT, UPDATE ON public.student_grade_entries TO authenticated;

-- student_subjects: necesario para resolver student_subject_id en el fallback
GRANT SELECT ON public.student_subjects TO authenticated;

-- students: necesario para listar estudiantes filtrados por hub/tutor
GRANT SELECT ON public.students TO authenticated;

-- ── 3. RLS para pei_pace_projections ─────────────────────────────────────────
-- Asegura que coordinadores y tutores puedan UPDATE grade_obtained / status.
-- Usa las funciones helper existentes (is_admin_or_director, is_tutor_of).

-- 3a. Admin / coordinator — acceso total
DROP POLICY IF EXISTS rls_pei_pace_proj_admin_all ON public.pei_pace_projections;
CREATE POLICY rls_pei_pace_proj_admin_all
  ON public.pei_pace_projections
  FOR ALL
  TO authenticated
  USING  (is_admin_or_director())
  WITH CHECK (is_admin_or_director());

-- 3b. Tutor — SELECT solo de sus estudiantes
DROP POLICY IF EXISTS rls_pei_pace_proj_tutor_select ON public.pei_pace_projections;
CREATE POLICY rls_pei_pace_proj_tutor_select
  ON public.pei_pace_projections
  FOR SELECT
  TO authenticated
  USING (
    (
      SELECT role FROM public.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    ) IN ('tutor', 'mentor')
    AND is_tutor_of(student_id)
  );

-- 3c. Tutor — UPDATE solo de sus estudiantes (para grabar grade_obtained)
DROP POLICY IF EXISTS rls_pei_pace_proj_tutor_update ON public.pei_pace_projections;
CREATE POLICY rls_pei_pace_proj_tutor_update
  ON public.pei_pace_projections
  FOR UPDATE
  TO authenticated
  USING (
    (
      SELECT role FROM public.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    ) IN ('tutor', 'mentor')
    AND is_tutor_of(student_id)
  )
  WITH CHECK (
    (
      SELECT role FROM public.profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    ) IN ('tutor', 'mentor')
    AND is_tutor_of(student_id)
  );

-- ── 4. Asegurar que RLS está habilitado en pei_pace_projections ───────────────
-- (idempotente — no hace nada si ya está habilitado)
ALTER TABLE public.pei_pace_projections ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS para student_grade_entries — coordinator scope ────────────────────
-- Coordinador ya tiene ALL vía is_admin_or_director(), pero por claridad
-- confirmamos que la política admin cubre el scope de hub correctamente.
-- No se modifica la política existente (ya funciona).

-- ── Fin de migración ──────────────────────────────────────────────────────────
COMMIT;

-- Nota técnica:
-- El trigger trg_sync_student_subject_average_from_entries se ejecuta
-- automáticamente tras INSERT/UPDATE en student_grade_entries y recalcula
-- student_subjects.grade como AVG(score) para ese grupo.
-- No es necesario actualizar student_subjects.grade manualmente.
