-- ══════════════════════════════════════════════════════════════════════════════
-- Fase 7: Accesos por Rol — profiles patch + RLS segura
-- ══════════════════════════════════════════════════════════════════════════════
-- Idempotente: ADD COLUMN IF NOT EXISTS, DROP POLICY IF EXISTS

-- ── 1. Columnas adicionales en profiles (si no existen) ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hub_id    uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ── 2. Índice de hub_id para filtros de coordinadores ────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_hub_id ON public.profiles (hub_id);

-- ── 3. RLS profiles — parche idempotente ─────────────────────────────────────
-- Garantizar que admin/super_admin pueden actualizar hub_id e is_active de otros usuarios.
-- Las políticas base se definen en fase3; aquí solo aseguramos la política de admin.

DROP POLICY IF EXISTS "Admin manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile"  ON public.profiles;

-- Admins ven y editan todos los perfiles
CREATE POLICY "Admin manage all profiles"
  ON public.profiles AS PERMISSIVE FOR ALL TO authenticated
  USING  (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- Usuarios leen su propio perfil
CREATE POLICY "Users read own profile"
  ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Usuarios actualizan campos propios pero NO pueden cambiar su rol
CREATE POLICY "Users update own profile"
  ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- ── 4. Nota de roles soportados ───────────────────────────────────────────────
-- Roles activos: super_admin, admin, coordinator, tutor, parent, student
-- Roles alias gestionados en frontend: mentor → /tutor, family → /parent
-- No se usa CHECK constraint en profiles.role para mantener flexibilidad.
