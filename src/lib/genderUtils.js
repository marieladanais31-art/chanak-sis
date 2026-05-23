/**
 * genderUtils.js — Chanak International Academy
 * Helper centralizado para lenguaje con concordancia de género en español.
 */

/**
 * Normaliza el valor de género a 'male', 'female' o 'unknown'.
 */
export function normalizeGender(gender) {
  if (!gender) return 'unknown';
  const g = String(gender).toLowerCase().trim();
  if (['female', 'f', 'femenino', 'femenina', 'mujer', 'niña', 'chica'].includes(g)) return 'female';
  if (['male', 'm', 'masculino', 'masculina', 'hombre', 'niño', 'chico'].includes(g)) return 'male';
  return 'unknown';
}

/** Devuelve 'el', 'la' o 'el/la' según género. */
export function getGenderedArticle(gender) {
  const g = normalizeGender(gender);
  if (g === 'female') return 'la';
  if (g === 'male') return 'el';
  return 'el/la';
}

/**
 * Devuelve la forma masculina o femenina según género.
 * Si no hay género, devuelve "masculino/femenino".
 */
export function getGenderedNoun(gender, masculine, feminine) {
  const g = normalizeGender(gender);
  if (g === 'female') return feminine;
  if (g === 'male') return masculine;
  return `${masculine}/${feminine}`;
}

/** "el estudiante" | "la estudiante" | "el/la estudiante" */
export function getGenderedEstudiante(gender) {
  return `${getGenderedArticle(gender)} estudiante`;
}

/** "matriculado" | "matriculada" | "matriculado/a" */
export function getGenderedMatriculado(gender) {
  return getGenderedNoun(gender, 'matriculado', 'matriculada');
}

/** "inscrito" | "inscrita" | "inscrito/a" */
export function getGenderedInscrito(gender) {
  return getGenderedNoun(gender, 'inscrito', 'inscrita');
}

/** "alumno activo" | "alumna activa" | "alumno/a activo/a" */
export function getGenderedAlumnoActivo(gender) {
  const noun = getGenderedNoun(gender, 'alumno', 'alumna');
  const adj  = getGenderedNoun(gender, 'activo', 'activa');
  return `${noun} ${adj}`;
}
