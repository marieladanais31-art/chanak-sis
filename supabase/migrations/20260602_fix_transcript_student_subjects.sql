-- ─────────────────────────────────────────────────────────────────────────────
-- Reparación: student_subjects y grade_entries para boletín
-- Crea filas faltantes en student_subjects con academic_block correcto.
-- Actualiza grade_submission_status = 'approved' donde hay notas aprobadas.
-- No borra notas ni proyecciones. Idempotente.
-- ─────────────────────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- PASO 1 — Diagnóstico: ¿existen student_subjects para Daniel/Anais?
-- ══════════════════════════════════════════════════════════════
SELECT
  s.first_name || ' ' || s.last_name AS estudiante,
  ss.subject_name, ss.quarter, ss.school_year,
  ss.academic_block, ss.grade_submission_status,
  ss.id AS student_subject_id
FROM public.students s
JOIN public.student_subjects ss ON ss.student_id = s.id
WHERE ss.school_year = '2025-2026'
  AND (
    (lower(s.first_name) LIKE '%daniel%' AND lower(s.last_name) LIKE '%vidal%')
    OR (lower(s.first_name) LIKE '%anais%' AND lower(s.last_name) LIKE '%vidal%')
    OR (lower(s.first_name) LIKE '%anaís%' AND lower(s.last_name) LIKE '%vidal%')
  )
ORDER BY s.first_name, ss.quarter, ss.subject_name;

-- ══════════════════════════════════════════════════════════════
-- PASO 2 — Diagnóstico: ¿existen grade_entries aprobadas?
-- ══════════════════════════════════════════════════════════════
SELECT
  s.first_name || ' ' || s.last_name AS estudiante,
  ge.assessment_name, ge.score, ge.submission_status,
  ge.quarter, ge.school_year,
  ge.student_subject_id,
  ge.date_recorded, ge.created_at
FROM public.students s
JOIN public.student_grade_entries ge ON ge.student_id = s.id
WHERE ge.school_year = '2025-2026'
  AND (
    (lower(s.first_name) LIKE '%daniel%' AND lower(s.last_name) LIKE '%vidal%')
    OR (lower(s.first_name) LIKE '%anais%' AND lower(s.last_name) LIKE '%vidal%')
    OR (lower(s.first_name) LIKE '%anaís%' AND lower(s.last_name) LIKE '%vidal%')
  )
ORDER BY s.first_name, ge.quarter, ge.assessment_name;

-- ══════════════════════════════════════════════════════════════
-- PASO 3 — Crear student_subjects faltantes para las asignaturas
--           que aparecen en pei_pace_projections pero no en student_subjects
-- ══════════════════════════════════════════════════════════════
DO $$
DECLARE
  rec    record;
  v_block text;
  v_exists uuid;
BEGIN
  -- Iterar sobre todas las asignaturas proyectadas de Daniel/Anais 2025-2026
  FOR rec IN
    SELECT DISTINCT
      p.student_id,
      p.subject_name,
      p.quarter,
      p.school_year
    FROM public.pei_pace_projections p
    JOIN public.students s ON s.id = p.student_id
    WHERE p.school_year = '2025-2026'
      AND (
        (lower(s.first_name) LIKE '%daniel%' AND lower(s.last_name) LIKE '%vidal%')
        OR (lower(s.first_name) LIKE '%anais%' AND lower(s.last_name) LIKE '%vidal%')
        OR (lower(s.first_name) LIKE '%anaís%' AND lower(s.last_name) LIKE '%vidal%')
      )
  LOOP
    -- Ver si ya existe
    SELECT id INTO v_exists
    FROM public.student_subjects
    WHERE student_id  = rec.student_id
      AND subject_name = rec.subject_name
      AND quarter      = rec.quarter
      AND school_year  = rec.school_year
    LIMIT 1;

    IF v_exists IS NOT NULL THEN
      CONTINUE; -- ya existe, no crear duplicado
    END IF;

    -- Determinar academic_block por nombre de asignatura
    v_block := CASE
      WHEN lower(rec.subject_name) LIKE '%math%'
        OR lower(rec.subject_name) LIKE '%english%'
        OR lower(rec.subject_name) LIKE '%word building%'
        OR lower(rec.subject_name) LIKE '%science%'
        OR lower(rec.subject_name) LIKE '%social studies%'
        OR lower(rec.subject_name) LIKE '%bible%'
        THEN 'Core A.C.E.'
      WHEN lower(rec.subject_name) LIKE '%lengua%'
        OR lower(rec.subject_name) LIKE '%castellana%'
        OR lower(rec.subject_name) LIKE '%local history%'
        OR lower(rec.subject_name) LIKE '%local geography%'
        OR lower(rec.subject_name) LIKE '%spanish%'
        THEN 'Extensión Local'
      WHEN lower(rec.subject_name) LIKE '%art%'
        OR lower(rec.subject_name) LIKE '%music%'
        OR lower(rec.subject_name) LIKE '%technology%'
        OR lower(rec.subject_name) LIKE '%physical%'
        OR lower(rec.subject_name) LIKE '%life skills%'
        THEN 'Life Skills'
      ELSE 'Core A.C.E.'
    END;

    INSERT INTO public.student_subjects (
      student_id, subject_name, quarter, school_year,
      academic_block, grade_submission_status, submitted_at
    ) VALUES (
      rec.student_id, rec.subject_name, rec.quarter, rec.school_year,
      v_block, 'draft', now()
    );

    RAISE NOTICE 'Creado student_subject: % - % - % [%]',
      rec.subject_name, rec.quarter, rec.school_year, v_block;
  END LOOP;
END;
$$;

-- ══════════════════════════════════════════════════════════════
-- PASO 4 — Vincular grade_entries huérfanas (student_subject_id = null)
--           con la fila de student_subjects recién creada o existente
-- ══════════════════════════════════════════════════════════════
UPDATE public.student_grade_entries ge
SET student_subject_id = ss.id
FROM public.student_subjects ss
JOIN public.students s ON s.id = ss.student_id
WHERE ge.student_id = ss.student_id
  AND ge.school_year = ss.school_year
  AND ge.quarter     = ss.quarter
  -- Extraer nombre de asignatura del assessment_name (ej "PACE 1073" no tiene nombre)
  -- Para este caso especial, el subject_name debe coincidir entre ge y ss
  -- ge no tiene subject_name directamente — se usa student_subject_id
  AND ge.student_subject_id IS NULL
  AND (
    (lower(s.first_name) LIKE '%daniel%' AND lower(s.last_name) LIKE '%vidal%')
    OR (lower(s.first_name) LIKE '%anais%' AND lower(s.last_name) LIKE '%vidal%')
    OR (lower(s.first_name) LIKE '%anaís%' AND lower(s.last_name) LIKE '%vidal%')
  );

-- ══════════════════════════════════════════════════════════════
-- PASO 5 — Marcar student_subjects como 'approved' donde hay
--           grade_entries con submission_status = 'approved'
-- ══════════════════════════════════════════════════════════════
UPDATE public.student_subjects ss
SET grade_submission_status = 'approved',
    grade_reviewed_at        = now()
WHERE ss.id IN (
  SELECT DISTINCT ge.student_subject_id
  FROM public.student_grade_entries ge
  WHERE ge.submission_status = 'approved'
    AND ge.score IS NOT NULL
    AND ge.student_subject_id IS NOT NULL
)
AND ss.grade_submission_status <> 'approved'
AND ss.student_id IN (
  SELECT id FROM public.students
  WHERE (lower(first_name) LIKE '%daniel%' AND lower(last_name) LIKE '%vidal%')
     OR (lower(first_name) LIKE '%anais%'  AND lower(last_name) LIKE '%vidal%')
     OR (lower(first_name) LIKE '%anaís%'  AND lower(last_name) LIKE '%vidal%')
);

-- ══════════════════════════════════════════════════════════════
-- PASO 6 — Verificación final
-- ══════════════════════════════════════════════════════════════
SELECT
  s.first_name || ' ' || s.last_name AS estudiante,
  ss.subject_name, ss.quarter, ss.academic_block,
  ss.grade_submission_status,
  count(ge.id)                        AS entradas_grade,
  count(case when ge.submission_status = 'approved' then 1 end) AS aprobadas,
  avg(ge.score)                       AS promedio
FROM public.students s
JOIN public.student_subjects ss ON ss.student_id = s.id
LEFT JOIN public.student_grade_entries ge
  ON ge.student_subject_id = ss.id
  AND ge.school_year = ss.school_year
  AND ge.quarter = ss.quarter
WHERE ss.school_year = '2025-2026'
  AND (
    (lower(s.first_name) LIKE '%daniel%' AND lower(s.last_name) LIKE '%vidal%')
    OR (lower(s.first_name) LIKE '%anais%' AND lower(s.last_name) LIKE '%vidal%')
    OR (lower(s.first_name) LIKE '%anaís%' AND lower(s.last_name) LIKE '%vidal%')
  )
GROUP BY s.first_name, s.last_name, ss.subject_name, ss.quarter,
         ss.academic_block, ss.grade_submission_status
ORDER BY s.first_name, ss.quarter, ss.subject_name;
