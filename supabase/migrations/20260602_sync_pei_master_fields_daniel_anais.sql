-- ─────────────────────────────────────────────────────────────────────────────
-- FASE 5: Sincronización datos maestros PEI → ficha de estudiante
-- Daniel Vidal y Anais Vidal — 2025-2026
-- SOLO llena campos vacíos (COALESCE(NULLIF(campo,''), valor_pei))
-- No borra ni sobrescribe datos existentes.
-- Idempotente. No toca notas, pagos, evidencias, proyecciones ni RLS.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- PASO 1 — Comparación estado actual
-- ══════════════════════════════════════════════════════════════
SELECT
  s.first_name || ' ' || s.last_name AS estudiante,
  -- Ficha actual
  s.date_of_birth      AS ficha_dob,
  s.enrollment_date    AS ficha_ingreso,
  s.grade_level        AS ficha_grado,
  s.last_grade_completed AS ficha_ultimo_grado,
  s.modality           AS ficha_modalidad,
  s.nationality        AS ficha_nacionalidad,
  s.city               AS ficha_ciudad,
  s.country            AS ficha_pais,
  s.student_email      AS ficha_email,
  s.phone              AS ficha_telefono,
  s.parent1_relationship AS ficha_relacion,
  -- PEI actual (más reciente para 2025-2026)
  p.student_dob        AS pei_dob,
  p.enrollment_date    AS pei_ingreso,
  p.grade_level        AS pei_grado,
  p.last_grade_completed AS pei_ultimo_grado,
  p.modality           AS pei_modalidad,
  p.student_nationality AS pei_nacionalidad,
  p.student_city       AS pei_ciudad,
  p.student_country    AS pei_pais,
  p.student_email      AS pei_email,
  p.parent_phone       AS pei_telefono,
  p.parent_relation    AS pei_relacion
FROM public.students s
LEFT JOIN public.individualized_education_plans p
  ON p.student_id = s.id AND p.school_year = '2025-2026'
WHERE
  (lower(s.first_name) LIKE '%daniel%' AND lower(s.last_name) LIKE '%vidal%')
  OR (lower(s.first_name) LIKE '%anais%'  AND lower(s.last_name) LIKE '%vidal%')
  OR (lower(s.first_name) LIKE '%anaís%'  AND lower(s.last_name) LIKE '%vidal%')
ORDER BY s.first_name;

-- ══════════════════════════════════════════════════════════════
-- PASO 2 — UPDATE Daniel Vidal (solo campos vacíos en students)
-- ══════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_student_id  uuid;
  v_pei         record;
  v_updated     text[] := '{}';
BEGIN
  SELECT id INTO v_student_id
  FROM public.students
  WHERE lower(first_name) LIKE '%daniel%' AND lower(last_name) LIKE '%vidal%'
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE NOTICE 'Daniel Vidal no encontrado en students.';
    RETURN;
  END IF;

  -- Obtener datos del PEI más reciente 2025-2026
  SELECT * INTO v_pei
  FROM public.individualized_education_plans
  WHERE student_id = v_student_id AND school_year = '2025-2026'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'Daniel Vidal: sin PEI 2025-2026.';
    RETURN;
  END IF;

  UPDATE public.students
  SET
    date_of_birth      = COALESCE(NULLIF(date_of_birth::text,''), v_pei.student_dob::text)::date,
    enrollment_date    = COALESCE(NULLIF(enrollment_date::text,''), v_pei.enrollment_date::text)::date,
    grade_level        = COALESCE(NULLIF(grade_level,''), v_pei.grade_level),
    last_grade_completed = COALESCE(NULLIF(last_grade_completed,''), v_pei.last_grade_completed),
    modality           = COALESCE(NULLIF(modality,''), v_pei.modality),
    curriculum_base    = COALESCE(NULLIF(curriculum_base,''), v_pei.curriculum_base),
    nationality        = COALESCE(NULLIF(nationality,''), v_pei.student_nationality),
    city               = COALESCE(NULLIF(city,''), v_pei.student_city),
    country            = COALESCE(NULLIF(country,''), v_pei.student_country),
    student_email      = COALESCE(NULLIF(student_email,''), v_pei.student_email),
    phone              = COALESCE(NULLIF(phone,''), v_pei.parent_phone),
    parent1_relationship = COALESCE(NULLIF(parent1_relationship,''), v_pei.parent_relation)
  WHERE id = v_student_id;

  RAISE NOTICE 'Daniel Vidal — ficha actualizada con datos del PEI (solo campos vacíos).';
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- PASO 3 — UPDATE Anais Vidal (solo campos vacíos en students)
-- ══════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_student_id  uuid;
  v_pei         record;
BEGIN
  SELECT id INTO v_student_id
  FROM public.students
  WHERE (lower(first_name) LIKE '%anais%' OR lower(first_name) LIKE '%anaís%')
    AND lower(last_name) LIKE '%vidal%'
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE NOTICE 'Anais Vidal no encontrada en students.';
    RETURN;
  END IF;

  SELECT * INTO v_pei
  FROM public.individualized_education_plans
  WHERE student_id = v_student_id AND school_year = '2025-2026'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'Anais Vidal: sin PEI 2025-2026.';
    RETURN;
  END IF;

  UPDATE public.students
  SET
    date_of_birth      = COALESCE(NULLIF(date_of_birth::text,''), v_pei.student_dob::text)::date,
    enrollment_date    = COALESCE(NULLIF(enrollment_date::text,''), v_pei.enrollment_date::text)::date,
    grade_level        = COALESCE(NULLIF(grade_level,''), v_pei.grade_level),
    last_grade_completed = COALESCE(NULLIF(last_grade_completed,''), v_pei.last_grade_completed),
    modality           = COALESCE(NULLIF(modality,''), v_pei.modality),
    curriculum_base    = COALESCE(NULLIF(curriculum_base,''), v_pei.curriculum_base),
    nationality        = COALESCE(NULLIF(nationality,''), v_pei.student_nationality),
    city               = COALESCE(NULLIF(city,''), v_pei.student_city),
    country            = COALESCE(NULLIF(country,''), v_pei.student_country),
    student_email      = COALESCE(NULLIF(student_email,''), v_pei.student_email),
    phone              = COALESCE(NULLIF(phone,''), v_pei.parent_phone),
    parent1_relationship = COALESCE(NULLIF(parent1_relationship,''), v_pei.parent_relation)
  WHERE id = v_student_id;

  RAISE NOTICE 'Anais Vidal — ficha actualizada con datos del PEI (solo campos vacíos).';
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- PASO 4 — Verificación final
-- ══════════════════════════════════════════════════════════════
SELECT
  first_name || ' ' || last_name AS estudiante,
  date_of_birth, enrollment_date, grade_level, last_grade_completed,
  modality, nationality, city, country, student_email, phone, parent1_relationship
FROM public.students
WHERE
  (lower(first_name) LIKE '%daniel%' AND lower(last_name) LIKE '%vidal%')
  OR (lower(first_name) LIKE '%anais%'  AND lower(last_name) LIKE '%vidal%')
  OR (lower(first_name) LIKE '%anaís%'  AND lower(last_name) LIKE '%vidal%')
ORDER BY first_name;
