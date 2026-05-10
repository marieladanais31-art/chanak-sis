-- ══════════════════════════════════════════════════════════════════════════════
-- Fix: is_parent_of() y family_students RLS para perfiles modernos
--
-- Problema: is_parent_of() y la política family_students_parent_select
--   usaban `family_id = auth.uid()`. Esto solo funciona para perfiles legacy
--   donde profiles.id = auth.uid(). En perfiles modernos:
--     - profiles.user_id = auth.uid()
--     - profiles.id      = UUID distinto
--     - family_students.family_id referencia profiles.id (el UUID distinto)
--   → auth.uid() ≠ family_id → parent no puede ver a sus hijos.
--
-- Solución: ampliar las verificaciones para buscar también por
--   profiles.id WHERE profiles.user_id = auth.uid().
--
-- También:
--   - family_students policy: añadir soporte a rol 'family' (alias de 'parent')
--   - is_parent_of(): idem
--
-- Idempotente: CREATE OR REPLACE + DROP POLICY IF EXISTS + CREATE POLICY.
-- No borra datos. No toca pagos, DNS, SMTP, auth.users ni Stripe.
-- ══════════════════════════════════════════════════════════════════════════════


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 1: Corregir is_parent_of()
--
-- Busca en family_students usando:
--   1. family_id = auth.uid()                            (perfil legacy)
--   2. family_id IN (SELECT id FROM profiles             (perfil moderno)
--                    WHERE user_id = auth.uid())
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.is_parent_of(p_student_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_students fs
    WHERE fs.student_id = p_student_id
      AND (
        -- Perfil legacy: profiles.id = auth.uid() → family_id = auth.uid()
        fs.family_id = auth.uid()
        OR
        -- Perfil moderno: family_id = profiles.id, pero profiles.user_id = auth.uid()
        fs.family_id IN (
          SELECT p.id
          FROM public.profiles p
          WHERE p.user_id = auth.uid()
        )
      )
  )
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 2: Corregir política SELECT de family_students para padres
--
-- Cambios respecto a la versión anterior:
--   - Añade soporte al rol 'family' (alias usado en algunos perfiles)
--   - Amplía la condición de family_id para perfiles modernos
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS "rls_family_students_parent_select" ON public.family_students;

CREATE POLICY "rls_family_students_parent_select"
  ON public.family_students
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() IN ('parent', 'family')
    AND (
      -- Perfil legacy: family_id = auth.uid()
      family_id = auth.uid()
      OR
      -- Perfil moderno: family_id = profiles.id WHERE profiles.user_id = auth.uid()
      family_id IN (
        SELECT p.id
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
      )
    )
  );


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 3: Asegurar que la política parent/family de operational_links
-- también cubre el rol 'family' (ya está en 20260510_fase_cierre_operacional
-- pero se re-aplica aquí por seguridad idempotente).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Solo re-aplicar si la tabla existe
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'operational_links'
  ) THEN
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
  END IF;
END $$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICACIÓN FINAL (solo lectura)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Verificar que la función fue actualizada
SELECT
  routine_name,
  LEFT(routine_definition, 300) AS definition_preview
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_parent_of';

-- 2. Verificar política de family_students
SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'family_students'
ORDER BY policyname;
