/* eslint-env node */
/**
 * api/enrollment.js — Vercel serverless proxy
 * Recibe el formulario de matrícula y lo reenvía a Zapier server-side.
 * El webhook URL viene SOLO de la variable de entorno:
 *   ZAPIER_ENROLLMENT_WEBHOOK_URL
 * Nunca hardcodeado en el código fuente.
 */

const REQUIRED_FIELDS = [
  'programa', 'añoEscolar', 'fechaInicio',
  'alumNombre', 'alumApellidos', 'alumFechaNac',
  'tutNombre', 'tutEmail', 'tutTel', 'gradeSelected',
];

/**
 * Lee el body robustamente:
 * 1. req.body ya es objeto (Vercel lo parseó) → usar directamente
 * 2. req.body es string JSON → parsear
 * 3. Fallback: leer stream y parsear
 */
async function readBodySafe(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    console.log('BODY_SOURCE: parsed-object');
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    console.log('BODY_SOURCE: string');
    return JSON.parse(req.body);
  }
  console.log('BODY_SOURCE: stream');
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

  console.log('API METHOD:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  // ── Webhook desde variable de entorno ÚNICAMENTE ──────────────────────────
  const webhookUrl = process.env.ZAPIER_ENROLLMENT_WEBHOOK_URL;
  console.log('ZAPIER WEBHOOK EXISTS:', Boolean(webhookUrl));
  if (!webhookUrl) {
    console.log('ERROR: ZAPIER_ENROLLMENT_WEBHOOK_URL no definida en Vercel');
    return res.status(500).json({ ok: false, error: 'Configuración de servidor incompleta. Contacte con el administrador.' });
  }

  // ── Leer body ─────────────────────────────────────────────────────────────
  let body;
  try {
    body = await readBodySafe(req);
  } catch (err) {
    console.log('BODY PARSE ERROR:', err.message);
    return res.status(400).json({ ok: false, error: 'JSON inválido: ' + err.message });
  }

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Body vacío o formato incorrecto' });
  }

  console.log('API ENROLLMENT RECEIVED:', JSON.stringify(body).substring(0, 400));

  // ── Validar campos obligatorios ───────────────────────────────────────────
  const missing = REQUIRED_FIELDS.filter(f => !body[f] || !String(body[f]).trim());
  if (missing.length > 0) {
    console.log('MISSING FIELDS:', missing);
    return res.status(422).json({ ok: false, error: 'Faltan campos: ' + missing.join(', ') });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.tutEmail || '')) {
    return res.status(422).json({ ok: false, error: 'Email del tutor no válido' });
  }

  // ── Payload plano para Zapier ─────────────────────────────────────────────
  const s = (v) => String(v || '').trim();

  const zapierPayload = {
    folioSIS:                   s(body.folioSIS),
    programa:                   s(body.programa),
    añoEscolar:                 s(body.añoEscolar),
    fechaInicio:                s(body.fechaInicio),
    referencia:                 s(body.referencia),
    alumNombre:                 s(body.alumNombre),
    alumApellidos:              s(body.alumApellidos),
    alumFechaNac:               s(body.alumFechaNac),
    alumGenero:                 s(body.alumGenero),
    alumNacional:               s(body.alumNacional),
    alumPais:                   s(body.alumPais),
    alumCiudad:                 s(body.alumCiudad),
    alumDNI:                    s(body.alumDNI),
    alumIdioma:                 s(body.alumIdioma),
    gradeSelected:              s(body.gradeSelected),
    neeCheck:                   s(body.neeCheck) || 'No',
    neeDesc:                    s(body.neeDesc),
    tutNombre:                  s(body.tutNombre),
    tutRelacion:                s(body.tutRelacion),
    tutEmail:                   s(body.tutEmail).toLowerCase(),
    tutTel:                     s(body.tutTel),
    tutPais:                    s(body.tutPais),
    tutCiudad:                  s(body.tutCiudad),
    tutDireccion:               s(body.tutDireccion),
    tut2Nombre:                 s(body.tut2Nombre),
    tut2Email:                  s(body.tut2Email).toLowerCase(),
    tut2Tel:                    s(body.tut2Tel),
    instAnterior:               s(body.instAnterior),
    instPais:                   s(body.instPais),
    nivelIngles:                s(body.nivelIngles),
    aceExp:                     s(body.aceExp) || 'No',
    fortalezas:                 s(body.fortalezas),
    dificultades:               s(body.dificultades),
    motivacion:                 s(body.motivacion),
    cosmovis:                   s(body.cosmovis),
    tutorIdDocumentUrl:         s(body.tutorIdDocumentUrl),
    studentIdDocumentUrl:       s(body.studentIdDocumentUrl),
    reportCardsLastTwoYearsUrl: s(body.reportCardsLastTwoYearsUrl),
    neeDocumentsUrl:            s(body.neeDocumentsUrl),
    documentsNotes:             s(body.documentsNotes),
    stripePaymentLink:          s(body.stripePaymentLink),
    paymentStatus:              s(body.paymentStatus) || 'Pendiente de pago',
    fechaEnvio:                 s(body.fechaEnvio) || new Date().toISOString(),
    origen:                     s(body.origen) || 'Formulario público /matricula',
  };

  console.log('ZAPIER PAYLOAD SENT:', JSON.stringify(zapierPayload).substring(0, 500));

  // ── POST a Zapier (server-side, sin CORS) ─────────────────────────────────
  let zapierResponse;
  let zapierText = '';
  try {
    zapierResponse = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(zapierPayload),
    });
    zapierText = await zapierResponse.text().catch(() => '');
  } catch (fetchErr) {
    console.log('ZAPIER FETCH ERROR:', fetchErr.message);
    return res.status(502).json({ ok: false, error: 'Error de red: ' + fetchErr.message });
  }

  console.log('ZAPIER RESPONSE STATUS:', zapierResponse.status);
  console.log('ZAPIER RESPONSE TEXT:', zapierText);

  if (!zapierResponse.ok) {
    return res.status(502).json({ ok: false, error: `Zapier ${zapierResponse.status}: ${zapierText}` });
  }

  return res.status(200).json({ ok: true, folioSIS: zapierPayload.folioSIS });
}
