-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 4.1: Contratos de matrícula · Cartas de confirmación · PEI ampliado
-- Migración 100 % idempotente — no borra datos existentes
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Nuevas columnas en individualized_education_plans ───────────────────

ALTER TABLE public.individualized_education_plans
  ADD COLUMN IF NOT EXISTS student_age          text,
  ADD COLUMN IF NOT EXISTS student_dob          date,
  ADD COLUMN IF NOT EXISTS enrollment_date      date,
  ADD COLUMN IF NOT EXISTS last_grade_completed text,
  ADD COLUMN IF NOT EXISTS modality             text DEFAULT 'Off-Campus',
  ADD COLUMN IF NOT EXISTS curriculum_base      text DEFAULT 'A.C.E. (Accelerated Christian Education)',
  ADD COLUMN IF NOT EXISTS institutional_intro  text,
  ADD COLUMN IF NOT EXISTS ace_curriculum_description text,
  ADD COLUMN IF NOT EXISTS diagnostic_interpretation  text,
  ADD COLUMN IF NOT EXISTS local_extension            text,
  ADD COLUMN IF NOT EXISTS life_skills                text,
  ADD COLUMN IF NOT EXISTS daily_rhythm_methodology   text,
  ADD COLUMN IF NOT EXISTS follow_up_resources        text,
  ADD COLUMN IF NOT EXISTS estimated_time_daily_load  text,
  ADD COLUMN IF NOT EXISTS family_message             text,
  ADD COLUMN IF NOT EXISTS institutional_conclusion   text,
  ADD COLUMN IF NOT EXISTS director_signature_name    text,
  ADD COLUMN IF NOT EXISTS director_signature_date    date,
  ADD COLUMN IF NOT EXISTS parent_signature_name      text,
  ADD COLUMN IF NOT EXISTS parent_signature_date      date;

-- ── 2. pace_type en pei_pace_projections ───────────────────────────────────
--    'advance'  = PACE de avance curricular normal
--    'leveling' = PACE de nivelación (remediación)

ALTER TABLE public.pei_pace_projections
  ADD COLUMN IF NOT EXISTS pace_type text DEFAULT 'advance'
    CHECK (pace_type IN ('advance', 'leveling'));

-- ── 3. Contratos de matrícula / servicios ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.enrollment_contracts (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year             text NOT NULL DEFAULT '2025-2026',
  family_name             text,
  tutor_legal             text,
  program                 text,
  modality                text,
  academic_services       text,
  economic_conditions     text,
  family_responsibilities text,
  chanak_responsibilities text,
  start_date              date,
  end_date                date,
  issue_date              date DEFAULT CURRENT_DATE,
  director_signature_name text,
  director_signature_date date,
  parent_signature_name   text,
  parent_signature_date   date,
  status                  text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','signed','archived')),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enrollment_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_contracts_admin_all    ON public.enrollment_contracts;
DROP POLICY IF EXISTS rls_contracts_parent_select ON public.enrollment_contracts;

-- Admin / coordinator: full access
CREATE POLICY rls_contracts_admin_all ON public.enrollment_contracts
  USING (is_admin_or_director());

-- Parents: only sent or signed contracts for their children
CREATE POLICY rls_contracts_parent_select ON public.enrollment_contracts
  FOR SELECT USING (
    status IN ('sent', 'signed')
    AND is_parent_of(student_id)
  );

-- ── 4. Cartas de confirmación de matrícula ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.enrollment_letters (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year             text NOT NULL DEFAULT '2025-2026',
  program                 text,
  modality                text,
  grade_level             text,
  us_grade_level          text,
  start_date              date,
  confirmation_text       text,
  director_signature_name text,
  director_signature_date date,
  issue_date              date DEFAULT CURRENT_DATE,
  status                  text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','published','archived')),
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enrollment_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_letters_admin_all      ON public.enrollment_letters;
DROP POLICY IF EXISTS rls_letters_parent_select  ON public.enrollment_letters;

-- Admin / coordinator: full access
CREATE POLICY rls_letters_admin_all ON public.enrollment_letters
  USING (is_admin_or_director());

-- Parents: only published letters for their children
CREATE POLICY rls_letters_parent_select ON public.enrollment_letters
  FOR SELECT USING (
    status = 'published'
    AND is_parent_of(student_id)
  );

-- ── PENDIENTE EDGE FUNCTION (no implementado en frontend) ──────────────────
--   · Cambio directo de contraseña de terceros  → requiere service_role
--   · Cambio de email de terceros               → requiere auth.admin.*
--   · Confirmación automática de email          → requiere service_role
--   · Firma digital criptográfica de Director   → Edge Function dedicada
-- ═══════════════════════════════════════════════════════════════════════════
