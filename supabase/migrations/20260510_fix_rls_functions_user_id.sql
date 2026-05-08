-- ══════════════════════════════════════════════════════════════════════════════
-- Fix crítico: get_current_user_role() e is_admin_or_director()
-- usan WHERE id = auth.uid() pero profiles.id puede NO ser auth.uid().
-- El enlace correcto es user_id = auth.uid() (o id = auth.uid() en legacy).
-- Esta migración busca en ambas columnas con OR para cubrir ambos casos.
--
-- Síntomas que corrige:
--   - InstitutionalSettings no guarda (UPDATE bloqueado por RLS)
--   - Otras tablas protegidas con is_admin_or_director() no responden
--   - get_current_user_role() devuelve NULL para perfiles donde id ≠ auth.uid()
--
-- Idempotente: CREATE OR REPLACE no rompe nada si ya existen.
-- No toca datos. No toca rutas, DNS, SMTP, pagos.
-- ══════════════════════════════════════════════════════════════════════════════


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 1: Corregir get_current_user_role()
-- Antes: WHERE id = auth.uid()
-- Ahora: WHERE user_id = auth.uid() OR id = auth.uid()
--        LIMIT 1 para evitar ambigüedad si hubiera duplicados
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role
  FROM public.profiles
  WHERE user_id = auth.uid()
     OR id      = auth.uid()
  LIMIT 1
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 2: Corregir is_admin_or_director()
-- Misma corrección: buscar en user_id Y en id
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT role
      FROM public.profiles
      WHERE user_id = auth.uid()
         OR id      = auth.uid()
      LIMIT 1
    ),
    ''
  ) IN ('super_admin', 'admin', 'coordinator')
$$;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- BLOQUE 3: Política INSERT para institutional_settings
-- La tabla solo tenía SELECT (todos auth) y UPDATE (is_admin_or_director).
-- Sin INSERT policy, un admin no puede crear la fila si no existe.
-- DROP + CREATE = idempotente.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP POLICY IF EXISTS rls_settings_insert_admin ON public.institutional_settings;

CREATE POLICY rls_settings_insert_admin
  ON public.institutional_settings
  FOR INSERT
  WITH CHECK (public.is_admin_or_director());


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICACIÓN FINAL (solo lectura)
-- Debe mostrar las dos funciones con su definición actualizada.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SELECT
  routine_name,
  LEFT(routine_definition, 200) AS definition_preview
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_current_user_role', 'is_admin_or_director')
ORDER BY routine_name;
