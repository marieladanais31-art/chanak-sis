-- ══════════════════════════════════════════════════════════════════════════════
-- Fase Cierre Operacional: enlaces, expediente digital, ajustes institucionales
-- Ejecutar en Supabase SQL Editor. 100 % idempotente.
-- No borra datos. No modifica RLS de tablas existentes.
-- No toca pagos, Stripe, DNS, SMTP ni autenticación.
-- ══════════════════════════════════════════════════════════════════════════════
--
-- FUNCIONES HELPER REQUERIDAS (ya existen en la DB desde migraciones anteriores):
--   public.get_current_user_role()   — rol del usuario autenticado
--   public.is_tutor_of(uuid)         — verifica students.tutor_id = auth.uid()
--   public.is_parent_of(uuid)        — verifica family_students.family_id
--
-- NOTA: public.is_coordinator_of(uuid) NO existe. La política de coordinator
--   se limita a enlaces globales (student_id IS NULL) por diseño seguro.
-- ══════════════════════════════════════════════════════════════════════════════


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 1: Columnas en students (expediente digital)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS drive_folder_url          text,
  ADD COLUMN IF NOT EXISTS expediente_visible_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expediente_visible_tutor  boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_students_drive_folder
  ON public.students (drive_folder_url)
  WHERE drive_folder_url IS NOT NULL;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 2: Columnas en institutional_settings (acreditación / año escolar)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.institutional_settings
  ADD COLUMN IF NOT EXISTS msa_status        text,
  ADD COLUMN IF NOT EXISTS active_school_year text,
  ADD COLUMN IF NOT EXISTS primary_language   text DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS document_footer    text;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 3: Tabla operational_links (recursos globales y por estudiante)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.operational_links (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text        NOT NULL,
  description    text,
  category       text        NOT NULL DEFAULT 'Otro',
  url            text        NOT NULL,
  visible_roles  text[]      NOT NULL DEFAULT '{admin,coordinator,tutor,parent,student}',
  is_active      boolean     NOT NULL DEFAULT true,
  display_order  integer     NOT NULL DEFAULT 0,
  student_id     uuid        REFERENCES public.students(id) ON DELETE CASCADE,
  created_by     uuid        REFERENCES auth.users(id),
  created_at     timestamptz NOT NULL DEFAULT NOW(),
  updated_at     timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operational_links_student
  ON public.operational_links (student_id)
  WHERE student_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operational_links_active
  ON public.operational_links (is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_operational_links_category
  ON public.operational_links (category);


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 4: CHECK constraint para categorías válidas
-- Patrón: DROP con EXCEPTION (idempotente) → ADD
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ BEGIN
  ALTER TABLE public.operational_links
    DROP CONSTRAINT IF EXISTS operational_links_category_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.operational_links
  ADD CONSTRAINT operational_links_category_check
  CHECK (category IN ('LMS', 'Drive', 'ACEConnect', 'Expediente', 'Interno', 'Otro'));


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 5: Función y trigger updated_at ESPECÍFICOS para operational_links
-- Se usa un nombre único para no sobrescribir ninguna función genérica existente.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.set_operational_links_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger idempotente: crea solo si no existe
DO $$ BEGIN
  CREATE TRIGGER trg_operational_links_updated_at
    BEFORE UPDATE ON public.operational_links
    FOR EACH ROW EXECUTE FUNCTION public.set_operational_links_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 6: RLS para operational_links
--
-- Reglas de diseño:
--   admin / super_admin → acceso total (CRUD)
--   coordinator         → SELECT solo enlaces GLOBALES (student_id IS NULL)
--                         Razón: is_coordinator_of() no existe; no se inventa.
--   tutor / mentor      → SELECT enlaces globales + enlaces de sus estudiantes
--                         (verificado con is_tutor_of que ya existe)
--   parent / family     → SELECT enlaces globales + enlaces de sus hijos
--                         (verificado con is_parent_of que ya existe)
--   student             → SELECT solo enlaces globales marcados para estudiantes
--
-- DROP POLICY IF EXISTS + CREATE POLICY = patrón idempotente estándar.
-- No toca políticas de ninguna otra tabla.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.operational_links ENABLE ROW LEVEL SECURITY;

-- ── Admin / super_admin: acceso total ────────────────────────────────────────
DROP POLICY IF EXISTS "op_links_admin_all" ON public.operational_links;
CREATE POLICY "op_links_admin_all"
  ON public.operational_links
  FOR ALL
  TO authenticated
  USING     (public.get_current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_current_user_role() IN ('admin', 'super_admin'));

-- ── Coordinator: solo enlaces globales (student_id IS NULL) ──────────────────
-- is_coordinator_of() no existe en esta DB → restricción conservadora.
DROP POLICY IF EXISTS "op_links_coordinator_read" ON public.operational_links;
CREATE POLICY "op_links_coordinator_read"
  ON public.operational_links
  FOR SELECT
  TO authenticated
  USING (
    is_active    = true
    AND student_id IS NULL
    AND public.get_current_user_role() = 'coordinator'
    AND 'coordinator' = ANY(visible_roles)
  );

-- ── Tutor / mentor: enlaces globales + enlaces de sus estudiantes asignados ──
DROP POLICY IF EXISTS "op_links_tutor_read" ON public.operational_links;
CREATE POLICY "op_links_tutor_read"
  ON public.operational_links
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.get_current_user_role() IN ('tutor', 'mentor')
    AND 'tutor' = ANY(visible_roles)
    AND (
      student_id IS NULL
      OR public.is_tutor_of(student_id)
    )
  );

-- ── Parent / family: enlaces globales + enlaces de sus hijos ─────────────────
DROP POLICY IF EXISTS "op_links_parent_read" ON public.operational_links;
CREATE POLICY "op_links_parent_read"
  ON public.operational_links
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.get_current_user_role() IN ('parent', 'family')
    AND 'parent' = ANY(visible_roles)
    AND (
      student_id IS NULL
      OR public.is_parent_of(student_id)
    )
  );

-- ── Student: solo enlaces globales marcados para estudiantes ─────────────────
DROP POLICY IF EXISTS "op_links_student_read" ON public.operational_links;
CREATE POLICY "op_links_student_read"
  ON public.operational_links
  FOR SELECT
  TO authenticated
  USING (
    is_active  = true
    AND student_id IS NULL
    AND public.get_current_user_role() = 'student'
    AND 'student' = ANY(visible_roles)
  );


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICACIÓN FINAL (solo lectura, no modifica nada)
-- Debe devolver las columnas nuevas en las tres tablas.
-- ━━━━━━:━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT * FROM (

  SELECT 'students' AS tabla, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'students'
    AND column_name  IN (
      'drive_folder_url',
      'expediente_visible_parent',
      'expediente_visible_tutor'
    )

  UNION ALL

  SELECT 'institutional_settings' AS tabla, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'institutional_settings'
    AND column_name  IN (
      'msa_status',
      'active_school_year',
      'primary_language',
      'document_footer'
    )

  UNION ALL

  SELECT 'operational_links' AS tabla, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'operational_links'

) q
ORDER BY tabla, column_name;
