// ── Constantes de estado de documentos ───────────────────────────────────────
export const OFFICIAL_DOCUMENT_LANGUAGES    = ['es', 'en'];
export const OFFICIAL_DOCUMENT_STATUSES     = ['draft', 'sent', 'signed', 'published', 'archived'];
export const FAMILY_DOWNLOAD_STATUSES       = ['sent', 'signed', 'published'];
export const PUBLISHED_DOWNLOAD_STATUSES    = ['published'];

export const normalizeDocumentLanguage = (language) => (
  OFFICIAL_DOCUMENT_LANGUAGES.includes(language) ? language : 'es'
);

export const canDownloadOfficialDocument = ({ status, role, publishedOnly = false }) => {
  const normalizedRole = String(role || '').toLowerCase();
  if (['admin', 'super_admin', 'coordinator'].includes(normalizedRole)) return true;
  return (publishedOnly ? PUBLISHED_DOWNLOAD_STATUSES : FAMILY_DOWNLOAD_STATUSES).includes(status);
};

// ── Getters institucionales ───────────────────────────────────────────────────

/**
 * Resuelve todos los datos institucionales desde settings con aliases + fallbacks.
 * Usar en todos los generadores PDF en lugar de accesos directos a settings.
 */
export function getInstitutionInfo(settings) {
  return {
    name:          settings?.institution_name   || settings?.school_name             || 'Chanak International Academy',
    address:       settings?.address            || settings?.institution_address      || settings?.school_address || '4883 NW 107th Path, Doral, FL 33178, USA',
    email:         settings?.administration_email || settings?.email || settings?.contact_email || 'administration@chanakacademy.org',
    website:       settings?.website            || settings?.web_url                  || 'chanakacademy.org',
    fldoe:         settings?.fldoe_number       || settings?.fldoe_registration       || settings?.fldoe || '134620',
    ein:           settings?.ein               || settings?.ein_number                || '36-5154011',
    msa:           formatMsaStatus(settings, 'en', true),
    footer:        settings?.document_footer    || settings?.footer_text              || null,
    directorName:  settings?.director_name      || settings?.head_of_school_name      || 'Mariela Andrade',
    directorTitle: settings?.director_title     || settings?.head_of_school_title     || 'Head of School',
  };
}

/**
 * Normaliza el estado MSA para documentos oficiales.
 * Evita mostrar valores crudos como "candidate", "candidacy", "official_candidate".
 *
 * @param {Object}          settings  - settings row (necesita msa_status)
 * @param {'es'|'en'}       lang
 * @param {boolean}         short     - true → forma corta para líneas ajustadas (encabezado)
 */
export function formatMsaStatus(settings, lang = 'es', short = false) {
  const raw = (settings?.msa_status || '').toLowerCase().trim();
  // Si ya es una frase larga en DB, devolver tal cual
  if (raw.length >= 20) return settings.msa_status;
  // Normalizar valores cortos/crudos
  if (short) return 'MSA-CESS Official Candidate';
  if (lang === 'en') return 'MSA-CESS Official Candidate for Accreditation';
  return 'Candidata oficial a acreditación ante MSA-CESS';
}

// Compatibilidad con código antiguo que llama a los getters individuales
export const getInstitutionName    = (s) => getInstitutionInfo(s).name;
export const getInstitutionFldoe   = (s) => getInstitutionInfo(s).fldoe;
export const getInstitutionEmail   = (s) => getInstitutionInfo(s).email;
export const getInstitutionAddress = (s) => getInstitutionInfo(s).address;

export const getActiveSchoolYear = (settings, fallback = '') => (
  settings?.active_school_year || fallback || ''
);

export const getDocumentFooter = (settings, lang = 'es') => {
  const info = getInstitutionInfo(settings);
  if (info.footer) return info.footer;
  return lang === 'en'
    ? `${info.name} · FLDOE #${info.fldoe} · ${info.ein} · 501(c)(3) Nonprofit`
    : `${info.name} · FLDOE #${info.fldoe} · EIN ${info.ein} · Organización sin fines de lucro 501(c)(3)`;
};

export const splitStudentName = (studentName = '') => {
  const [first, ...rest] = studentName.trim().split(/\s+/).filter(Boolean);
  return { first_name: first || studentName, last_name: rest.join(' ') };
};

// ─────────────────────────────────────────────────────────────────────────────
// CARGA DE ASSETS INSTITUCIONALES
// jsPDF NO puede cargar URLs remotas directamente.
// Siempre llamar preloadImages(settings) antes de generar cualquier PDF.
// ─────────────────────────────────────────────────────────────────────────────

const _DEV = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

// ─────────────────────────────────────────────────────────────────────────────
// safeAddImage — inserta una imagen base64 sin romper el PDF si falla.
// Detecta PNG/JPEG. Rechaza SVG/WEBP con fallback limpio.
// ─────────────────────────────────────────────────────────────────────────────
export function safeAddImage(doc, imageData, x, y, w, h, label = '') {
  if (!imageData) return false;
  if (typeof imageData !== 'string') return false;
  if (!imageData.startsWith('data:image/')) return false;

  // Detectar formato soportado por jsPDF
  let fmt;
  if      (imageData.startsWith('data:image/png'))  fmt = 'PNG';
  else if (imageData.startsWith('data:image/jpeg') ||
           imageData.startsWith('data:image/jpg'))  fmt = 'JPEG';
  else {
    // WEBP, SVG, GIF, etc. — jsPDF no los soporta nativamente
    if (_DEV) console.warn(`[PDF safeAddImage] ${label || 'image'}: formato no soportado, omitido`);
    return false;
  }

  try {
    doc.addImage(imageData, fmt, x, y, w, h);
    return true;
  } catch (err) {
    if (_DEV) console.warn(`[PDF safeAddImage] ${label || 'image'}: addImage falló`, err?.message);
    // Intentar con el otro formato como último recurso
    const altFmt = fmt === 'PNG' ? 'JPEG' : 'PNG';
    try {
      doc.addImage(imageData, altFmt, x, y, w, h);
      return true;
    } catch (_) { return false; }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// preloadImages — convierte URLs a base64 antes de generar PDFs.
// Lee campos canónicos Y aliases habituales de institutional_settings.
// DEBE llamarse antes de cualquier generador de PDF.
// ─────────────────────────────────────────────────────────────────────────────
export async function preloadImages(settings) {
  if (!settings) return settings;

  /**
   * Convierte URL/ruta a base64.
   * - Devuelve null si la respuesta es HTML (Google Drive / auth redirect).
   * - Devuelve null si content-type no empieza con image/.
   */
  async function toBase64(url) {
    if (!url) return null;
    if (typeof url !== 'string') return null;
    if (url.startsWith('data:image/')) return url;   // ya es base64 válido
    if (url.startsWith('data:')) return null;         // base64 de otro tipo, no usar
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html')) return null;      // Google Drive / login redirect
      if (!ct.startsWith('image/')) return null;      // no es imagen
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror  = reject;
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  /**
   * Prueba cada candidato en orden y devuelve el primer base64 válido.
   * Los últimos candidatos deben ser siempre las rutas locales /brand/*.
   */
  async function resolveFirst(candidates) {
    for (const url of candidates) {
      if (!url) continue;
      const result = await toBase64(url);
      if (result) return result;
    }
    return null;
  }

  const logo64 = await resolveFirst([
    settings.logo_url,
    settings.logo,
    settings.school_logo_url,
    '/brand/chanak-logo.png',
  ]);

  const seal64 = await resolveFirst([
    settings.seal_url,
    settings.seal,
    settings.institutional_seal_url,
    '/brand/chanak-seal.png',
  ]);

  const sig64 = await resolveFirst([
    settings.director_signature_url,
    settings.signature_url,
    settings.director_signature,
    '/brand/director-signature.png',
  ]);

  if (_DEV) {
    console.warn('[PDF ASSETS CHECK]', {
      hasLogo64:       Boolean(logo64),
      hasSeal64:       Boolean(seal64),
      hasSignature64:  Boolean(sig64),
      logoPrefix:      logo64?.slice(0, 20),
      sealPrefix:      seal64?.slice(0, 20),
      signaturePrefix: sig64?.slice(0, 20),
    });
  }

  return { ...settings, _logo64: logo64, _seal64: seal64, _signature64: sig64 };
}

/** Inserta el logo institucional. Requiere preloadImages para que funcione. */
export const addInstitutionLogo = (doc, settings, x, y, w, h) => {
  const src = settings?._logo64 || settings?.logo_url || settings?.logo || settings?.school_logo_url;
  return safeAddImage(doc, src, x, y, w, h, 'logo');
};

/** Inserta el sello institucional. Requiere preloadImages para que funcione. */
export const addInstitutionSeal = (doc, settings, x, y, w, h) => {
  const src = settings?._seal64 || settings?.seal_url || settings?.seal || settings?.institutional_seal_url;
  return safeAddImage(doc, src, x, y, w, h, 'seal');
};

/**
 * Inserta la imagen de firma del director.
 * Requiere preloadImages para que funcione.
 * @returns {boolean} true si se dibujó la imagen, false si no había imagen.
 */
export const addInstitutionSignature = (doc, settings, x, y, w, h) => {
  const src = settings?._signature64 || settings?.director_signature_url ||
              settings?.signature_url || settings?.director_signature;
  return safeAddImage(doc, src, x, y, w, h, 'signature');
};

// ─────────────────────────────────────────────────────────────────────────────
// CAPA DE DISEÑO PDF — BAJO CONSUMO DE TINTA
// Fondo blanco. Sin bloques sólidos azules grandes.
// Solo azul en líneas finas, títulos pequeños y detalles.
// ─────────────────────────────────────────────────────────────────────────────

export const PDF_NAVY   = [25, 61, 109];      // azul institucional — solo textos y detalles
export const PDF_GRAY   = [100, 116, 139];    // texto secundario
export const PDF_LGRAY  = [245, 247, 250];    // fondos muy claros de tabla / info box
export const PDF_BLACK  = [30, 30, 30];       // texto principal
export const PDF_WHITE  = [255, 255, 255];
export const PDF_BLUE   = [232, 240, 252];    // cabecera de tabla — azul muy claro (bajo tinta)
export const PDF_BORDER = [200, 210, 226];    // bordes y líneas divisorias
export const PDF_FOOTER_H = 12;              // mm reservados para el footer
export const PDF_MARGIN   = 14;              // mm márgenes laterales

function _footerText(settings) {
  const info = getInstitutionInfo(settings);
  if (info.footer) return info.footer;
  return `${info.name} · ${info.address} · ${info.email} · ${info.website} · ` +
         `FLDOE #${info.fldoe} · EIN ${info.ein} · 501(c)(3) Nonprofit`;
}

/**
 * Dibuja el encabezado institucional de bajo consumo en la PÁGINA ACTUAL.
 * Logo pequeño izquierda · texto centrado · sello pequeño derecha · línea fina.
 * Sin rellenos sólidos grandes.
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {Object}  settings    - resultado de preloadImages()
 * @param {Object}  [opts]
 * @param {string}  [opts.docTitle]    - título del documento (negrita, centrado)
 * @param {string}  [opts.docSubtitle] - subtítulo (cursiva pequeña)
 * @param {string}  [opts.lang='es']
 * @returns {number} Y donde debe empezar el contenido del documento
 */
export function drawOfficialHeader(doc, settings, opts = {}) {
  const { docTitle = '', docSubtitle = '', lang = 'es' } = opts;
  const W = doc.internal.pageSize.getWidth();

  // Logo (izquierda, 17×17 mm)
  addInstitutionLogo(doc, settings, 10, 6, 17, 17);
  // Sello: se coloca en el bloque de firma del director, no en el encabezado.

  const info = getInstitutionInfo(settings);

  // Nombre de la institución (navy, centrado)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PDF_NAVY);
  doc.text(info.name.toUpperCase(), W / 2, 13, { align: 'center' });

  // Línea informativa: FLDOE + MSA + 501(c)(3)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(
    `FLDOE #${info.fldoe}  ·  ${info.msa}  ·  501(c)(3) Nonprofit  ·  Florida, USA`,
    W / 2, 18.5, { align: 'center' },
  );

  // Línea informativa: email + website
  doc.text(`${info.email}  ·  ${info.website}`, W / 2, 23, { align: 'center' });

  // Línea separadora fina (navy 0.3 pt)
  doc.setDrawColor(...PDF_NAVY);
  doc.setLineWidth(0.3);
  doc.line(10, 27, W - 10, 27);

  let yBottom = 28;

  // Título del documento
  if (docTitle) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_NAVY);
    doc.text(docTitle, W / 2, yBottom + 6, { align: 'center' });
    yBottom += 11;
  }

  // Subtítulo del documento
  if (docSubtitle) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_GRAY);
    doc.text(docSubtitle, W / 2, yBottom + 4, { align: 'center' });
    yBottom += 8;
  }

  doc.setTextColor(...PDF_BLACK);
  return yBottom + 4;
}

/**
 * Etiqueta de sección de bajo consumo.
 * Acento izquierdo 2×6 mm (navy) + texto negrita + línea fina inferior.
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {string} title
 * @param {number} [leftMargin]
 * @returns {number} Y después de la etiqueta
 */
export function drawSectionLabel(doc, y, title, leftMargin = PDF_MARGIN) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...PDF_NAVY);
  doc.rect(leftMargin, y, 2, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(title, leftMargin + 5, y + 5);
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.line(leftMargin, y + 7.5, W - leftMargin, y + 7.5);
  doc.setTextColor(...PDF_BLACK);
  return y + 12;
}

/**
 * Sella footer discreto (línea fina + texto pequeño gris) en TODAS las páginas.
 * Sin banda de color. Nro. de página en navy a la derecha.
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {Object}  settings
 * @param {Object}  [opts]
 * @param {string}  [opts.pageLabel='Pág.']
 * @param {string}  [opts.refLine]   - mostrado en página 1 (izquierda)
 */
export function applyOfficialFooterAllPages(doc, settings, opts = {}) {
  const { pageLabel = 'Pág.', refLine = '' } = opts;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const n = doc.getNumberOfPages();
  const footerText = _footerText(settings);

  for (let i = 1; i <= n; i++) {
    doc.setPage(i);

    // Línea fina separadora
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.2);
    doc.line(10, H - PDF_FOOTER_H, W - 10, H - PDF_FOOTER_H);

    // Texto del footer (gris, centrado)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...PDF_GRAY);
    const lines = doc.splitTextToSize(footerText, W - 28);
    if (lines.length >= 2) {
      doc.text(lines[0], W / 2, H - 8.5, { align: 'center' });
      doc.text(lines.slice(1).join(' '), W / 2, H - 4.5, { align: 'center' });
    } else {
      doc.text(lines[0] || footerText, W / 2, H - 6.5, { align: 'center' });
    }

    // Nro. de página (derecha, navy)
    doc.setFontSize(6);
    doc.setTextColor(...PDF_NAVY);
    doc.text(`${pageLabel} ${i} / ${n}`, W - 10, H - 4.5, { align: 'right' });

    // Ref / fecha en página 1 (izquierda, gris)
    if (i === 1 && refLine) {
      doc.setFontSize(5.5);
      doc.setTextColor(...PDF_GRAY);
      doc.text(refLine, 10, H - 4.5);
    }

    doc.setTextColor(...PDF_BLACK);
  }
}
