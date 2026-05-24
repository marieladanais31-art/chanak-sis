/**
 * schoolYears.js — Fuente única de verdad para años académicos Chanak SIS
 *
 * Importar desde aquí en componentes nuevos; academicUtils.js re-exporta
 * las mismas constantes para compatibilidad con código existente.
 */
export {
  ACTIVE_SCHOOL_YEAR,
  HISTORICAL_SCHOOL_YEAR,
  FUTURE_SCHOOL_YEAR,
  ACADEMIC_YEARS,
} from '@/lib/academicUtils';

/**
 * Metadatos de cada año escolar.
 * phase:
 *   'historical' — cerrado, solo lectura; datos migrables a archivo.
 *   'active'     — año en curso; toda operación normal aquí.
 *   'future'     — disponible en selectores pero sin datos automáticos.
 */
export const SCHOOL_YEAR_CONFIG = [
  {
    year: '2024-2025',
    phase: 'historical',
    label: '2024–2025',
    description: 'Año histórico — solo lectura y archivo',
    startDate: '2024-09-01',
    endDate:   '2025-07-18',
  },
  {
    year: '2025-2026',
    phase: 'active',
    label: '2025–2026 (Activo)',
    description: 'Año académico en curso',
    startDate: '2025-09-01',
    endDate:   '2026-07-17',
  },
  {
    year: '2026-2027',
    phase: 'future',
    label: '2026–2027',
    description: 'Próximo año — configuración disponible, sin datos',
    startDate: '2026-09-01',
    endDate:   '2027-07-16',
  },
];

/** Devuelve el config de un año dado, o undefined si no existe. */
export function getYearConfig(year) {
  return SCHOOL_YEAR_CONFIG.find((c) => c.year === year);
}

/** Devuelve true si el año es histórico (cerrado). */
export function isHistoricalYear(year) {
  return getYearConfig(year)?.phase === 'historical';
}

/** Devuelve true si el año es el activo en curso. */
export function isActiveYear(year) {
  return getYearConfig(year)?.phase === 'active';
}

/** Devuelve true si el año es futuro (sin datos automáticos). */
export function isFutureYear(year) {
  return getYearConfig(year)?.phase === 'future';
}
