-- Migración idempotente: añade columnas faltantes y configura RLS en profiles.
-- Orden correcto: funciones helper → columnas → RLS → políticas.

-- ── 1. Funciones helper (SECURITY DEFINER para evitar recursión en RLS) ─────────

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_director()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    ''
  ) IN ('super_admin', 'admin', 'coordinator')
$$;

-- ── 2. Columnas nuevas ────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS tutor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ── 3. Habilitar RLS en profiles ──────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── 4. Políticas (DROP IF EXISTS para idempotencia) ───────────────────────────

DROP POLICY IF EXISTS rls_profiles_select_own    ON public.profiles;
DROP POLICY IF EXISTS rls_profiles_select_admin  ON public.profiles;
DROP POLICY IF EXISTS rls_profiles_update_own    ON public.profiles;
DROP POLICY IF EXISTS rls_profiles_update_admin  ON public.profiles;
DROP POLICY IF EXISTS rls_profiles_insert_own    ON public.profiles;
DROP POLICY IF EXISTS rls_profiles_insert_admin  ON public.profiles;

-- Cada usuario ve su propio perfil
CREATE POLICY rls_profiles_select_own ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Admins y coordinadores ven todos los perfiles
CREATE POLICY rls_profiles_select_admin ON public.profiles
  FOR SELECT USING (public.is_admin_or_director());

-- Cada usuario puede editar su propio perfil (sin escalar rol)
CREATE POLICY rls_profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Admins pueden editar cualquier perfil
CREATE POLICY rls_profiles_update_admin ON public.profiles
  FOR UPDATE USING (public.is_admin_or_director());

-- Permite auto-crear el propio perfil (trigger de signup) y que admins inserten
CREATE POLICY rls_profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY rls_profiles_insert_admin ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin_or_director());
