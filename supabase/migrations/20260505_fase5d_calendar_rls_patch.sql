-- ══════════════════════════════════════════════════════════════════════════════
-- Fase 5d: Patch RLS academic_calendars — políticas explícitas por operación
-- ══════════════════════════════════════════════════════════════════════════════
-- Idempotente: DROP IF EXISTS antes de cada CREATE.
-- No borra datos. Seguro ejecutar varias veces.

-- Asegurar que RLS está activo
ALTER TABLE IF EXISTS public.academic_calendars ENABLE ROW LEVEL SECURITY;

-- ── Eliminar políticas anteriores (limpiar) ───────────────────────────────────
DROP POLICY IF EXISTS "Admin manage academic_calendars"        ON public.academic_calendars;
DROP POLICY IF EXISTS "Authenticated read academic_calendars"  ON public.academic_calendars;
DROP POLICY IF EXISTS "cal_select_authenticated"               ON public.academic_calendars;
DROP POLICY IF EXISTS "cal_insert_admin"                       ON public.academic_calendars;
DROP POLICY IF EXISTS "cal_update_admin"                       ON public.academic_calendars;
DROP POLICY IF EXISTS "cal_delete_admin"                       ON public.academic_calendars;

-- ── SELECT: cualquier usuario autenticado puede leer calendarios ──────────────
CREATE POLICY "cal_select_authenticated"
  ON public.academic_calendars
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── INSERT: admin / super_admin / director ────────────────────────────────────
CREATE POLICY "cal_insert_admin"
  ON public.academic_calendars
  FOR INSERT
  WITH CHECK (public.is_admin_or_director());

-- ── UPDATE: admin / super_admin / director ────────────────────────────────────
CREATE POLICY "cal_update_admin"
  ON public.academic_calendars
  FOR UPDATE
  USING (public.is_admin_or_director())
  WITH CHECK (public.is_admin_or_director());

-- ── DELETE: admin / super_admin / director ────────────────────────────────────
CREATE POLICY "cal_delete_admin"
  ON public.academic_calendars
  FOR DELETE
  USING (public.is_admin_or_director());

-- ── Asegurar fila por defecto 2025-2026 si no existe ─────────────────────────
INSERT INTO public.academic_calendars
  (academic_year, start_date, end_date,
   q1_start_date, q1_end_date,
   q2_start_date, q2_end_date,
   q3_start_date, q3_end_date,
   status)
VALUES
  ('2025-2026', '2025-09-01', '2026-07-17',
   '2025-09-01', '2025-12-19',
   '2026-01-12', '2026-04-03',
   '2026-04-20', '2026-07-17',
   'active')
ON CONFLICT (academic_year) DO NOTHING;
