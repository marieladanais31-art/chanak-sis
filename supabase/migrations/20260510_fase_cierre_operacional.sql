-- ══════════════════════════════════════════════════════════════════════════════
-- Fase Cierre Operacional: enlaces, expediente digital, ajustes institucionales
-- Ejecutar en Supabase SQL Editor. 100 % idempotente.
-- No borra datos. No modifica RLS existente.
-- ══════════════════════════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 1: Columnas en students (expediente digital)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS drive_folder_url         text,
  ADD COLUMN IF NOT EXISTS expediente_visible_parent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expediente_visible_tutor  boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_students_drive_folder
  ON public.students (drive_folder_url)
  WHERE drive_folder_url IS NOT NULL;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 2: Columnas en institutional_settings (acreditación / año escolar)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.institutional_settings
  ADD COLUMN IF NOT EXISTS msa_status       text,
  ADD COLUMN IF NOT EXISTS active_school_year text,
  ADD COLUMN IF NOT EXISTS primary_language  text DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS document_footer   text;


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

-- CHECK constraint para categorías válidas
DO $$ BEGIN
  ALTER TABLE public.operational_links
    DROP CONSTRAINT IF EXISTS operational_links_category_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.operational_links
  ADD CONSTRAINT operational_links_category_check
  CHECK (category IN ('LMS','Drive','ACEConnect','Expediente','Interno','Otro'));

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_operational_links_updated_at
    BEFORE UPDATE ON public.operational_links
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 4: RLS para operational_links
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.operational_links ENABLE ROW LEVEL SECURITY;

-- Admin / super_admin: acceso total
DROP POLICY IF EXISTS "op_links_admin_all"  ON public.operational_links;
CREATE POLICY "op_links_admin_all"
  ON public.operational_links
  FOR ALL
  TO authenticated
  USING (public.get_current_user_role() IN ('admin', 'super_admin'))
  WITH CHECK (public.get_current_user_role() IN ('admin', 'super_admin'));

-- Coordinator: lectura de enlaces globales y de sus estudiantes
DROP POLICY IF EXISTS "op_links_coordinator_read" ON public.operational_links;
CREATE POLICY "op_links_coordinator_read"
  ON public.operational_links
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.get_current_user_role() = 'coordinator'
    AND 'coordinator' = ANY(visible_roles)
  );

-- Tutor: lectura de enlaces globales o de estudiantes asignados
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

-- Parent: lectura de enlaces globales o de sus hijos
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

-- Student: lectura de enlaces globales para estudiantes
DROP POLICY IF EXISTS "op_links_student_read" ON public.operational_links;
CREATE POLICY "op_links_student_read"
  ON public.operational_links
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND public.get_current_user_role() = 'student'
    AND 'student' = ANY(visible_roles)
    AND student_id IS NULL
  );


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICACIÓN FINAL (solo lectura)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT * FROM (
  SELECT 'students' AS tabla, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'students'
    AND column_name  IN ('drive_folder_url','expediente_visible_parent','expediente_visible_tutor')

  UNION ALL

  SELECT 'institutional_settings' AS tabla, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'institutional_settings'
    AND column_name  IN ('msa_status','active_school_year','primary_language','document_footer')

  UNION ALL

  SELECT 'operational_links' AS tabla, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'operational_links'
) q
ORDER BY tabla, column_name;
