-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: cierre_sis_pei_pagos_matricula
-- Propósito : Cerrar el SIS con campos PEI faltantes, módulo de pagos MVP
--             y registros de matrícula. Ampliar tipos de alertas.
-- Seguro    : Solo ADD/CREATE IF NOT EXISTS + DROP/ADD CONSTRAINT.
--             Sin DROP TABLE, sin TRUNCATE, sin DELETE masivo.
--             Idempotente al 100 %.
--
-- NOTA DE PRODUCCIÓN (2026-05-24):
--   student_payments ya existía con columnas legacy:
--     payment_type, program_type, stripe_session_id, stripe_payment_intent_id,
--     amount_cents, final_amount, total_due, campos de beca (scholarship_*).
--   Se añaden columnas nuevas con ADD COLUMN IF NOT EXISTS.
--   NO se recrea la tabla. NO se hace DROP TABLE.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 1 — individualized_education_plans: campos de secciones 01, 08, 09, 10
-- ─────────────────────────────────────────────────────────────────────────────

-- Sección 01: datos de contacto y responsable
ALTER TABLE public.individualized_education_plans
  ADD COLUMN IF NOT EXISTS student_nationality    text,
  ADD COLUMN IF NOT EXISTS student_city           text,
  ADD COLUMN IF NOT EXISTS student_country        text DEFAULT 'España',
  ADD COLUMN IF NOT EXISTS student_email          text,
  ADD COLUMN IF NOT EXISTS mentor_assigned        text,
  ADD COLUMN IF NOT EXISTS parent_phone           text,
  ADD COLUMN IF NOT EXISTS parent_relation        text DEFAULT 'Padre/Madre';

-- Sección 08: materiales y recursos asignados
ALTER TABLE public.individualized_education_plans
  ADD COLUMN IF NOT EXISTS materials_text          text;

-- Sección 09: acuerdos operativos de la familia
ALTER TABLE public.individualized_education_plans
  ADD COLUMN IF NOT EXISTS operational_agreements  text;

-- Sección 10: firma del estudiante + control de versión
ALTER TABLE public.individualized_education_plans
  ADD COLUMN IF NOT EXISTS student_signature_name  text,
  ADD COLUMN IF NOT EXISTS student_signature_date  date,
  ADD COLUMN IF NOT EXISTS version                 text DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS next_review_date        date;

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 2 — pei_pace_projections: alias para compatibilidad con ParentDashboard
-- ─────────────────────────────────────────────────────────────────────────────

-- El ParentDashboard consulta 'projected_completion_date' pero el campo real
-- es 'estimated_delivery_date'. Añadir alias para no romper el portal padre.
ALTER TABLE public.pei_pace_projections
  ADD COLUMN IF NOT EXISTS projected_completion_date date;

-- Rellenar desde estimated_delivery_date donde ya haya datos y la nueva columna sea null
UPDATE public.pei_pace_projections
SET projected_completion_date = estimated_delivery_date
WHERE projected_completion_date IS NULL
  AND estimated_delivery_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pei_pace_proj_completion
  ON public.pei_pace_projections(student_id, projected_completion_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 3 — student_payments: ampliar tabla legacy con columnas nuevas (MVP)
--
--   La tabla YA EXISTE con columnas legacy. Este bloque SÓLO añade columnas
--   nuevas y migra datos. NO se recrea la tabla.
-- ─────────────────────────────────────────────────────────────────────────────

-- 3a. Añadir columnas nuevas si no existen
ALTER TABLE public.student_payments
  ADD COLUMN IF NOT EXISTS family_auth_id          uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS school_year             text DEFAULT '2025-2026',
  ADD COLUMN IF NOT EXISTS concept                 text,
  ADD COLUMN IF NOT EXISTS amount                  numeric(10,2),
  ADD COLUMN IF NOT EXISTS currency                text DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS due_date                date,
  ADD COLUMN IF NOT EXISTS stripe_payment_link_url text,
  ADD COLUMN IF NOT EXISTS payment_method          text,
  ADD COLUMN IF NOT EXISTS notes                   text,
  ADD COLUMN IF NOT EXISTS updated_at              timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_by              uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by              uuid REFERENCES auth.users(id);

-- 3b. Migrar datos legacy → columnas nuevas (idempotente: solo filas sin datos nuevos)

-- concept ← payment_type (normalizar valores conocidos)
UPDATE public.student_payments
SET concept = CASE
  WHEN payment_type IN ('matricula','paquete_curricular','mensualidad',
                        'materiales_adicionales','evaluacion') THEN payment_type
  WHEN payment_type IS NOT NULL AND payment_type <> ''        THEN 'otro'
  ELSE NULL
END
WHERE concept IS NULL
  AND payment_type IS NOT NULL
  AND payment_type <> '';

-- amount ← amount_cents / 100  o  final_amount  o  total_due (en ese orden)
UPDATE public.student_payments
SET amount = CASE
  WHEN amount_cents IS NOT NULL AND amount_cents > 0 THEN (amount_cents / 100.0)::numeric(10,2)
  WHEN final_amount IS NOT NULL AND final_amount > 0 THEN final_amount::numeric(10,2)
  WHEN total_due    IS NOT NULL AND total_due    > 0 THEN total_due::numeric(10,2)
  ELSE 0.00
END
WHERE amount IS NULL;

-- school_year: rellenar filas sin valor (asume año académico en curso)
UPDATE public.student_payments
SET school_year = '2025-2026'
WHERE school_year IS NULL;

-- 3c. Índices (idempotentes)
CREATE INDEX IF NOT EXISTS idx_student_payments_student
  ON public.student_payments(student_id, school_year, status);
CREATE INDEX IF NOT EXISTS idx_student_payments_due
  ON public.student_payments(due_date, status);

-- 3d. Trigger updated_at (idempotente con CREATE OR REPLACE + DROP IF EXISTS)
CREATE OR REPLACE FUNCTION public.set_student_payments_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_student_payments_updated_at ON public.student_payments;
CREATE TRIGGER trg_student_payments_updated_at
  BEFORE UPDATE ON public.student_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_student_payments_updated_at();

-- 3e. RLS (habilitar si no está habilitado; los POLICY con DROP IF EXISTS son idempotentes)
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;

-- admin / coordinator: acceso total
DROP POLICY IF EXISTS rls_sp_admin_all ON public.student_payments;
CREATE POLICY rls_sp_admin_all ON public.student_payments
  FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- padre: solo ve los pagos de sus hijos
DROP POLICY IF EXISTS rls_sp_parent_select ON public.student_payments;
CREATE POLICY rls_sp_parent_select ON public.student_payments
  FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() = 'parent'
    AND public.is_parent_of(student_id)
  );

-- tutor / mentor: puede ver (no modificar) los pagos de sus estudiantes
DROP POLICY IF EXISTS rls_sp_tutor_select ON public.student_payments;
CREATE POLICY rls_sp_tutor_select ON public.student_payments
  FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() IN ('tutor','mentor')
    AND public.is_tutor_of(student_id)
  );

GRANT SELECT, INSERT, UPDATE ON public.student_payments TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 4 — enrollment_records: estado de matrícula por estudiante / año
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.enrollment_records (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  family_auth_id          uuid REFERENCES auth.users(id),
  school_year             text NOT NULL DEFAULT '2025-2026',
  program                 text DEFAULT 'Off-Campus',
  grade_level             text,
  enrollment_status       text NOT NULL DEFAULT 'lead'
    CHECK (enrollment_status IN (
      'lead','application_started','documents_pending','contract_sent',
      'contract_signed','payment_pending','enrolled','active','paused','withdrawn'
    )),
  contract_id             uuid REFERENCES public.enrollment_contracts(id) ON DELETE SET NULL,
  enrollment_letter_id    uuid REFERENCES public.enrollment_letters(id)   ON DELETE SET NULL,
  payment_status          text DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','partial','waived','scholarship')),
  matricula_paid_at       timestamptz,
  activated_at            timestamptz,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- Un registro por estudiante por año (idempotente)
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_records_student_year
  ON public.enrollment_records(student_id, school_year);
CREATE INDEX IF NOT EXISTS idx_enrollment_records_status
  ON public.enrollment_records(enrollment_status);

CREATE OR REPLACE FUNCTION public.set_enrollment_records_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_enrollment_records_updated_at ON public.enrollment_records;
CREATE TRIGGER trg_enrollment_records_updated_at
  BEFORE UPDATE ON public.enrollment_records
  FOR EACH ROW EXECUTE FUNCTION public.set_enrollment_records_updated_at();

ALTER TABLE public.enrollment_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_er_admin_all ON public.enrollment_records;
CREATE POLICY rls_er_admin_all ON public.enrollment_records
  FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

DROP POLICY IF EXISTS rls_er_parent_select ON public.enrollment_records;
CREATE POLICY rls_er_parent_select ON public.enrollment_records
  FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() = 'parent'
    AND public.is_parent_of(student_id)
  );

GRANT SELECT, INSERT, UPDATE ON public.enrollment_records TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOQUE 5 — academic_alerts: ampliar tipos y contextos
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.academic_alerts
  DROP CONSTRAINT IF EXISTS academic_alerts_alert_type_check;
ALTER TABLE public.academic_alerts
  DROP CONSTRAINT IF EXISTS academic_alerts_context_type_check;
ALTER TABLE public.academic_alerts
  DROP CONSTRAINT IF EXISTS academic_alerts_target_role_check;

ALTER TABLE public.academic_alerts
  ADD CONSTRAINT academic_alerts_alert_type_check
  CHECK (alert_type IN (
    'pace_overdue', 'grade_pending_review', 'bulletin_ready',
    'pei_published', 'grade_missing', 'pei_ready',
    'pei_pending', 'payment_pending', 'payment_overdue', 'enrollment_incomplete'
  ));

ALTER TABLE public.academic_alerts
  ADD CONSTRAINT academic_alerts_context_type_check
  CHECK (context_type IN (
    'pace', 'transcript', 'pei', 'grade', 'payment', 'enrollment'
  ));

ALTER TABLE public.academic_alerts
  ADD CONSTRAINT academic_alerts_target_role_check
  CHECK (target_role IN (
    'tutor', 'coordinator', 'admin', 'parent', 'student'
  ));

-- ─────────────────────────────────────────────────────────────────────────────
-- FIN
-- ─────────────────────────────────────────────────────────────────────────────

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- INSTRUCCIONES PARA EJECUTAR:
-- 1. Copia este SQL en Supabase SQL Editor.
-- 2. Ejecuta. Si hay error en el UPDATE de pei_pace_projections (tabla vacía),
--    es seguro — el UPDATE afecta 0 filas.
-- 3. Si hay error en UPDATE de student_payments por columnas legacy faltantes,
--    comentar temporalmente la sección UPDATE que falla y volver a ejecutar.
-- 4. Verifica que COMMIT aparece sin errores.
-- ═══════════════════════════════════════════════════════════════════════════
