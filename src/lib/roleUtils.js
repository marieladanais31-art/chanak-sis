/**
 * roleUtils.js
 * Fuente única de verdad para normalización y enrutamiento de roles en el SIS.
 *
 * Reglas canónicas:
 *   family     → parent    (alias legacy)
 *   mentor     → tutor     (alias legacy)
 *   super_admin → admin    (solo para UI / rutas; permisos DB se mantienen)
 *   admin      → admin
 *   coordinator→ coordinator
 *   parent     → parent
 *   tutor      → tutor
 *   student    → student
 *   cualquier otro valor → 'unknown'
 *
 * IMPORTANTE: normalizeRole() nunca eleva permisos. Solo normaliza
 * aliases UI. Las RPCs y políticas RLS en Supabase reciben el rol real.
 */

/** Mapa canónico: rol raw → rol normalizado para UI/rutas */
const ROLE_MAP = {
  super_admin: 'admin',
  admin:       'admin',
  coordinator: 'coordinator',
  tutor:       'tutor',
  mentor:      'tutor',   // alias legacy
  parent:      'parent',
  family:      'parent',  // alias legacy
  student:     'student',
};

/**
 * Normaliza el rol de un usuario para uso en enrutamiento y UI.
 * @param {string|null|undefined} role — valor crudo de profiles.role
 * @returns {'admin'|'coordinator'|'tutor'|'parent'|'student'|'unknown'}
 */
export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return 'unknown';
  return ROLE_MAP[role.trim().toLowerCase()] ?? 'unknown';
}

/**
 * Retorna la ruta raíz del dashboard para un rol normalizado.
 * @param {string} role — rol crudo o normalizado
 * @returns {string} — ruta destino, ej. '/admin'
 */
export function getDashboardPath(role) {
  switch (normalizeRole(role)) {
    case 'admin':       return '/admin';
    case 'coordinator': return '/coordinator';
    case 'tutor':       return '/tutor';
    case 'parent':      return '/parent';
    case 'student':     return '/student';
    default:            return '/login';
  }
}

/**
 * Retorna true si el rol raw corresponde a un rol conocido (incluyendo aliases).
 * @param {string|null|undefined} role
 */
export function isKnownRole(role) {
  return normalizeRole(role) !== 'unknown';
}

/**
 * Lista de todos los roles raw válidos aceptados por el sistema.
 * Útil para KNOWN_ROLES en ProtectedRoute.
 */
export const ALL_VALID_ROLES = Object.keys(ROLE_MAP);
// ['super_admin','admin','coordinator','tutor','mentor','parent','family','student']
