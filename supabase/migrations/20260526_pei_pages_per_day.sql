-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: pages_per_day en pei_pace_projections
-- Añade el campo de ritmo diario recomendado por evaluación proyectada.
-- Idempotente. No toca RLS, pagos, auth ni Stripe.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.pei_pace_projections
  ADD COLUMN IF NOT EXISTS pages_per_day text;

COMMENT ON COLUMN public.pei_pace_projections.pages_per_day IS
  'Ritmo diario recomendado para esta evaluación/asignatura. '
  'Ej: "4", "3–5", "1 actividad". Definido por coordinador/tutor en el PEI.';
