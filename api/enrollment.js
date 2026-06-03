/* eslint-env node */
/**
 * api/enrollment.js — Vercel serverless proxy
 * Recibe el formulario de matrícula y lo reenvía a Zapier server-side.
 * Documentos opcionales. Body leído de forma robusta (stream + parsed).
 */

// Webhook: soporta variable de entorno o fallback hardcoded
// eslint-disable-next-line no-undef
const ZAPIER_WEBHOOK =
  // eslint-disable-next-line no-undef
  (typeof process !== 'undefined' && process.env.ZAPIER_ENROLLMENT_WEBHOOK_URL)
    ? process.env.ZAPIER_ENROLLMENT_WEBHOOK_URL
    : 'https://hooks.zapier.com/hooks/catch/27757659/4bsxiu9/';

// Campos que SÍ son obligatorios (documentos NO)
const REQUIRED_FIELDS = [
  'programa', 'añoEscolar', 'fechaInicio',
  'alumNombre', 'alumApellidos', 'alumFechaNac',
  'tutNombre', 'tutEmail', 'tutTel', 'gradeSelected',
];

/**
 * Lee el body de la request de forma robusta:
 * - Si req.body ya está parseado (objeto) → lo usa directamente
 * - Si req.body es string JSON → lo parsea
 * - Si es stream → lo lee y parsea
 */
async function readBodySafe(req) {
  // Caso 1: Vercel ya parseó el body como objeto
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    console.log('API BODY SOURCE: already-parsed object');
    return req.body;
  }
  // Caso 2: body es string
  if (typeof req.body === 'string' && req.body.trim()) {
    console.log('API BODY SOURCE: string');
    return JSON.parse(req.body);
  }
  // Caso 3: leer del stream (fallback)
  console.log('API BODY SOURCE: stream');
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk.toString(); });
    req.on('end', () => {
      try { resolve(raw.trim() ? JSON.parse(raw) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  console.log('API METHOD', req.method);
  console.log('API CONTENT-TYPE', req.headers['content-type']);
  // eslint-disable-next-line no-undef
  console.log('ZAPIER WEBHOOK EXISTS', Boolean(typeof process !== 'undefined' && process.env.ZAPIER_ENROLLMENT_WEBHOOK_URL));
  console.log('ZAPIER WEBHOOK URL (primeros 50 chars)', ZAPIER_WEBHOOK.substring(0, 50));

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  // ── Leer body ────────────────────────────────────────────────────────────────
  let body;
  try {
    body = await readBodySafe(req);
    console.log('API RAW BODY (type)', typeof body);
    console.log('API RAW BODY (keys)', body ? Object.keys(body) : 'null/undefined');
  } catch (err) {
    console.log('API BODY PARSE ERROR', err.message);
    return res.status(400).json({ ok: false, error: 'JSON inválido en el body: ' + err.message });
  }

  if (!body || typeof body !== 'object') {
    console.log('API BODY EMPTY OR NOT OBJECT', body);
    return res.status(400).json({ ok: false, error: 'Body vacío o formato incorrecto' });
  }

  console.log('API ENROLLMENT RECEIVED', JSON.stringify(body).substring(0, 500));

  // ── Validar campos obligatorios ──────────────────────────────────────────────
  const missing = REQUIRED_FIELDS.filter(f => !body[f] || !String(body[f]).trim());
  if (missing.length > 0) {
    console.log('API MISSING REQUIRED FIELDS', missing);
    return res.status(422).json({ ok: false, error: `Faltan campos: ${missing.join(', ')}` });
  }

  // ── Validar email tutor ──────────────────────────────────────────────────────
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.tutEmail || '')) {
    return res.status(422).json({ ok: false, error: 'El email del tutor no es válido' });
  }

  // ── Construir payload PLANO para Zapier ───────────────────────────────────────
  // Todos los campos al nivel raíz, sin objetos anidados.
  const zapierPayload = {
    folioSIS:                   String(body.folioSIS                   || '').trim(),
    programa:                   String(body.programa                   || '').trim(),
    añoEscolar:                 String(body.añoEscolar                 || '').trim(),
    fechaInicio:                String(body.fechaInicio                || '').trim(),
    referencia:                 String(body.referencia                 || '').trim(),
    alumNombre:                 String(body.alumNombre                 || '').trim(),
    alumApellidos:              String(body.alumApellidos              || '').trim(),
    alumFechaNac:               String(body.alumFechaNac               || '').trim(),
    alumGenero:                 String(body.alumGenero                 || '').trim(),
    alumNacional:               String(body.alumNacional               || '').trim(),
    alumPais:                   String(body.alumPais                   || '').trim(),
    alumCiudad:                 String(body.alumCiudad                 || '').trim(),
    alumDNI:                    String(body.alumDNI                    || '').trim(),
    alumIdioma:                 String(body.alumIdioma                 || '').trim(),
    gradeSelected:              String(body.gradeSelected              || '').trim(),
    neeCheck:                   String(body.neeCheck                   || 'No').trim(),
    neeDesc:                    String(body.neeDesc                    || '').trim(),
    tutNombre:                  String(body.tutNombre                  || '').trim(),
    tutRelacion:                String(body.tutRelacion                || '').trim(),
    tutEmail:                   String(body.tutEmail                   || '').trim().toLowerCase(),
    tutTel:                     String(body.tutTel                     || '').trim(),
    tutPais:                    String(body.tutPais                    || '').trim(),
    tutCiudad:                  String(body.tutCiudad                  || '').trim(),
    tutDireccion:               String(body.tutDireccion               || '').trim(),
    tut2Nombre:                 String(body.tut2Nombre                 || '').trim(),
    tut2Email:                  String(body.tut2Email                  || '').trim().toLowerCase(),
    tut2Tel:                    String(body.tut2Tel                    || '').trim(),
    instAnterior:               String(body.instAnterior               || '').trim(),
    instPais:                   String(body.instPais                   || '').trim(),
    nivelIngles:                String(body.nivelIngles                || '').trim(),
    aceExp:                     String(body.aceExp                     || 'No').trim(),
    fortalezas:                 String(body.fortalezas                 || '').trim(),
    dificultades:               String(body.dificultades               || '').trim(),
    motivacion:                 String(body.motivacion                 || '').trim(),
    cosmovis:                   String(body.cosmovis                   || '').trim(),
    tutorIdDocumentUrl:         String(body.tutorIdDocumentUrl         || '').trim(),
    studentIdDocumentUrl:       String(body.studentIdDocumentUrl       || '').trim(),
    reportCardsLastTwoYearsUrl: String(body.reportCardsLastTwoYearsUrl || '').trim(),
    neeDocumentsUrl:            String(body.neeDocumentsUrl            || '').trim(),
    documentsNotes:             String(body.documentsNotes             || '').trim(),
    stripePaymentLink:          String(body.stripePaymentLink          || 'https://buy.stripe.com/aFa7sMgjLcBvfvW2NQ67S0c'),
    paymentStatus:              String(body.paymentStatus              || 'Pendiente de pago'),
    fechaEnvio:                 String(body.fechaEnvio                 || new Date().toISOString()),
    origen:                     String(body.origen                     || 'Formulario público /matricula'),
  };

  console.log('ZAPIER PAYLOAD SENT', JSON.stringify(zapierPayload).substring(0, 600));

  // ── POST a Zapier ─────────────────────────────────────────────────────────────
  let zapierResponse;
  let zapierText = '';
  try {
    zapierResponse = await fetch(ZAPIER_WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(zapierPayload),
    });
    zapierText = await zapierResponse.text().catch(() => '');
  } catch (fetchErr) {
    console.log('ZAPIER FETCH ERROR', fetchErr.message);
    return res.status(502).json({ ok: false, error: 'Error de red al contactar Zapier: ' + fetchErr.message });
  }

  console.log('ZAPIER RESPONSE STATUS', zapierResponse.status);
  console.log('ZAPIER RESPONSE TEXT', zapierText);

  if (!zapierResponse.ok) {
    return res.status(502).json({ ok: false, error: `Zapier ${zapierResponse.status}: ${zapierText}` });
  }

  console.log('SUCCESS — folio:', zapierPayload.folioSIS);
  return res.status(200).json({ ok: true, folioSIS: zapierPayload.folioSIS });
}
