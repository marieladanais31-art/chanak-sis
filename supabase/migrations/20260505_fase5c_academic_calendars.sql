-- ══════════════════════════════════════════════════════════════════════════════
-- Fase 5c: Calendario Escolar / Academic Calendar
-- ══════════════════════════════════════════════════════════════════════════════
-- Idempotente: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS

CREATE TABLE IF NOT EXISTS public.academic_calendars (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year text        UNIQUE NOT NULL,
  start_date    date,
  end_date      date,
  q1_start_date date,
  q1_end_date   date,
  q2_start_date date,
  q2_end_date   date,
  q3_start_date date,
  q3_end_date   date,
  break_notes   text,
  status        text        NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'active', 'archived')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS academic_year text DEFAULT '2025-2026';

-- Default 2025-2026 calendar
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

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.academic_calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manage academic_calendars" ON public.academic_calendars;
CREATE POLICY "Admin manage academic_calendars"
  ON public.academic_calendars
  FOR ALL
  USING (is_admin_or_director())
  WITH CHECK (is_admin_or_director());

DROP POLICY IF EXISTS "Authenticated read academic_calendars" ON public.academic_calendars;
CREATE POLICY "Authenticated read academic_calendars"
  ON public.academic_calendars
  FOR SELECT
  USING (auth.role() = 'authenticated');
