-- ══════════════════════════════════════════════════════════════════════════════
-- Fase 5: Ficha completa de estudiante · Transcript anual · Asignaciones mensuales
-- ══════════════════════════════════════════════════════════════════════════════
-- Idempotente: usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / CREATE OR REPLACE

-- ── 1. Columnas de Ficha Completa en students ─────────────────────────────────

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS date_of_birth          date,
  ADD COLUMN IF NOT EXISTS nationality            text,
  ADD COLUMN IF NOT EXISTS id_document_type       text
    CHECK (id_document_type IN ('DNI','NIE','Pasaporte','Other')),
  ADD COLUMN IF NOT EXISTS id_document_number     text,
  ADD COLUMN IF NOT EXISTS gender                 text
    CHECK (gender IN ('M','F','Other')),
  ADD COLUMN IF NOT EXISTS address                text,
  ADD COLUMN IF NOT EXISTS city                   text,
  ADD COLUMN IF NOT EXISTS country                text DEFAULT 'España',
  ADD COLUMN IF NOT EXISTS phone                  text,
  ADD COLUMN IF NOT EXISTS student_email          text,
  -- Datos de contacto familiar
  ADD COLUMN IF NOT EXISTS parent1_name           text,
  ADD COLUMN IF NOT EXISTS parent1_relationship   text,
  ADD COLUMN IF NOT EXISTS parent1_phone          text,
  ADD COLUMN IF NOT EXISTS parent1_email          text,
  ADD COLUMN IF NOT EXISTS parent2_name           text,
  ADD COLUMN IF NOT EXISTS parent2_relationship   text,
  ADD COLUMN IF NOT EXISTS parent2_phone          text,
  ADD COLUMN IF NOT EXISTS parent2_email          text,
  -- Historial académico
  ADD COLUMN IF NOT EXISTS enrollment_date        date,
  ADD COLUMN IF NOT EXISTS last_school_name       text,
  ADD COLUMN IF NOT EXISTS last_grade_completed   text,
  ADD COLUMN IF NOT EXISTS us_grade_level         text,
  ADD COLUMN IF NOT EXISTS modality               text DEFAULT 'Off-Campus'
    CHECK (modality IN ('Off-Campus','Dual Diploma','On-Campus')),
  ADD COLUMN IF NOT EXISTS curriculum_base        text DEFAULT 'ACE',
  ADD COLUMN IF NOT EXISTS diagnostic_notes       text,
  ADD COLUMN IF NOT EXISTS vocational_interest    text,
  ADD COLUMN IF NOT EXISTS graduation_pathway_notes text,
  -- Dual Diploma
  ADD COLUMN IF NOT EXISTS dual_diploma_enrolled        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS dual_diploma_partner_school  text,
  ADD COLUMN IF NOT EXISTS dual_diploma_country         text,
  -- Admin
  ADD COLUMN IF NOT EXISTS student_status         text DEFAULT 'active'
    CHECK (student_status IN ('active','inactive','graduated','withdrawn')),
  ADD COLUMN IF NOT EXISTS admin_notes            text;

-- ── 2. Asignaciones mensuales (materias locales sin PACE) ────────────────────
-- Aplica a: Español, Life Skills, Physical Education, Arts

CREATE TABLE IF NOT EXISTS public.monthly_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_year   text NOT NULL,
  subject_name  text NOT NULL,
  month         integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  title         text NOT NULL,
  description   text,
  assigned_date date,
  due_date      date,
  submitted_date date,
  score         numeric(5,2) CHECK (score BETWEEN 0 AND 100),
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','graded')),
  feedback      text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monthly_student_year
  ON public.monthly_assignments (student_id, school_year);
CREATE INDEX IF NOT EXISTS idx_monthly_subject_month
  ON public.monthly_assignments (subject_name, month);

ALTER TABLE public.monthly_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_ma_admin_all    ON public.monthly_assignments;
DROP POLICY IF EXISTS rls_ma_tutor_select ON public.monthly_assignments;
DROP POLICY IF EXISTS rls_ma_tutor_insert ON public.monthly_assignments;
DROP POLICY IF EXISTS rls_ma_tutor_update ON public.monthly_assignments;
DROP POLICY IF EXISTS rls_ma_parent_select ON public.monthly_assignments;

CREATE POLICY rls_ma_admin_all ON public.monthly_assignments
  FOR ALL USING (public.is_admin_or_director());

CREATE POLICY rls_ma_tutor_select ON public.monthly_assignments
  FOR SELECT USING (public.is_tutor_of(student_id));

CREATE POLICY rls_ma_tutor_insert ON public.monthly_assignments
  FOR INSERT WITH CHECK (public.is_tutor_of(student_id));

CREATE POLICY rls_ma_tutor_update ON public.monthly_assignments
  FOR UPDATE USING (public.is_tutor_of(student_id));

CREATE POLICY rls_ma_parent_select ON public.monthly_assignments
  FOR SELECT USING (
    public.is_parent_of(student_id)
    AND status = 'graded'
  );

-- ── 3. Columnas vocacionales en individualized_education_plans ──────────────

ALTER TABLE public.individualized_education_plans
  ADD COLUMN IF NOT EXISTS vocational_interest       text,
  ADD COLUMN IF NOT EXISTS graduation_pathway_notes  text,
  ADD COLUMN IF NOT EXISTS pace_status_notes         text,
  ADD COLUMN IF NOT EXISTS strategic_objectives      text;

-- ── 4. Categoría de asignaturas en transcript_courses ───────────────────────

ALTER TABLE public.transcript_courses
  ADD COLUMN IF NOT EXISTS subject_category text DEFAULT 'core_ace'
    CHECK (subject_category IN ('core_ace','local_extension','life_skills','pe','arts')),
  ADD COLUMN IF NOT EXISTS is_local_subject boolean DEFAULT false;

-- ── 4. Función: PACEs vencidos (>21 días sin entregar) ──────────────────────

CREATE OR REPLACE FUNCTION public.get_overdue_paces(
  p_student_id uuid DEFAULT NULL
)
RETURNS TABLE (
  pace_id                 uuid,
  student_id              uuid,
  subject_name            text,
  pace_number             integer,
  school_year             text,
  quarter                 text,
  estimated_delivery_date date,
  days_overdue            integer,
  pace_status             text,
  tutor_notes             text
)
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT
    p.id,
    p.student_id,
    p.subject_name,
    p.pace_number,
    p.school_year,
    p.quarter,
    p.estimated_delivery_date,
    (CURRENT_DATE - p.estimated_delivery_date)::integer AS days_overdue,
    p.status,
    p.tutor_notes
  FROM public.pei_pace_projections p
  WHERE
    (p_student_id IS NULL OR p.student_id = p_student_id)
    AND p.estimated_delivery_date IS NOT NULL
    AND p.estimated_delivery_date < CURRENT_DATE - INTERVAL '21 days'
    AND p.status NOT IN ('delivered','evaluated','cancelled')
  ORDER BY p.estimated_delivery_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_overdue_paces(uuid)
  TO authenticated;

-- ── 5. Vista: resumen académico anual por estudiante ─────────────────────────
-- Agrega Q1+Q2+Q3 transcript_courses en un promedio anual por asignatura

CREATE OR REPLACE VIEW public.v_annual_subject_grades AS
SELECT
  tc.subject_name,
  tc.subject_category,
  tc.is_local_subject,
  tc.credits,
  tr.student_id,
  tr.school_year,
  MAX(CASE WHEN tr.quarter = 'Q1' THEN tc.final_grade END) AS q1_grade,
  MAX(CASE WHEN tr.quarter = 'Q2' THEN tc.final_grade END) AS q2_grade,
  MAX(CASE WHEN tr.quarter = 'Q3' THEN tc.final_grade END) AS q3_grade,
  ROUND(
    (
      COALESCE(MAX(CASE WHEN tr.quarter = 'Q1' THEN tc.final_grade END), 0) +
      COALESCE(MAX(CASE WHEN tr.quarter = 'Q2' THEN tc.final_grade END), 0) +
      COALESCE(MAX(CASE WHEN tr.quarter = 'Q3' THEN tc.final_grade END), 0)
    ) /
    NULLIF(
      (CASE WHEN MAX(CASE WHEN tr.quarter = 'Q1' THEN tc.final_grade END) IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN MAX(CASE WHEN tr.quarter = 'Q2' THEN tc.final_grade END) IS NOT NULL THEN 1 ELSE 0 END) +
      (CASE WHEN MAX(CASE WHEN tr.quarter = 'Q3' THEN tc.final_grade END) IS NOT NULL THEN 1 ELSE 0 END),
      0
    ), 2
  ) AS annual_grade
FROM public.transcript_courses tc
JOIN public.transcript_records tr ON tr.id = tc.transcript_id
WHERE tr.quarter IN ('Q1','Q2','Q3')
GROUP BY tc.subject_name, tc.subject_category, tc.is_local_subject, tc.credits, tr.student_id, tr.school_year;
