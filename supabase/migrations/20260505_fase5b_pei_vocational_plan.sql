-- ══════════════════════════════════════════════════════════════════════════════
-- Fase 5b: Plan vocacional en PEI (Daniel model — lecturas, práctica, tech)
-- ══════════════════════════════════════════════════════════════════════════════
-- Idempotente: usa ADD COLUMN IF NOT EXISTS

ALTER TABLE public.individualized_education_plans
  ADD COLUMN IF NOT EXISTS vocational_plan text;
