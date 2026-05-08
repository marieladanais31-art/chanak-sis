-- ══════════════════════════════════════════════════════════════════════════════
-- Fix crítico: get_current_user_role() y permisos de institutional_settings
--
-- Problemas que corrige:
--   1. get_current_user_role() usaba WHERE id = auth.uid() — falla para
--      perfiles donde profiles.id ≠ auth.uid() (enlace real: user_id).
--
--   2. institutional_settings no tenía política INSERT.
--
--   3. La política UPDATE usaba is_admin_or_director(), que incluye coordinator.
--      Coordinadores no deben poder editar la configuración institucional global.
--
-- Lo que NO cambia:
--   - is_admin_or_director() se deja intacta para no romper políticas existentes
--     en otras tablas que sí necesitan que coordinator tenga acceso.
--   - rls_settings_select_auth no se toca (SELECT para todos los autenticados).
--   - Ningún dato es borrado.
--   - No se toca auth.users, pagos, DNS, SMTP ni Stripe.
--
-- Idempotente: CREATE OR REPLACE + DROP POLICY IF EXISTS + CREATE POLICY.
-- ══════════════════════════════════════════════════════════════════════════════


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 1: Corregir get_current_user_role()
--
-- Cambio: busca en AMBAS columnas (user_id y id) para cubrir perfiles legacy
-- y perfiles nuevos. Prioriza user_id sobre id mediante ORDER BY CASE,
-- de modo que si por alguna razón ambas columnas matchean en filas distintas,
-- siempre gana el match por user_id (el enlace canónico moderno).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid()
     OR id      = auth.uid()
  ORDER BY
    CASE WHEN user_id = auth.uid() THEN 0 ELSE 1 END
  LIMIT 1
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 2: Nueva función específica para configuración institucional
--
-- Separada de is_admin_or_director() intencionadamente:
--   - coordinator NO debe editar la configuración institucional global.
--   - is_admin_or_director() incluye coordinator → no sirve aquí.
--   - director se añade de forma explícita para futura compatibilidad.
--
-- Retorna true solo para: super_admin | admin | director
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.can_manage_institutional_settings()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT role
      FROM public.profiles
      WHERE user_id = auth.uid()
         OR id      = auth.uid()
      ORDER BY
        CASE WHEN user_id = auth.uid() THEN 0 ELSE 1 END
      LIMIT 1
    ),
    ''
  ) IN ('super_admin', 'admin', 'director')
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 3: Reemplazar políticas de institutional_settings
--
-- Se reemplazan las políticas UPDATE e INSERT por versiones que usan
-- can_manage_institutional_settings() en lugar de is_admin_or_director().
--
-- Política SELECT (rls_settings_select_auth) → no se toca.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ── UPDATE: reemplaza la política existente que usaba is_admin_or_director() ──
DROP POLICY IF EXISTS rls_settings_update_admin ON public.institutional_settings;

CREATE POLICY rls_settings_update_admin
  ON public.institutional_settings
  FOR UPDATE
  USING     (public.can_manage_institutional_settings())
  WITH CHECK (public.can_manage_institutional_settings());

-- ── INSERT: política nueva (no existía antes) ─────────────────────────────────
DROP POLICY IF EXISTS rls_settings_insert_admin ON public.institutional_settings;

CREATE POLICY rls_settings_insert_admin
  ON public.institutional_settings
  FOR INSERT
  WITH CHECK (public.can_manage_institutional_settings());


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICACIÓN FINAL (solo lectura, no modifica nada)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Funciones corregidas / nuevas
SELECT
  routine_name,
  LEFT(routine_definition, 250) AS definition_preview
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_current_user_role',
    'can_manage_institutional_settings'
  )
ORDER BY routine_name;

-- 2. Políticas activas sobre institutional_settings
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename  = 'institutional_settings'
ORDER BY policyname;
