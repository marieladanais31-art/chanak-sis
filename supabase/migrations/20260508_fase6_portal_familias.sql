-- ══════════════════════════════════════════════════════════════════════════════
-- Fase 6: Portal de Familias — tabla family_students + RLS idempotente
-- ══════════════════════════════════════════════════════════════════════════════
-- Idempotente: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS, ADD COLUMN IF NOT EXISTS

-- ── 1. Tabla family_students ─────────────────────────────────────────────────
-- family_id = auth.uid() del padre/tutor legal (profile de rol 'parent')
-- student_id = estudiante vinculado

CREATE TABLE IF NOT EXISTS public.family_students (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   uuid        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  student_id  uuid        NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  relationship text       DEFAULT 'parent',   -- parent | guardian | other
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (family_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_family_students_family   ON public.family_students (family_id);
CREATE INDEX IF NOT EXISTS idx_family_students_student  ON public.family_students (student_id);

ALTER TABLE public.family_students ENABLE ROW LEVEL SECURITY;

-- ── RLS family_students (idempotente) ─────────────────────────────────────────
DROP POLICY IF EXISTS "rls_family_students_admin_all"          ON public.family_students;
DROP POLICY IF EXISTS "rls_family_students_parent_select"      ON public.family_students;
DROP POLICY IF EXISTS "rls_family_students_coordinator_select" ON public.family_students;

CREATE POLICY "rls_family_students_admin_all"
  ON public.family_students AS PERMISSIVE FOR ALL TO authenticated
  USING (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

CREATE POLICY "rls_family_students_parent_select"
  ON public.family_students AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() = 'parent'
    AND family_id = auth.uid()
  );

CREATE POLICY "rls_family_students_coordinator_select"
  ON public.family_students AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.get_current_user_role() = 'coordinator');

-- ── 2. Función is_parent_of (CREATE OR REPLACE → idempotente) ────────────────
CREATE OR REPLACE FUNCTION public.is_parent_of(p_student_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_students fs
    WHERE fs.student_id = p_student_id
      AND fs.family_id  = auth.uid()
  )
$$;

-- ── 3. Asegurar columnas en students que el portal necesita ───────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS academic_year text    DEFAULT '2025-2026',
  ADD COLUMN IF NOT EXISTS school_stage  text    DEFAULT 'elementary';

-- ── 4. Nota sobre tablas legacy no creadas ────────────────────────────────────
-- Las tablas payment_status, document_records, student_pace_projection
-- son legacy/no implementadas. El frontend ParentDashboard maneja sus errores
-- de forma graceful (setea arrays vacíos si la tabla no existe).
-- No se crean aquí para no generar duplicados con posibles implementaciones futuras.
