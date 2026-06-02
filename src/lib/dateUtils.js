/**
 * dateUtils.js — Helpers de normalización de fechas para Supabase / PostgreSQL.
 *
 * PostgreSQL columnas DATE esperan formato ISO: yyyy-mm-dd o NULL.
 * Strings vacíos ('') causan error "invalid input syntax for type date".
 */

/**
 * Normaliza cualquier valor de fecha al formato yyyy-mm-dd aceptado por PostgreSQL,
 * o devuelve null si la fecha está vacía o no es reconocible.
 *
 * Casos manejados:
 *   ''              → null
 *   null/undefined  → null
 *   'yyyy-mm-dd'    → 'yyyy-mm-dd'   (ya ISO, devuelve tal cual)
 *   'dd/mm/yyyy'    → 'yyyy-mm-dd'   (formato español → ISO)
 *   cualquier otro  → devuelve el valor original (no rompe)
 *
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
export function normalizeDateForDb(value) {
  if (!value) return null;
  if (typeof value !== 'string') return value;
  const v = value.trim();
  if (!v) return null;

  // Ya está en formato ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;

  // Formato español dd/mm/yyyy
  const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Cualquier otro formato: devolver sin tocar (no romper)
  return v;
}

/**
 * Aplica normalizeDateForDb a un subconjunto de campos de un objeto payload.
 * Muta el payload directamente y lo devuelve por conveniencia.
 *
 * @param {Object}   payload    - objeto a normalizar
 * @param {string[]} dateFields - lista de claves que son columnas DATE
 * @returns {Object} el mismo payload mutado
 */
export function normalizeDateFields(payload, dateFields) {
  dateFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      payload[field] = normalizeDateForDb(payload[field]);
    }
  });
  return payload;
}
