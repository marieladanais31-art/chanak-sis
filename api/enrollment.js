/* eslint-env node */
/**
 * api/enrollment.js — Vercel serverless proxy
 * Recibe el formulario de matrícula y lo reenvía a Zapier server-side (sin CORS).
 * Los documentos son opcionales — la familia puede enviarlos después por correo.
 */

const ZAPIER_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/27757659/4bsxiu9/';

// Solo estos campos son obligatorios — documentos NO
const REQUIRED_FIELDS = [
  'programa', 'añoEscolar', 'fechaInicio',
  'alumNombre', 'alumApellidos', 'alumFechaNac',
  'tutNombre', 'tutEmail', 'tutTel', 'gradeSelected',
];

// eslint-disable-next-line no-undef
const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

function log(...args) {
  // Siempre loguear en servidor para poder diagnosticar en Vercel Logs
  console.log('[enrollment]', ...args);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
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

  log('API ENROLLMENT RECEIVED fields:', Object.keys(body));

  // ── Validar campos obligatorios (sin documentos) ─────────────────────────────
  const missing = REQUIRED_FIELDS.filter(f => !body[f] || !String(body[f]).trim());
  if (missing.length > 0) {
    log('Missing required fields:', missing);
    return res.status(422).json({
      ok: false,
      error: `Faltan campos obligatorios: ${missing.join(', ')}`,
    });
  }

  // ── Validar email tutor ──────────────────────────────────────────────────────
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(body.tutEmail || '')) {
    return res.status(422).json({ ok: false, error: 'El email del tutor no es válido' });
  }

  // ── Construir payload plano para Zapier ───────────────────────────────────────
  // Todos los campos al nivel raíz — sin objetos anidados.
  // Los documentos van como string vacío si no se proporcionaron.
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
    // Documentos — opcionales, pueden estar vacíos
    tutorIdDocumentUrl:         String(body.tutorIdDocumentUrl         || '').trim(),
    studentIdDocumentUrl:       String(body.studentIdDocumentUrl       || '').trim(),
    reportCardsLastTwoYearsUrl: String(body.reportCardsLastTwoYearsUrl || '').trim(),
    neeDocumentsUrl:            String(body.neeDocumentsUrl            || '').trim(),
    documentsNotes:             String(body.documentsNotes             || '').trim(),
    // Metadatos
    stripePaymentLink:          'https://buy.stripe.com/aFa7sMgjLcBvfvW2NQ67S0c',
    paymentStatus:              'Pendiente de pago',
    fechaEnvio:                 new Date().toISOString(),
    origen:                     'Formulario público /matricula',
  };

  log('ZAPIER PAYLOAD SENT (keys):', Object.keys(zapierPayload));
  log('ZAPIER PAYLOAD folioSIS:', zapierPayload.folioSIS, '| tutEmail:', zapierPayload.tutEmail);

  // ── Reenviar a Zapier ─────────────────────────────────────────────────────────
  let zapierRes;
  let zapierText = '';
  try {
    zapierRes = await fetch(ZAPIER_WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(zapierPayload),
    });
    zapierText = await zapierRes.text().catch(() => '');
  } catch (fetchErr) {
    log('Fetch to Zapier FAILED:', fetchErr.message);
    return res.status(502).json({ ok: false, error: `Error de red al contactar Zapier: ${fetchErr.message}` });
  }

  log('ZAPIER RESPONSE STATUS:', zapierRes.status);
  log('ZAPIER RESPONSE TEXT:', zapierText);

  if (!zapierRes.ok) {
    return res.status(502).json({ ok: false, error: `Zapier respondió con status ${zapierRes.status}: ${zapierText}` });
  }

  log('Zapier OK — folio:', zapierPayload.folioSIS);
  return res.status(200).json({ ok: true, folioSIS: zapierPayload.folioSIS });
}
