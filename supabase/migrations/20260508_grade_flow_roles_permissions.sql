-- ══════════════════════════════════════════════════════════════════════════════
-- Flujo de notas por rol: RLS para student_grade_entries
-- ══════════════════════════════════════════════════════════════════════════════
-- Tabla: student_grade_entries
-- Columnas clave: id, student_subject_id, student_id, quarter, school_year,
--                 assessment_name, score, date_recorded, entry_order, created_at
--
-- Helpers disponibles (definidos en fase1 / fase4):
--   public.is_admin_or_director()  → admin, super_admin, director, coordinator
--   public.is_parent_of(uuid)      → verifica family_students.family_id
--   public.is_tutor_of(uuid)       → verifica students.tutor_id
--   public.get_current_user_role() → role del usuario actual
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.student_grade_entries ENABLE ROW LEVEL SECURITY;

-- ── Limpiar políticas previas (idempotente) ───────────────────────────────────
DROP POLICY IF EXISTS "rls_sge_admin_all"         ON public.student_grade_entries;
DROP POLICY IF EXISTS "rls_sge_tutor_all"         ON public.student_grade_entries;
DROP POLICY IF EXISTS "rls_sge_parent_all"        ON public.student_grade_entries;
DROP POLICY IF EXISTS "rls_sge_student_select"    ON public.student_grade_entries;

-- ── Admin + Coordinador: control total ───────────────────────────────────────
-- is_admin_or_director() incluye coordinator según fase4
CREATE POLICY "rls_sge_admin_all"
  ON public.student_grade_entries AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- ── Tutor/Mentor: CRUD sobre los estudiantes que tiene asignados ─────────────
-- Tutores pueden registrar, editar y eliminar notas parciales de sus alumnos.
-- No pueden modificar notas de estudiantes de otros tutores.
CREATE POLICY "rls_sge_tutor_all"
  ON public.student_grade_entries AS PERMISSIVE FOR ALL TO authenticated
  USING (
    public.get_current_user_role() IN ('tutor', 'mentor')
    AND public.is_tutor_of(student_id)
  )
  WITH CHECK (
    public.get_current_user_role() IN ('tutor', 'mentor')
    AND public.is_tutor_of(student_id)
  );

-- ── Padre/Familia: CRUD sobre los hijos que gestiona ─────────────────────────
-- Padres pueden ingresar notas en modo borrador (draft) y enviarlas a revisión.
-- Las notas quedan bloqueadas una vez submitted/approved (lógica en frontend).
CREATE POLICY "rls_sge_parent_all"
  ON public.student_grade_entries AS PERMISSIVE FOR ALL TO authenticated
  USING (
    public.get_current_user_role() IN ('parent', 'family')
    AND public.is_parent_of(student_id)
  )
  WITH CHECK (
    public.get_current_user_role() IN ('parent', 'family')
    AND public.is_parent_of(student_id)
  );

-- ── Estudiante: solo lectura de sus propias notas ────────────────────────────
CREATE POLICY "rls_sge_student_select"
  ON public.student_grade_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() = 'student'
    AND student_id = (
      SELECT id FROM public.students
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- Ajuste: grade_submission_status en student_subjects
-- Asegurar que la columna existe con el CHECK correcto (idempotente).
-- Ya definida en fase2, esta sección agrega columnas de auditoría si faltan.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.student_subjects
  ADD COLUMN IF NOT EXISTS grade_submission_status text DEFAULT 'draft'
    CHECK (grade_submission_status IN ('draft', 'submitted', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS grade_submitted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS grade_reviewed_at        timestamptz,
  ADD COLUMN IF NOT EXISTS grade_review_comment     text;

CREATE INDEX IF NOT EXISTS idx_student_subjects_grade_status
  ON public.student_subjects (grade_submission_status);
