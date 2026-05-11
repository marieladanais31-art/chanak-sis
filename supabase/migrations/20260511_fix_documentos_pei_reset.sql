-- ══════════════════════════════════════════════════════════════════════════════
-- Fix documental crítico: contratos, cartas, boletines, PEI y PACEs
-- Idempotente. No borra datos. No toca pagos, Stripe, auth.users, DNS/SMTP.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Helpers robustos para perfiles legacy (profiles.id = auth.uid()) y modernos
--    (profiles.user_id = auth.uid()). Varias políticas anteriores dependían solo
--    de profiles.id y causaban 42501 para usuarios reales con user_id poblado.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.user_id = auth.uid() OR p.id = auth.uid()
  ORDER BY CASE WHEN p.user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(public.get_current_user_role(), '') IN ('super_admin', 'admin', 'coordinator')
$$;

CREATE OR REPLACE FUNCTION public.current_profile_ids()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT auth.uid()
  WHERE auth.uid() IS NOT NULL
  UNION
  SELECT p.id
  FROM public.profiles p
  WHERE p.user_id = auth.uid() OR p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_parent_of(p_student_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_students fs
    WHERE fs.student_id = p_student_id
      AND fs.family_id IN (SELECT id FROM public.current_profile_ids() AS id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_tutor_of(p_student_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = p_student_id
      AND s.tutor_id IN (SELECT id FROM public.current_profile_ids() AS id)
  )
$$;

CREATE OR REPLACE FUNCTION public.is_coordinator_for(p_student_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.profiles p ON (p.user_id = auth.uid() OR p.id = auth.uid())
    WHERE s.id = p_student_id
      AND p.role = 'coordinator'
      AND (p.hub_id IS NULL OR s.hub_id = p.hub_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_student_academic_docs(p_student_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT public.is_admin_or_director()
      OR public.is_coordinator_for(p_student_id)
      OR public.is_tutor_of(p_student_id)
$$;

-- ── Columnas usadas por frontend documental y faltantes en migraciones previas.
ALTER TABLE public.enrollment_letters
  ADD COLUMN IF NOT EXISTS letter_language text DEFAULT 'es' CHECK (letter_language IN ('es','en')),
  ADD COLUMN IF NOT EXISTS letter_ref text;

ALTER TABLE public.transcript_courses
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ── Contratos: admin/super_admin/coordinator gestionan; padres leen sent/signed.
ALTER TABLE public.enrollment_contracts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_contracts_admin_all ON public.enrollment_contracts;
DROP POLICY IF EXISTS rls_contracts_parent_select ON public.enrollment_contracts;
DROP POLICY IF EXISTS rls_contracts_staff_all ON public.enrollment_contracts;

CREATE POLICY rls_contracts_staff_all
  ON public.enrollment_contracts AS PERMISSIVE FOR ALL TO authenticated
  USING (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

CREATE POLICY rls_contracts_parent_select
  ON public.enrollment_contracts AS PERMISSIVE FOR SELECT TO authenticated
  USING (status IN ('sent', 'signed') AND public.is_parent_of(student_id));

-- ── Cartas de matrícula: admin/super_admin/coordinator gestionan; padres published.
ALTER TABLE public.enrollment_letters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_letters_admin_all ON public.enrollment_letters;
DROP POLICY IF EXISTS rls_letters_parent_select ON public.enrollment_letters;
DROP POLICY IF EXISTS rls_letters_staff_all ON public.enrollment_letters;

CREATE POLICY rls_letters_staff_all
  ON public.enrollment_letters AS PERMISSIVE FOR ALL TO authenticated
  USING (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

CREATE POLICY rls_letters_parent_select
  ON public.enrollment_letters AS PERMISSIVE FOR SELECT TO authenticated
  USING (status = 'published' AND public.is_parent_of(student_id));

-- ── PEI: staff académico asignado puede crear/editar; padres solo published.
ALTER TABLE public.individualized_education_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_iep_select_admin ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_select_tutor ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_select_parent ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_insert_admin ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_update_admin ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_staff_select ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_staff_insert ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_staff_update ON public.individualized_education_plans;
DROP POLICY IF EXISTS rls_iep_parent_select ON public.individualized_education_plans;

CREATE POLICY rls_iep_staff_select
  ON public.individualized_education_plans AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.can_manage_student_academic_docs(student_id));

CREATE POLICY rls_iep_staff_insert
  ON public.individualized_education_plans AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_student_academic_docs(student_id));

CREATE POLICY rls_iep_staff_update
  ON public.individualized_education_plans AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.can_manage_student_academic_docs(student_id))
  WITH CHECK (public.can_manage_student_academic_docs(student_id));

CREATE POLICY rls_iep_parent_select
  ON public.individualized_education_plans AS PERMISSIVE FOR SELECT TO authenticated
  USING (status = 'published' AND public.is_parent_of(student_id));

-- ── PACEs: coordinator/tutor pueden crear/editar proyección de sus estudiantes.
ALTER TABLE public.pei_pace_projections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_pace_select_admin ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_select_tutor ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_select_parent ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_insert_admin ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_update_admin ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_update_tutor ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_staff_select ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_staff_insert ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_staff_update ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_staff_delete ON public.pei_pace_projections;
DROP POLICY IF EXISTS rls_pace_parent_select ON public.pei_pace_projections;

CREATE POLICY rls_pace_staff_select
  ON public.pei_pace_projections AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.can_manage_student_academic_docs(student_id));

CREATE POLICY rls_pace_staff_insert
  ON public.pei_pace_projections AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_student_academic_docs(student_id));

CREATE POLICY rls_pace_staff_update
  ON public.pei_pace_projections AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.can_manage_student_academic_docs(student_id))
  WITH CHECK (public.can_manage_student_academic_docs(student_id));

CREATE POLICY rls_pace_staff_delete
  ON public.pei_pace_projections AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.can_manage_student_academic_docs(student_id));

CREATE POLICY rls_pace_parent_select
  ON public.pei_pace_projections AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.is_parent_of(student_id)
    AND EXISTS (
      SELECT 1
      FROM public.individualized_education_plans iep
      WHERE iep.id = pei_id AND iep.status = 'published'
    )
  );

-- ── Boletines: admin/coordinator gestionan; cursos soportan reemplazo delete+insert.
ALTER TABLE public.transcript_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tr_select_admin ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_select_tutor ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_select_parent ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_insert_admin ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_update_admin ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_staff_select ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_staff_insert ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_staff_update ON public.transcript_records;
DROP POLICY IF EXISTS rls_tr_parent_select ON public.transcript_records;

CREATE POLICY rls_tr_staff_select
  ON public.transcript_records AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_admin_or_director() OR public.is_tutor_of(student_id));

CREATE POLICY rls_tr_staff_insert
  ON public.transcript_records AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_director());

CREATE POLICY rls_tr_staff_update
  ON public.transcript_records AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

CREATE POLICY rls_tr_parent_select
  ON public.transcript_records AS PERMISSIVE FOR SELECT TO authenticated
  USING (status = 'published' AND public.is_parent_of(student_id));

ALTER TABLE public.transcript_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_tc_select_admin ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_select_tutor ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_select_parent ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_insert_admin ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_staff_select ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_staff_insert ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_staff_update ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_staff_delete ON public.transcript_courses;
DROP POLICY IF EXISTS rls_tc_parent_select ON public.transcript_courses;

CREATE POLICY rls_tc_staff_select
  ON public.transcript_courses AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transcript_records tr
      WHERE tr.id = transcript_id
        AND (public.is_admin_or_director() OR public.is_tutor_of(tr.student_id))
    )
  );

CREATE POLICY rls_tc_staff_insert
  ON public.transcript_courses AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transcript_records tr
      WHERE tr.id = transcript_id AND public.is_admin_or_director()
    )
  );

CREATE POLICY rls_tc_staff_update
  ON public.transcript_courses AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transcript_records tr
      WHERE tr.id = transcript_id AND public.is_admin_or_director()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.transcript_records tr
      WHERE tr.id = transcript_id AND public.is_admin_or_director()
    )
  );

CREATE POLICY rls_tc_staff_delete
  ON public.transcript_courses AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transcript_records tr
      WHERE tr.id = transcript_id AND public.is_admin_or_director()
    )
  );

CREATE POLICY rls_tc_parent_select
  ON public.transcript_courses AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.transcript_records tr
      WHERE tr.id = transcript_id
        AND tr.status = 'published'
        AND public.is_parent_of(tr.student_id)
    )
  );
