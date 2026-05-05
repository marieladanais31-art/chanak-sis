-- ═══════════════════════════════════════════════════════════════════════════
-- Fase 4: PEI completo · Proyección PACEs · Alertas · Boletines · Créditos
-- Migración 100 % idempotente — no borra datos existentes
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0. Funciones helper (CREATE OR REPLACE → idempotente) ───────────────────

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()), ''
  ) IN ('super_admin', 'admin', 'coordinator')
$$;

-- Cubre: students.parent_id (relación directa) Y family_students (relación familiar)
CREATE OR REPLACE FUNCTION public.is_parent_of(p_student_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id AND s.parent_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.family_students fs
    JOIN public.families f ON fs.family_id = f.id
    WHERE fs.student_id = p_student_id AND f.parent_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tutor_of(p_student_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = p_student_id AND s.tutor_id = auth.uid()
  )
$$;

-- ── 1. Configuración institucional ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.institutional_settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name      text NOT NULL DEFAULT 'Chanak International Academy',
  legal_name            text,
  fldoe_registration    text DEFAULT '134620',
  address               text,
  city                  text,
  state_province        text DEFAULT 'Florida',
  country               text DEFAULT 'USA',
  phone                 text,
  email                 text,
  website               text DEFAULT 'https://www.chanakacademy.org',
  director_name         text,
  director_title        text DEFAULT 'Director',
  -- PENDIENTE EDGE FUNCTION: firma digital criptográfica
  director_signature_url text,
  logo_url              text,
  seal_url              text,
  legal_text_es         text DEFAULT 'Este documento es emitido por Chanak International Academy, institución registrada ante el Florida Department of Education (FLDOE #134620).',
  legal_text_en         text DEFAULT 'This document is issued by Chanak International Academy, registered with the Florida Department of Education (FLDOE #134620).',
  apostille_text        text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Fila única por defecto
INSERT INTO public.institutional_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.institutional_settings);

ALTER TABLE public.institutional_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_settings_select_auth   ON public.institutional_settings;
DROP POLICY IF EXISTS rls_settings_update_admin  ON public.institutional_settings;

CREATE POLICY rls_settings_select_auth ON public.institutional_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY rls_settings_update_admin ON public.institutional_settings
  FOR UPDATE USING (public.is_admin_or_director());

-- ── 2. PEI Individualizado ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.individualized_education_plans (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_by              uuid REFERENCES auth.users(id),
  reviewed_by             uuid REFERENCES auth.users(id),
  approved_by             uuid REFERENCES auth.users(id),
  published_by            uuid REFERENCES auth.users(id),
  school_year             text NOT NULL DEFAULT '2025-2026',
  quarter                 text CHECK (quarter IN ('Q1','Q2','Q3','Q4','Annual')),
  issue_date              date DEFAULT CURRENT_DATE,
  -- Datos del estudiante (desnormalizados para PDF)
  student_code            text,
  grade_level             text,
  -- Diagnóstico académico
  initial_diagnosis       text,
  diagnostic_results      text,
  strength_areas          text,
  improvement_areas       text,
  -- Objetivos y plan
  quarterly_objectives    text,
  subject_plan            text,
  -- Apoyos
  required_adaptations    text,
  follow_up_strategies    text,
  -- Coordinador
  coordinator_observations text,
  coordinator_name        text,
  -- Estado del PEI
  status                  text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','approved','published')),
  -- Timestamps de flujo
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  approved_at  timestamptz,
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_iep_student_year
  ON public.individualized_education_plans (student_id, school_year);
CREATE INDEX IF NOT EXISTS idx_iep_status
  ON public.individualized_education_plans (status);

ALTER TABLE public.individualized_education_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_iep_select_admin  ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_select_tutor  ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_select_parent ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_insert_admin  ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_update_admin  ON public.individualized_education_plans;

CREATE POLICY rls_iep_select_admin ON public.individualized_education_plans
  FOR SELECT USING (public.is_admin_or_director());

CREATE POLICY rls_iep_select_tutor ON public.individualized_education_plans
  FOR SELECT USING (public.is_tutor_of(student_id));

-- Padres solo ven PEI publicados de sus hijos
CREATE POLICY rls_iep_select_parent ON public.individualized_education_plans
  FOR SELECT USING (
    status = 'published' AND public.is_parent_of(student_id)
  );

CREATE POLICY rls_iep_insert_admin ON public.individualized_education_plans
  FOR INSERT WITH CHECK (public.is_admin_or_director());

CREATE POLICY rls_iep_update_admin ON public.individualized_education_plans
  FOR UPDATE USING (public.is_admin_or_director());

-- ── 3. Proyección de PACEs por número ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pei_pace_projections (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pei_id                  uuid NOT NULL
    REFERENCES public.individualized_education_plans(id) ON DELETE CASCADE,
  student_id              uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_name            text NOT NULL,
  pace_number             integer NOT NULL,
  grade_level             text,
  school_year             text NOT NULL,
  quarter                 text NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  estimated_start_date    date,
  estimated_delivery_date date,
  actual_delivery_date    date,
  -- Posibles estados del PACE
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','delivered','evaluated','delayed','cancelled')),
  grade_obtained          numeric(5,2),
  tutor_notes             text,
  coordinator_notes       text,
  student_subject_id      uuid REFERENCES public.student_subjects(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pei_pace_pei_id
  ON public.pei_pace_projections (pei_id);
CREATE INDEX IF NOT EXISTS idx_pei_pace_student_quarter
  ON public.pei_pace_projections (student_id, quarter, school_year);
CREATE INDEX IF NOT EXISTS idx_pei_pace_status_delivery
  ON public.pei_pace_projections (status, estimated_delivery_date);

ALTER TABLE public.pei_pace_projections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_pace_select_admin  ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_select_tutor  ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_select_parent ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_insert_admin  ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_update_admin  ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_update_tutor  ON public.pei_pace_projections;

CREATE POLICY rls_pace_select_admin ON public.pei_pace_projections
  FOR SELECT USING (public.is_admin_or_director());

CREATE POLICY rls_pace_select_tutor ON public.pei_pace_projections
  FOR SELECT USING (public.is_tutor_of(student_id));

-- Padres ven PACEs solo si el PEI padre está publicado
CREATE POLICY rls_pace_select_parent ON public.pei_pace_projections
  FOR SELECT USING (
    public.is_parent_of(student_id)
    AND EXISTS (
      SELECT 1 FROM public.individualized_education_plans iep
      WHERE iep.id = pei_id AND iep.status = 'published'
    )
  );

CREATE POLICY rls_pace_insert_admin ON public.pei_pace_projections
  FOR INSERT WITH CHECK (public.is_admin_or_director());

CREATE POLICY rls_pace_update_admin ON public.pei_pace_projections
  FOR UPDATE USING (public.is_admin_or_director());

-- Tutores pueden actualizar estado y notas de PACEs de sus estudiantes
CREATE POLICY rls_pace_update_tutor ON public.pei_pace_projections
  FOR UPDATE USING (public.is_tutor_of(student_id));

-- ── 4. Alertas académicas ──────────────────────────────────────────────────
-- NOTA: la creación automática de alertas (cron por PACEs vencidos, emails)
-- requiere una Edge Function de Supabase → PENDIENTE BACKEND.
-- Desde el frontend se crean alertas on-demand y se consultan en tiempo real.

CREATE TABLE IF NOT EXISTS public.academic_alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  alert_type    text NOT NULL CHECK (
    alert_type IN (
      'pace_overdue','grade_pending_review','bulletin_ready',
      'pei_published','grade_missing','pei_ready'
    )
  ),
  message       text NOT NULL,
  severity      text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','critical')),
  status        text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','resolved','ignored')),
  target_role   text CHECK (target_role IN ('tutor','coordinator','admin','parent')),
  target_user_id uuid REFERENCES auth.users(id),
  context_id    uuid,
  context_type  text CHECK (context_type IN ('pace','transcript','pei','grade')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_alerts_student_status
  ON public.academic_alerts (student_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_target
  ON public.academic_alerts (target_role, status);

ALTER TABLE public.academic_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_alerts_select_admin  ON public.academic_alerts;
DROP POLICY IF EXISTS rls_alerts_select_role   ON public.academic_alerts;
DROP POLICY IF EXISTS rls_alerts_insert_staff  ON public.academic_alerts;
DROP POLICY IF EXISTS rls_alerts_update_staff  ON public.academic_alerts;

CREATE POLICY rls_alerts_select_admin ON public.academic_alerts
  FOR SELECT USING (public.is_admin_or_director());

CREATE POLICY rls_alerts_select_role ON public.academic_alerts
  FOR SELECT USING (
    target_user_id = auth.uid()
    OR (target_role = 'tutor'  AND public.is_tutor_of(student_id)  AND public.get_current_user_role() = 'tutor')
    OR (target_role = 'parent' AND public.is_parent_of(student_id) AND public.get_current_user_role() = 'parent')
  );

CREATE POLICY rls_alerts_insert_staff ON public.academic_alerts
  FOR INSERT WITH CHECK (
    public.is_admin_or_director()
    OR public.get_current_user_role() = 'tutor'
  );

CREATE POLICY rls_alerts_update_staff ON public.academic_alerts
  FOR UPDATE USING (
    public.is_admin_or_director()
    OR target_user_id = auth.uid()
    OR (target_role = 'tutor' AND public.is_tutor_of(student_id))
  );

-- ── 5. Registros de boletines / transcripts ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transcript_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year           text NOT NULL,
  quarter               text NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4','Annual')),
  language              text NOT NULL DEFAULT 'es' CHECK (language IN ('es','en')),
  status                text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','approved','published','unpublished')),
  generated_by          uuid REFERENCES auth.users(id),
  reviewed_by           uuid REFERENCES auth.users(id),
  published_by          uuid REFERENCES auth.users(id),
  total_credits         numeric(5,2) DEFAULT 0,
  gpa                   numeric(4,2),
  academic_observations text,
  director_name         text,
  -- PENDIENTE EDGE FUNCTION: email automático al padre al publicar
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz,
  published_at timestamptz,
  UNIQUE (student_id, school_year, quarter, language)
);

CREATE INDEX IF NOT EXISTS idx_transcript_student_status
  ON public.transcript_records (student_id, status, school_year);

ALTER TABLE public.transcript_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tr_select_admin  ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_select_tutor  ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_select_parent ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_insert_admin  ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_update_admin  ON public.transcript_records;

CREATE POLICY rls_tr_select_admin ON public.transcript_records
  FOR SELECT USING (public.is_admin_or_director());

CREATE POLICY rls_tr_select_tutor ON public.transcript_records
  FOR SELECT USING (public.is_tutor_of(student_id));

CREATE POLICY rls_tr_select_parent ON public.transcript_records
  FOR SELECT USING (
    status = 'published' AND public.is_parent_of(student_id)
  );

CREATE POLICY rls_tr_insert_admin ON public.transcript_records
  FOR INSERT WITH CHECK (public.is_admin_or_director());

CREATE POLICY rls_tr_update_admin ON public.transcript_records
  FOR UPDATE USING (public.is_admin_or_director());

-- ── 6. Cursos dentro de cada boletín ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.transcript_courses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id       uuid NOT NULL
    REFERENCES public.transcript_records(id) ON DELETE CASCADE,
  student_subject_id  uuid REFERENCES public.student_subjects(id),
  subject_name        text NOT NULL,
  academic_block      text,
  pace_numbers        text,       -- ej. "101,102,103"
  credits             numeric(4,2) DEFAULT 0.5,
  final_grade         numeric(5,2),
  grade_status        text DEFAULT 'pending'
    CHECK (grade_status IN ('pending','approved','failed')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tc_transcript
  ON public.transcript_courses (transcript_id);

ALTER TABLE public.transcript_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tc_select_admin  ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_select_tutor  ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_select_parent ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_insert_admin  ON public.transcript_courses;

CREATE POLICY rls_tc_select_admin ON public.transcript_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transcript_records tr
      WHERE tr.id = transcript_id AND public.is_admin_or_director()
    )
  );

CREATE POLICY rls_tc_select_tutor ON public.transcript_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transcript_records tr
      WHERE tr.id = transcript_id AND public.is_tutor_of(tr.student_id)
    )
  );

CREATE POLICY rls_tc_select_parent ON public.transcript_courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transcript_records tr
      WHERE tr.id = transcript_id
        AND tr.status = 'published'
        AND public.is_parent_of(tr.student_id)
    )
  );

CREATE POLICY rls_tc_insert_admin ON public.transcript_courses
  FOR INSERT WITH CHECK (public.is_admin_or_director());

-- ── 7. Créditos acumulados desde 9º grado ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.student_credits_summary (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  grade_level         text NOT NULL,   -- '9','10','11','12'
  school_year         text NOT NULL,
  quarter             text NOT NULL CHECK (quarter IN ('Q1','Q2','Q3','Q4')),
  credits_earned      numeric(5,2) DEFAULT 0,
  credits_attempted   numeric(5,2) DEFAULT 0,
  gpa_quarter         numeric(4,2),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, grade_level, school_year, quarter)
);

ALTER TABLE public.student_credits_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_credits_select_admin  ON public.student_credits_summary;
DROP POLICY IF EXISTS rls_credits_select_parent ON public.student_credits_summary;
DROP POLICY IF EXISTS rls_credits_insert_admin  ON public.student_credits_summary;
DROP POLICY IF EXISTS rls_credits_update_admin  ON public.student_credits_summary;

CREATE POLICY rls_credits_select_admin ON public.student_credits_summary
  FOR SELECT USING (public.is_admin_or_director());

CREATE POLICY rls_credits_select_parent ON public.student_credits_summary
  FOR SELECT USING (public.is_parent_of(student_id));

CREATE POLICY rls_credits_insert_admin ON public.student_credits_summary
  FOR INSERT WITH CHECK (public.is_admin_or_director());

CREATE POLICY rls_credits_update_admin ON public.student_credits_summary
  FOR UPDATE USING (public.is_admin_or_director());
