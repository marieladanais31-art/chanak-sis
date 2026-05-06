-- ══════════════════════════════════════════════════════════════════════════════
-- Fix: RLS de profiles para soportar user_id como columna de enlace
-- ══════════════════════════════════════════════════════════════════════════════
-- Problema: profiles.id puede ser un UUID distinto de auth.uid().
-- El enlace con el usuario autenticado puede estar en user_id (puede ser NULL
-- en perfiles legacy). Las políticas anteriores solo usaban id = auth.uid(),
-- lo que bloqueaba a usuarios cuyo perfil tiene un id diferente.
--
-- Solución: ampliar USING a (id = auth.uid() OR user_id = auth.uid())
-- Idempotente: DROP POLICY IF EXISTS antes de cada CREATE POLICY.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Columnas que deben existir (idempotente) ───────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS status    text  DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS family_id uuid;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- ── 2. Limpiar políticas previas (fase3 + fase7) ──────────────────────────────
DROP POLICY IF EXISTS "rls_profiles_select_own"         ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_select_admin"       ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_select_coordinator" ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_update_own"         ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_update_admin"       ON public.profiles;
DROP POLICY IF EXISTS "rls_profiles_insert_admin"       ON public.profiles;
-- políticas de fase7 (si se aplicaron)
DROP POLICY IF EXISTS "Admin manage all profiles"       ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile"          ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile"        ON public.profiles;

-- ── 3. Nueva política SELECT propio: id OR user_id ───────────────────────────
-- Cubre tanto perfiles legacy (id = auth.uid()) como nuevos (user_id = auth.uid())
CREATE POLICY "rls_profiles_select_own"
  ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (id = auth.uid() OR user_id = auth.uid());

-- ── 4. Admin y director: lectura de todos ────────────────────────────────────
CREATE POLICY "rls_profiles_select_admin"
  ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.is_admin_or_director());

-- ── 5. Coordinador: lectura de todos salvo super_admin ───────────────────────
CREATE POLICY "rls_profiles_select_coordinator"
  ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    public.get_current_user_role() = 'coordinator'
    AND role <> 'super_admin'
  );

-- ── 6. UPDATE propio: no puede cambiar su rol ni desactivarse ─────────────────
CREATE POLICY "rls_profiles_update_own"
  ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING (id = auth.uid() OR user_id = auth.uid())
  WITH CHECK (
    (id = auth.uid() OR user_id = auth.uid())
    AND is_active = true
    AND role = (
      SELECT p.role FROM public.profiles p
      WHERE p.id = auth.uid() OR p.user_id = auth.uid()
      LIMIT 1
    )
  );

-- ── 7. Admin: actualización total ────────────────────────────────────────────
CREATE POLICY "rls_profiles_update_admin"
  ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- ── 8. Admin: inserción de nuevos perfiles ────────────────────────────────────
CREATE POLICY "rls_profiles_insert_admin"
  ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_director());
