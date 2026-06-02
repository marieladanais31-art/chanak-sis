/* eslint-env node */
/**
 * api/enrollment.js — Vercel serverless proxy
 * Recibe el formulario de matrícula del frontend y lo reenvía a Zapier server-side.
 * Evita el problema de CORS al hacer el fetch desde el servidor, no desde el navegador.
 *
 * Endpoint: POST /api/enrollment
 * No guarda en Supabase. No crea usuarios. No aprueba solicitudes.
 */

const ZAPIER_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/27757659/4bsxiu9/';

const REQUIRED_FIELDS = [
  'programa', 'añoEscolar', 'fechaInicio',
  'alumNombre', 'alumApellidos', 'alumFechaNac',
  'tutNombre', 'tutEmail', 'tutTel', 'gradeSelected',
  'tutorIdDocumentUrl', 'studentIdDocumentUrl', 'reportCardsLastTwoYearsUrl',
];

const URL_FIELDS = ['tutorIdDocumentUrl', 'studentIdDocumentUrl', 'reportCardsLastTwoYearsUrl'];

// eslint-disable-next-line no-undef
const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

function log(...args) {
  if (isDev) console.log('[enrollment]', ...args);
}

export default async function handler(req, res) {
  // ── CORS — permite peticiones desde el mismo dominio ────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  // ── Leer body ────────────────────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object') throw new Error('Body vacío o no es JSON');
  } catch (err) {
    log('Body parse error:', err.message);
    return res.status(400).json({ ok: false, error: 'JSON inválido en el body' });
  }

  // ── Validar campos obligatorios ──────────────────────────────────────────────
  const missing = REQUIRED_FIELDS.filter(f => !body[f] || !String(body[f]).trim());
  if (missing.length > 0) {
    log('Missing fields:', missing);
    return res.status(422).json({
      ok: false,
      error: `Faltan campos obligatorios: ${missing.join(', ')}`,
    });
  }

  // ── Validar URLs ─────────────────────────────────────────────────────────────
  for (const field of URL_FIELDS) {
    const val = String(body[field] || '').trim();
    if (!val.startsWith('https://')) {
      return res.status(422).json({
        ok: false,
        error: `El campo "${field}" debe comenzar con https://`,
      });
    }
  }

  // ── Validar email tutor ──────────────────────────────────────────────────────
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(body.tutEmail || '')) {
    return res.status(422).json({ ok: false, error: 'El email del tutor no es válido' });
  }

  // ── Construir payload hacia Zapier ───────────────────────────────────────────
  const payload = {
    // Identificación
    folioSIS:       body.folioSIS       || '',
    // Paso 1
    programa:       String(body.programa       || '').trim(),
    añoEscolar:     String(body.añoEscolar     || '').trim(),
    fechaInicio:    String(body.fechaInicio    || '').trim(),
    referencia:     String(body.referencia     || '').trim(),
    // Paso 2
    alumNombre:     String(body.alumNombre     || '').trim(),
    alumApellidos:  String(body.alumApellidos  || '').trim(),
    alumFechaNac:   String(body.alumFechaNac   || '').trim(),
    alumGenero:     String(body.alumGenero     || '').trim(),
    alumNacional:   String(body.alumNacional   || '').trim(),
    alumPais:       String(body.alumPais       || '').trim(),
    alumCiudad:     String(body.alumCiudad     || '').trim(),
    alumDNI:        String(body.alumDNI        || '').trim(),
    alumIdioma:     String(body.alumIdioma     || '').trim(),
    gradeSelected:  String(body.gradeSelected  || '').trim(),
    neeCheck:       String(body.neeCheck       || 'No').trim(),
    neeDesc:        String(body.neeDesc        || '').trim(),
    // Paso 3
    tutNombre:      String(body.tutNombre      || '').trim(),
    tutRelacion:    String(body.tutRelacion    || '').trim(),
    tutEmail:       String(body.tutEmail       || '').trim().toLowerCase(),
    tutTel:         String(body.tutTel         || '').trim(),
    tutPais:        String(body.tutPais        || '').trim(),
    tutCiudad:      String(body.tutCiudad      || '').trim(),
    tutDireccion:   String(body.tutDireccion   || '').trim(),
    tut2Nombre:     String(body.tut2Nombre     || '').trim(),
    tut2Email:      String(body.tut2Email      || '').trim().toLowerCase(),
    tut2Tel:        String(body.tut2Tel        || '').trim(),
    // Paso 4
    instAnterior:   String(body.instAnterior   || '').trim(),
    instPais:       String(body.instPais       || '').trim(),
    nivelIngles:    String(body.nivelIngles    || '').trim(),
    aceExp:         String(body.aceExp         || 'No').trim(),
    fortalezas:     String(body.fortalezas     || '').trim(),
    dificultades:   String(body.dificultades   || '').trim(),
    motivacion:     String(body.motivacion     || '').trim(),
    cosmovis:       String(body.cosmovis       || '').trim(),
    // Paso 5 — Documentación Drive
    tutorIdDocumentUrl:          String(body.tutorIdDocumentUrl          || '').trim(),
    studentIdDocumentUrl:        String(body.studentIdDocumentUrl        || '').trim(),
    reportCardsLastTwoYearsUrl:  String(body.reportCardsLastTwoYearsUrl  || '').trim(),
    neeDocumentsUrl:             String(body.neeDocumentsUrl             || 'No aplica').trim(),
    documentsNotes:              String(body.documentsNotes              || 'No proporcionado').trim(),
    // Pago y metadatos
    stripePaymentLink: 'https://buy.stripe.com/aFa7sMgjLcBvfvW2NQ67S0c',
    paymentStatus:     'Pendiente de pago',
    fechaEnvio:        new Date().toISOString(),
    origen:            'Formulario público /matricula',
  };

  log('Sending payload to Zapier, folio:', payload.folioSIS);

  // ── Reenviar a Zapier (server-side, sin CORS) ────────────────────────────────
  let zapierRes;
  try {
    zapierRes = await fetch(ZAPIER_WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch (fetchErr) {
    log('Fetch to Zapier failed:', fetchErr.message);
    return res.status(502).json({
      ok: false,
      error: `Error de red al contactar Zapier: ${fetchErr.message}`,
    });
  }

  if (!zapierRes.ok) {
    const zapBody = await zapierRes.text().catch(() => '');
    log('Zapier non-OK:', zapierRes.status, zapBody);
    return res.status(502).json({
      ok:    false,
      error: `Zapier respondió con status ${zapierRes.status}`,
    });
  }

  log('Zapier OK, folio:', payload.folioSIS);
  return res.status(200).json({ ok: true, folioSIS: payload.folioSIS });
}
