-- ─────────────────────────────────────────────────────────────────────────────
-- Carga inicial de proyecciones PEI — Daniel Vidal y Anais Vidal 2025-2026
-- MÉTODO: SQL con NOT EXISTS — no borra registros, no duplica.
-- EJECUTAR en Supabase SQL Editor en pasos, verificando cada resultado.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- PASO 1 — Verificar estudiantes
-- ══════════════════════════════════════════════════════════════
SELECT id, first_name, last_name, grade_level, us_grade_level
FROM public.students
WHERE (lower(first_name) LIKE '%daniel%' AND lower(last_name) LIKE '%vidal%')
   OR (lower(first_name) LIKE '%anais%'  AND lower(last_name) LIKE '%vidal%')
   OR (lower(first_name) LIKE '%anaís%'  AND lower(last_name) LIKE '%vidal%')
ORDER BY first_name;

-- ══════════════════════════════════════════════════════════════
-- PASO 2 — Verificar PEIs 2025-2026 existentes
-- ══════════════════════════════════════════════════════════════
SELECT p.id AS pei_id, p.student_id, p.school_year, p.status,
       s.first_name, s.last_name
FROM public.individualized_education_plans p
JOIN public.students s ON s.id = p.student_id
WHERE p.school_year = '2025-2026'
  AND (
    (lower(s.first_name) LIKE '%daniel%' AND lower(s.last_name) LIKE '%vidal%')
 OR (lower(s.first_name) LIKE '%anais%'  AND lower(s.last_name) LIKE '%vidal%')
 OR (lower(s.first_name) LIKE '%anaís%'  AND lower(s.last_name) LIKE '%vidal%')
  )
ORDER BY s.first_name;

-- ══════════════════════════════════════════════════════════════
-- PASO 3 — Proyecciones existentes (para ver qué ya está cargado)
-- ══════════════════════════════════════════════════════════════
SELECT pp.subject_name, pp.quarter, pp.pace_number, pp.pages_per_day, pp.status,
       s.first_name, s.last_name
FROM public.pei_pace_projections pp
JOIN public.students s ON s.id = pp.student_id
WHERE pp.school_year = '2025-2026'
  AND (
    (lower(s.first_name) LIKE '%daniel%' AND lower(s.last_name) LIKE '%vidal%')
 OR (lower(s.first_name) LIKE '%anais%'  AND lower(s.last_name) LIKE '%vidal%')
 OR (lower(s.first_name) LIKE '%anaís%'  AND lower(s.last_name) LIKE '%vidal%')
  )
ORDER BY s.first_name, pp.subject_name, pp.quarter, pp.pace_number;

-- ══════════════════════════════════════════════════════════════
-- PASO 4 — INSERT Daniel Vidal (ejecutar solo tras confirmar student_id y pei_id)
-- Sustituye :DANIEL_STUDENT_ID y :DANIEL_PEI_ID con los UUIDs reales del PASO 1/2
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_student_id uuid;
  v_pei_id     uuid;
BEGIN
  -- Buscar student_id
  SELECT id INTO v_student_id
  FROM public.students
  WHERE lower(first_name) LIKE '%daniel%' AND lower(last_name) LIKE '%vidal%'
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Estudiante Daniel Vidal no encontrado en students.';
  END IF;

  -- Buscar o tomar el PEI más reciente de 2025-2026
  SELECT id INTO v_pei_id
  FROM public.individualized_education_plans
  WHERE student_id = v_student_id AND school_year = '2025-2026'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_pei_id IS NULL THEN
    RAISE EXCEPTION 'No existe PEI 2025-2026 para Daniel Vidal. Créalo primero desde el panel de PEI.';
  END IF;

  RAISE NOTICE 'Daniel Vidal — student_id: %, pei_id: %', v_student_id, v_pei_id;

  -- ── Math 1073-1087  (Q1:1073-1077, Q2:1078-1082, Q3:1083-1087) ────────
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'Math', '2025-2026',
         q.quarter, q.pace_number, '4', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1073),('Q1',1074),('Q1',1075),('Q1',1076),('Q1',1077),
    ('Q2',1078),('Q2',1079),('Q2',1080),('Q2',1081),('Q2',1082),
    ('Q3',1083),('Q3',1084),('Q3',1085),('Q3',1086),('Q3',1087)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'Math'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  -- ── English 1067-1083  (Q1:1067-1071, Q2:1072-1077, Q3:1078-1083) ─────
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'English', '2025-2026',
         q.quarter, q.pace_number, '4', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1067),('Q1',1068),('Q1',1069),('Q1',1070),('Q1',1071),
    ('Q2',1072),('Q2',1073),('Q2',1074),('Q2',1075),('Q2',1076),('Q2',1077),
    ('Q3',1078),('Q3',1079),('Q3',1080),('Q3',1081),('Q3',1082),('Q3',1083)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'English'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  -- ── Word Building 1069-1084  (Q1:1069-1073, Q2:1074-1078, Q3:1079-1084) ─
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'Word Building', '2025-2026',
         q.quarter, q.pace_number, '3', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1069),('Q1',1070),('Q1',1071),('Q1',1072),('Q1',1073),
    ('Q2',1074),('Q2',1075),('Q2',1076),('Q2',1077),('Q2',1078),
    ('Q3',1079),('Q3',1080),('Q3',1081),('Q3',1082),('Q3',1083),('Q3',1084)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'Word Building'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  -- ── Science 1068-1084  (Q1:1068-1072, Q2:1073-1078, Q3:1079-1084) ──────
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'Science', '2025-2026',
         q.quarter, q.pace_number, '3', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1068),('Q1',1069),('Q1',1070),('Q1',1071),('Q1',1072),
    ('Q2',1073),('Q2',1074),('Q2',1075),('Q2',1076),('Q2',1077),('Q2',1078),
    ('Q3',1079),('Q3',1080),('Q3',1081),('Q3',1082),('Q3',1083),('Q3',1084)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'Science'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  -- ── Social Studies 1068-1080  (Q1:1068-1071, Q2:1072-1075, Q3:1076-1080) ─
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'Social Studies', '2025-2026',
         q.quarter, q.pace_number, '3', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1068),('Q1',1069),('Q1',1070),('Q1',1071),
    ('Q2',1072),('Q2',1073),('Q2',1074),('Q2',1075),
    ('Q3',1076),('Q3',1077),('Q3',1078),('Q3',1079),('Q3',1080)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'Social Studies'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  RAISE NOTICE 'Daniel Vidal — proyecciones insertadas correctamente.';
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- PASO 5 — INSERT Anais Vidal
-- ══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_student_id uuid;
  v_pei_id     uuid;
BEGIN
  SELECT id INTO v_student_id
  FROM public.students
  WHERE (lower(first_name) LIKE '%anais%' OR lower(first_name) LIKE '%anaís%')
    AND lower(last_name) LIKE '%vidal%'
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Estudiante Anais Vidal no encontrada en students.';
  END IF;

  SELECT id INTO v_pei_id
  FROM public.individualized_education_plans
  WHERE student_id = v_student_id AND school_year = '2025-2026'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_pei_id IS NULL THEN
    RAISE EXCEPTION 'No existe PEI 2025-2026 para Anais Vidal. Créalo primero desde el panel de PEI.';
  END IF;

  RAISE NOTICE 'Anais Vidal — student_id: %, pei_id: %', v_student_id, v_pei_id;

  -- ── Math 1037-1052  (Q1:1037-1041, Q2:1042-1046, Q3:1047-1052) ──────────
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'Math', '2025-2026',
         q.quarter, q.pace_number, '4', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1037),('Q1',1038),('Q1',1039),('Q1',1040),('Q1',1041),
    ('Q2',1042),('Q2',1043),('Q2',1044),('Q2',1045),('Q2',1046),
    ('Q3',1047),('Q3',1048),('Q3',1049),('Q3',1050),('Q3',1051),('Q3',1052)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'Math'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  -- ── English 1030-1045  (Q1:1030-1034, Q2:1035-1039, Q3:1040-1045) ───────
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'English', '2025-2026',
         q.quarter, q.pace_number, '4', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1030),('Q1',1031),('Q1',1032),('Q1',1033),('Q1',1034),
    ('Q2',1035),('Q2',1036),('Q2',1037),('Q2',1038),('Q2',1039),
    ('Q3',1040),('Q3',1041),('Q3',1042),('Q3',1043),('Q3',1044),('Q3',1045)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'English'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  -- ── Word Building 1031-1046  (Q1:1031-1035, Q2:1036-1040, Q3:1041-1046) ─
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'Word Building', '2025-2026',
         q.quarter, q.pace_number, '3', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1031),('Q1',1032),('Q1',1033),('Q1',1034),('Q1',1035),
    ('Q2',1036),('Q2',1037),('Q2',1038),('Q2',1039),('Q2',1040),
    ('Q3',1041),('Q3',1042),('Q3',1043),('Q3',1044),('Q3',1045),('Q3',1046)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'Word Building'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  -- ── Science 1032-1047  (Q1:1032-1036, Q2:1037-1041, Q3:1042-1047) ───────
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'Science', '2025-2026',
         q.quarter, q.pace_number, '3', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1032),('Q1',1033),('Q1',1034),('Q1',1035),('Q1',1036),
    ('Q2',1037),('Q2',1038),('Q2',1039),('Q2',1040),('Q2',1041),
    ('Q3',1042),('Q3',1043),('Q3',1044),('Q3',1045),('Q3',1046),('Q3',1047)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'Science'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  -- ── Social Studies 1029-1046  (Q1:1029-1034, Q2:1035-1040, Q3:1041-1046) ─
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'Social Studies', '2025-2026',
         q.quarter, q.pace_number, '3', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1029),('Q1',1030),('Q1',1031),('Q1',1032),('Q1',1033),('Q1',1034),
    ('Q2',1035),('Q2',1036),('Q2',1037),('Q2',1038),('Q2',1039),('Q2',1040),
    ('Q3',1041),('Q3',1042),('Q3',1043),('Q3',1044),('Q3',1045),('Q3',1046)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026' AND x.subject_name = 'Social Studies'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  -- ── Spanish/Lengua 1032-1047  (Q1:1032-1036, Q2:1037-1041, Q3:1042-1047) ─
  INSERT INTO public.pei_pace_projections
    (pei_id, student_id, subject_name, school_year, quarter, pace_number,
     pages_per_day, pace_type, status, updated_at)
  SELECT v_pei_id, v_student_id, 'Lengua y Literatura Castellana', '2025-2026',
         q.quarter, q.pace_number, '3', 'advance', 'pending', now()
  FROM (VALUES
    ('Q1',1032),('Q1',1033),('Q1',1034),('Q1',1035),('Q1',1036),
    ('Q2',1037),('Q2',1038),('Q2',1039),('Q2',1040),('Q2',1041),
    ('Q3',1042),('Q3',1043),('Q3',1044),('Q3',1045),('Q3',1046),('Q3',1047)
  ) AS q(quarter, pace_number)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.pei_pace_projections x
    WHERE x.pei_id = v_pei_id AND x.student_id = v_student_id
      AND x.school_year = '2025-2026'
      AND x.subject_name = 'Lengua y Literatura Castellana'
      AND x.quarter = q.quarter AND x.pace_number = q.pace_number
  );

  RAISE NOTICE 'Anais Vidal — proyecciones insertadas correctamente.';
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- PASO 6 — Verificación final de conteos
-- ══════════════════════════════════════════════════════════════
SELECT s.first_name, s.last_name, pp.subject_name, pp.quarter,
       count(*) AS total_evaluaciones,
       min(pp.pace_number) AS desde,
       max(pp.pace_number) AS hasta,
       max(pp.pages_per_day) AS paginas_dia
FROM public.pei_pace_projections pp
JOIN public.students s ON s.id = pp.student_id
WHERE pp.school_year = '2025-2026'
  AND (
    (lower(s.first_name) LIKE '%daniel%' AND lower(s.last_name) LIKE '%vidal%')
 OR (lower(s.first_name) LIKE '%anais%'  AND lower(s.last_name) LIKE '%vidal%')
 OR (lower(s.first_name) LIKE '%anaís%'  AND lower(s.last_name) LIKE '%vidal%')
  )
GROUP BY s.first_name, s.last_name, pp.subject_name, pp.quarter
ORDER BY s.first_name, pp.subject_name, pp.quarter;
