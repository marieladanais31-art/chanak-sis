-- Official bilingual document status alignment.
-- Keeps the canonical lifecycle available to all official document tables without touching auth, payments, SMTP, DNS or evidence flows.

DO $$ BEGIN
  ALTER TABLE public.enrollment_contracts DROP CONSTRAINT IF EXISTS enrollment_contracts_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.enrollment_contracts
  ADD CONSTRAINT enrollment_contracts_status_check
  CHECK (status IN ('draft','sent','signed','published','archived'));

DO $$ BEGIN
  ALTER TABLE public.enrollment_letters DROP CONSTRAINT IF EXISTS enrollment_letters_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.enrollment_letters
  ADD CONSTRAINT enrollment_letters_status_check
  CHECK (status IN ('draft','sent','signed','published','archived'));

DO $$ BEGIN
  ALTER TABLE public.individualized_education_plans DROP CONSTRAINT IF EXISTS individualized_education_plans_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.individualized_education_plans
  ADD CONSTRAINT individualized_education_plans_status_check
  CHECK (status IN ('draft','sent','signed','published','archived','in_review','approved'));

DO $$ BEGIN
  ALTER TABLE public.transcript_records DROP CONSTRAINT IF EXISTS transcript_records_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.transcript_records
  ADD CONSTRAINT transcript_records_status_check
  CHECK (status IN ('draft','sent','signed','published','archived','in_review','approved','unpublished'));

DROP POLICY IF EXISTS rls_contracts_parent_select ON public.enrollment_contracts;
CREATE POLICY rls_contracts_parent_select ON public.enrollment_contracts
  FOR SELECT TO authenticated
  USING (status IN ('sent','signed','published') AND public.is_parent_of(student_id));

DROP POLICY IF EXISTS rls_letters_parent_select ON public.enrollment_letters;
CREATE POLICY rls_letters_parent_select ON public.enrollment_letters
  FOR SELECT TO authenticated
  USING (status IN ('sent','published') AND public.is_parent_of(student_id));
