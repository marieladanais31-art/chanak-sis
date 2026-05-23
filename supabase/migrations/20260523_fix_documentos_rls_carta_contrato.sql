-- ══════════════════════════════════════════════════════════════════════════════
-- FIX COMPRENSIVO: contratos y cartas de matrícula
-- Problemas resueltos:
--   1. is_admin_or_director() no incluía 'director' → admin/director bloqueado
--   2. letter_language / letter_ref podrían no existir en enrollment_letters
--   3. enrollment_contracts status_check no incluía 'published'
--   4. RLS sin WITH CHECK en políticas de admin
--
-- 100 % idempotente. No borra datos. No toca pagos, DNS, SMTP ni auth.users.
-- ══════════════════════════════════════════════════════════════════════════════


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 1. HELPERS DE ROL — is_admin_or_director() ahora incluye 'director'
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

-- CRÍTICO: ahora incluye 'director' además de 'super_admin', 'admin', 'coordinator'
CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(public.get_current_user_role(), '')
         IN ('super_admin', 'admin', 'director', 'coordinator')
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


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 2. enrollment_letters — columnas faltantes + constraint correcto
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.enrollment_letters
  ADD COLUMN IF NOT EXISTS letter_language text DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS letter_ref      text;

-- Eliminar constraint anterior y recrear con todos los valores válidos
DO $$ BEGIN
  ALTER TABLE public.enrollment_letters
    DROP CONSTRAINT IF EXISTS enrollment_letters_letter_language_check;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.enrollment_letters
    ADD CONSTRAINT enrollment_letters_letter_language_check
    CHECK (letter_language IN ('es', 'en'));
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.enrollment_letters
    DROP CONSTRAINT IF EXISTS enrollment_letters_status_check;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.enrollment_letters
  ADD CONSTRAINT enrollment_letters_status_check
  CHECK (status IN ('draft', 'sent', 'signed', 'published', 'archived'));


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 3. enrollment_contracts — status constraint incluye 'published'
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$ BEGIN
  ALTER TABLE public.enrollment_contracts
    DROP CONSTRAINT IF EXISTS enrollment_contracts_status_check;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

ALTER TABLE public.enrollment_contracts
  ADD CONSTRAINT enrollment_contracts_status_check
  CHECK (status IN ('draft', 'sent', 'signed', 'published', 'archived'));


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 4. RLS enrollment_contracts — admin (WITH CHECK) + padres (sent/signed/published)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.enrollment_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_contracts_admin_all      ON public.enrollment_contracts;
DROP POLICY IF EXISTS rls_contracts_staff_all      ON public.enrollment_contracts;
DROP POLICY IF EXISTS rls_contracts_parent_select  ON public.enrollment_contracts;

CREATE POLICY rls_contracts_staff_all
  ON public.enrollment_contracts AS PERMISSIVE FOR ALL TO authenticated
  USING     (public.is_admin_or_director())
  WITH CHECK(public.is_admin_or_director());

CREATE POLICY rls_contracts_parent_select
  ON public.enrollment_contracts AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    status IN ('sent', 'signed', 'published')
    AND public.is_parent_of(student_id)
  );


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 5. RLS enrollment_letters — admin (WITH CHECK) + padres (sent/published)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.enrollment_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_letters_admin_all      ON public.enrollment_letters;
DROP POLICY IF EXISTS rls_letters_staff_all      ON public.enrollment_letters;
DROP POLICY IF EXISTS rls_letters_parent_select  ON public.enrollment_letters;

CREATE POLICY rls_letters_staff_all
  ON public.enrollment_letters AS PERMISSIVE FOR ALL TO authenticated
  USING     (public.is_admin_or_director())
  WITH CHECK(public.is_admin_or_director());

CREATE POLICY rls_letters_parent_select
  ON public.enrollment_letters AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    status IN ('sent', 'published')
    AND public.is_parent_of(student_id)
  );


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 6. GRANTS DE TABLA — el rol authenticated necesita privilegios explícitos
--    "permission denied for table" se produce cuando faltan estos GRANTs
--    aunque las políticas RLS sean correctas.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_contracts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_letters   TO authenticated;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICACIÓN — ejecuta esto después para confirmar que todo está correcto
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT 'tu_rol'        AS verificacion, get_current_user_role() AS valor;
SELECT 'es_admin'      AS verificacion, is_admin_or_director()  AS valor;

SELECT 'contratos_rls' AS verificacion, policyname, cmd
  FROM pg_policies WHERE tablename = 'enrollment_contracts' ORDER BY policyname;

SELECT 'cartas_rls'    AS verificacion, policyname, cmd
  FROM pg_policies WHERE tablename = 'enrollment_letters'   ORDER BY policyname;

SELECT 'cartas_cols'   AS verificacion, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'enrollment_letters'
  ORDER BY ordinal_position;
