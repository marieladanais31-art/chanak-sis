-- ══════════════════════════════════════════════════════════════════════════════
-- Fix acceso rol student: vínculo explícito profiles ⇄ students
-- ══════════════════════════════════════════════════════════════════════════════
-- No toca pagos, Stripe, DNS/SMTP, reset password, documentos, PEI ni boletines.
-- Agrega una columna mínima para asociar un profile con su fila real en students.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_profile_id
  ON public.students (profile_id);

-- Backfill seguro/idempotente con las columnas disponibles en cada instalación.
DO $$
DECLARE
  has_user_id boolean;
  has_email boolean;
  has_student_email boolean;
  backfill_sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'user_id'
  ) INTO has_user_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'email'
  ) INTO has_email;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'students' AND column_name = 'student_email'
  ) INTO has_student_email;

  backfill_sql := 'UPDATE public.students s SET profile_id = p.id FROM public.profiles p WHERE s.profile_id IS NULL AND p.role = ''student'' AND (';

  IF has_user_id THEN
    backfill_sql := backfill_sql || '(s.user_id IS NOT NULL AND p.user_id IS NOT NULL AND s.user_id = p.user_id)';
  END IF;

  IF has_email THEN
    IF has_user_id THEN
      backfill_sql := backfill_sql || ' OR ';
    END IF;
    backfill_sql := backfill_sql || '(s.email IS NOT NULL AND p.email IS NOT NULL AND lower(s.email) = lower(p.email))';
  END IF;

  IF has_student_email THEN
    IF has_user_id OR has_email THEN
      backfill_sql := backfill_sql || ' OR ';
    END IF;
    backfill_sql := backfill_sql || '(s.student_email IS NOT NULL AND p.email IS NOT NULL AND lower(s.student_email) = lower(p.email))';
  END IF;

  IF has_user_id OR has_email OR has_student_email THEN
    EXECUTE backfill_sql || ')';
  END IF;
END $$;

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_students_student_select" ON public.students;

CREATE POLICY "rls_students_student_select"
  ON public.students
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    public.get_current_user_role() = 'student'
    AND profile_id IN (SELECT id FROM public.current_profile_ids() AS id)
  );
