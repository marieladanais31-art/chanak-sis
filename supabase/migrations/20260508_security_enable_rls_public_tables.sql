-- ══════════════════════════════════════════════════════════════════════════════
-- Seguridad: Habilitar RLS en tablas públicas (rls_disabled_in_public)
-- ══════════════════════════════════════════════════════════════════════════════
-- Idempotente: ENABLE ROW LEVEL SECURITY es seguro si ya está activo.
--              DROP POLICY IF EXISTS antes de cada CREATE POLICY.
--
-- Helpers disponibles (definidos en fase1 / fase4):
--   public.is_admin_or_director()  → admin, super_admin, director, coordinator
--   public.is_parent_of(uuid)      → verifica family_students.family_id = auth.uid()
--   public.is_tutor_of(uuid)       → verifica students.tutor_id = auth.uid()
--   public.get_current_user_role() → role del usuario actual
--
-- Clasificación de tablas:
--   CATÁLOGO  : sin student_id personal → lectura para autenticados, escritura solo admin
--   SENSIBLE  : tiene student_id/parent_id confirmados → acceso restringido por relación
--   ADMIN-ONLY: esquema no confirmado → solo admin hasta que se documente el schema
-- ══════════════════════════════════════════════════════════════════════════════


-- ── ① subjects ── (CATÁLOGO: subject_name, category, etc. Sin student_id) ────

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_subjects_admin_all"              ON public.subjects;
DROP POLICY IF EXISTS "rls_subjects_authenticated_select"   ON public.subjects;

-- Admin/coordinador: CRUD completo
CREATE POLICY "rls_subjects_admin_all"
  ON public.subjects AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- Tutores, padres, estudiantes: solo lectura (catálogo de materias)
CREATE POLICY "rls_subjects_authenticated_select"
  ON public.subjects AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');


-- ── ② grade_subject_templates ── (CATÁLOGO: plantillas por grado, sin student_id) ─

ALTER TABLE public.grade_subject_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_gst_admin_all"            ON public.grade_subject_templates;
DROP POLICY IF EXISTS "rls_gst_authenticated_select" ON public.grade_subject_templates;

CREATE POLICY "rls_gst_admin_all"
  ON public.grade_subject_templates AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

CREATE POLICY "rls_gst_authenticated_select"
  ON public.grade_subject_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING (auth.role() = 'authenticated');


-- ── ③ student_grades ── (SENSIBLE: student_id confirmado) ────────────────────

ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_student_grades_admin_all"      ON public.student_grades;
DROP POLICY IF EXISTS "rls_student_grades_parent_select"  ON public.student_grades;
DROP POLICY IF EXISTS "rls_student_grades_tutor_all"      ON public.student_grades;

-- Admin + coordinador: acceso total (is_admin_or_director incluye coordinator)
CREATE POLICY "rls_student_grades_admin_all"
  ON public.student_grades AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- Padre/familia: solo lectura de sus propios hijos
CREATE POLICY "rls_student_grades_parent_select"
  ON public.student_grades AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() IN ('parent', 'family')
    AND public.is_parent_of(student_id)
  );

-- Tutor: lectura e inserción de los estudiantes que tiene asignados
CREATE POLICY "rls_student_grades_tutor_all"
  ON public.student_grades AS PERMISSIVE FOR ALL TO authenticated
  USING (
    public.get_current_user_role() IN ('tutor', 'mentor')
    AND public.is_tutor_of(student_id)
  )
  WITH CHECK (
    public.get_current_user_role() IN ('tutor', 'mentor')
    AND public.is_tutor_of(student_id)
  );


-- ── ④ document_records ── (SENSIBLE: student_id confirmado) ──────────────────

ALTER TABLE public.document_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_document_records_admin_all"     ON public.document_records;
DROP POLICY IF EXISTS "rls_document_records_parent_select" ON public.document_records;
DROP POLICY IF EXISTS "rls_document_records_tutor_select"  ON public.document_records;

-- Admin + coordinador: CRUD completo
CREATE POLICY "rls_document_records_admin_all"
  ON public.document_records AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- Padre: lectura de documentos de sus hijos
CREATE POLICY "rls_document_records_parent_select"
  ON public.document_records AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() IN ('parent', 'family')
    AND public.is_parent_of(student_id)
  );

-- Tutor: lectura de documentos de sus estudiantes asignados
CREATE POLICY "rls_document_records_tutor_select"
  ON public.document_records AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() IN ('tutor', 'mentor')
    AND public.is_tutor_of(student_id)
  );


-- ── ⑤ payment_status ── (SENSIBLE: student_id, datos financieros) ────────────

ALTER TABLE public.payment_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_payment_status_admin_all"     ON public.payment_status;
DROP POLICY IF EXISTS "rls_payment_status_parent_select" ON public.payment_status;

-- Admin + coordinador: CRUD completo
CREATE POLICY "rls_payment_status_admin_all"
  ON public.payment_status AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- Padre: solo lectura del estado de pago de sus hijos
-- Tutores NO tienen acceso a datos financieros
CREATE POLICY "rls_payment_status_parent_select"
  ON public.payment_status AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() IN ('parent', 'family')
    AND public.is_parent_of(student_id)
  );


-- ── ⑥ signatures ── (SENSIBLE: student_id + parent_id confirmados) ───────────

ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_signatures_admin_all"      ON public.signatures;
DROP POLICY IF EXISTS "rls_signatures_parent_select"  ON public.signatures;
DROP POLICY IF EXISTS "rls_signatures_parent_insert"  ON public.signatures;

-- Admin + coordinador: CRUD completo (auditoría de firmas)
CREATE POLICY "rls_signatures_admin_all"
  ON public.signatures AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- Padre: lectura de sus propias firmas (parent_id = auth.uid())
CREATE POLICY "rls_signatures_parent_select"
  ON public.signatures AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() IN ('parent', 'family')
    AND parent_id = auth.uid()
  );

-- Padre: inserción solo con su propio parent_id (no puede firmar por otro)
CREATE POLICY "rls_signatures_parent_insert"
  ON public.signatures AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    public.get_current_user_role() IN ('parent', 'family')
    AND parent_id = auth.uid()
    AND public.is_parent_of(student_id)
  );


-- ── ⑦ enrollments ── (ADMIN-ONLY: esquema no confirmado en frontend) ──────────
-- Schema desconocido. Admin-only hasta documentar columnas de acceso.
-- Si tiene student_id, agregar políticas de parent/tutor en futura migración.

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_enrollments_admin_all" ON public.enrollments;

CREATE POLICY "rls_enrollments_admin_all"
  ON public.enrollments AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());


-- ── ⑧ student_contract_ack ── (ADMIN-ONLY: esquema no confirmado) ─────────────
-- Schema desconocido. Admin-only hasta documentar columnas de acceso.

ALTER TABLE public.student_contract_ack ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_student_contract_ack_admin_all" ON public.student_contract_ack;

CREATE POLICY "rls_student_contract_ack_admin_all"
  ON public.student_contract_ack AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());


-- ── ⑨ student_pace_projection ── (ADMIN-ONLY: tabla referenciada como legacy) ─
-- Marcada como "legacy/no implementada" en fase6. Admin-only por precaución.

ALTER TABLE public.student_pace_projection ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_student_pace_projection_admin_all" ON public.student_pace_projection;

CREATE POLICY "rls_student_pace_projection_admin_all"
  ON public.student_pace_projection AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());


-- ── ⑩ user_documents ── (ADMIN-ONLY: esquema no confirmado en frontend) ────────
-- Schema desconocido. Admin-only hasta documentar columnas de acceso.
-- Si tiene user_id, agregar "user_id = auth.uid()" en futura migración.

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_user_documents_admin_all" ON public.user_documents;

CREATE POLICY "rls_user_documents_admin_all"
  ON public.user_documents AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());
