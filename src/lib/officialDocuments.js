export const OFFICIAL_DOCUMENT_LANGUAGES = ['es', 'en'];
export const OFFICIAL_DOCUMENT_STATUSES = ['draft', 'sent', 'signed', 'published', 'archived'];
export const FAMILY_DOWNLOAD_STATUSES = ['sent', 'signed', 'published'];
export const PUBLISHED_DOWNLOAD_STATUSES = ['published'];

export const normalizeDocumentLanguage = (language) => (
  OFFICIAL_DOCUMENT_LANGUAGES.includes(language) ? language : 'es'
);

export const canDownloadOfficialDocument = ({ status, role, publishedOnly = false }) => {
  const normalizedRole = String(role || '').toLowerCase();
  if (['admin', 'super_admin', 'coordinator'].includes(normalizedRole)) return true;
  return (publishedOnly ? PUBLISHED_DOWNLOAD_STATUSES : FAMILY_DOWNLOAD_STATUSES).includes(status);
};

export const getInstitutionName = (settings) => (
  settings?.institution_name || 'Chanak International Academy'
);

export const getInstitutionFldoe = (settings) => (
  settings?.fldoe_registration || settings?.fldoe || '134620'
);

export const getActiveSchoolYear = (settings, fallback = '') => (
  settings?.active_school_year || fallback || ''
);

export const getInstitutionEmail = (settings) => (
  settings?.email || settings?.contact_email || ''
);

export const getInstitutionAddress = (settings) => (
  [settings?.address, settings?.city, settings?.state_province, settings?.country]
    .filter(Boolean)
    .join(', ')
);

export const getDocumentFooter = (settings, lang = 'es') => {
  if (settings?.document_footer) return settings.document_footer;
  const institution = getInstitutionName(settings);
  const fldoe = getInstitutionFldoe(settings);
  return lang === 'en'
    ? `${institution} · Official Document · FLDOE #${fldoe}`
    : `${institution} · Documento Oficial · FLDOE #${fldoe}`;
};

/**
 * Pre-carga logo_url y seal_url como base64.
 * jsPDF no puede cargar URLs remotas directamente — necesita datos en memoria.
 * Llama esta función antes de invocar cualquier generador de PDF.
 */
export async function preloadImages(settings) {
  if (!settings) return settings;

  async function toBase64(url) {
    if (!url) return null;
    if (url.startsWith('data:')) return url;   // ya es base64
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror  = reject;
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  const [logo64, seal64, sig64] = await Promise.all([
    toBase64(settings.logo_url),
    toBase64(settings.seal_url),
    toBase64(settings.director_signature_url),
  ]);

  return { ...settings, _logo64: logo64, _seal64: seal64, _signature64: sig64 };
}

/** Inserta el logo institucional usando base64 pre-cargado. */
export const addInstitutionLogo = (doc, settings, x, y, w, h) => {
  const src = settings?._logo64 || settings?.logo_url;
  if (!src) return;
  try {
    doc.addImage(src, 'PNG', x, y, w, h);
  } catch {
    try { doc.addImage(src, 'JPEG', x, y, w, h); } catch (_) {}
  }
};

/** Inserta el sello institucional (seal) usando base64 pre-cargado. */
export const addInstitutionSeal = (doc, settings, x, y, w, h) => {
  const src = settings?._seal64 || settings?.seal_url;
  if (!src) return;
  try {
    doc.addImage(src, 'PNG', x, y, w, h);
  } catch {
    try { doc.addImage(src, 'JPEG', x, y, w, h); } catch (_) {}
  }
};

/**
 * Inserta la imagen de firma del director usando base64 pre-cargado.
 * Requiere que `preloadImages` haya sido llamado antes (populate `_signature64`).
 * Si no hay imagen disponible, no dibuja nada (el caller debe mostrar fallback).
 */
export const addInstitutionSignature = (doc, settings, x, y, w, h) => {
  const src = settings?._signature64 || settings?.director_signature_url;
  if (!src) return false;          // indica que no se dibujó imagen
  try {
    doc.addImage(src, 'PNG', x, y, w, h);
    return true;
  } catch {
    try {
      doc.addImage(src, 'JPEG', x, y, w, h);
      return true;
    } catch (_) { return false; }
  }
};

export const splitStudentName = (studentName = '') => {
  const [first, ...rest] = studentName.trim().split(/\s+/).filter(Boolean);
  return { first_name: first || studentName, last_name: rest.join(' ') };
};

// ─────────────────────────────────────────────────────────────────────────────
// CAPA DE DISEÑO PDF INSTITUCIONAL — BAJO CONSUMO DE TINTA
// Fondo blanco. Sin bloques sólidos azules. Logo + sello + línea fina.
// ─────────────────────────────────────────────────────────────────────────────

/** Paleta compartida — usar SOLO para texto, bordes y detalles, nunca como fondo sólido grande */
export const PDF_NAVY   = [25, 61, 109];      // azul institucional
export const PDF_GRAY   = [100, 116, 139];    // texto secundario
export const PDF_LGRAY  = [245, 247, 250];    // fondos de tabla / info box
export const PDF_BLACK  = [30, 30, 30];       // texto principal
export const PDF_WHITE  = [255, 255, 255];
export const PDF_BLUE   = [232, 240, 252];    // cabecera de tabla — azul muy claro
export const PDF_BORDER = [200, 210, 226];    // bordes y divisores
export const PDF_FOOTER_H = 12;              // mm reservados para el footer
export const PDF_MARGIN   = 14;              // mm márgenes laterales

function _officialFooterText(settings) {
  if (settings?.document_footer) return settings.document_footer;
  const inst  = getInstitutionName(settings);
  const fldoe = getInstitutionFldoe(settings);
  return `${inst} · 4883 NW 107th Path, Doral, FL 33178, USA · ` +
         `administration@chanakacademy.org · chanakacademy.org · ` +
         `FLDOE #${fldoe} · EIN 36-5154011 · 501(c)(3) Nonprofit`;
}

/**
 * Dibuja el header institucional de bajo consumo en la PÁGINA ACTUAL.
 * Logo izquierda · texto centrado · sello derecha · línea fina.
 * Sin rellenos sólidos grandes.
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {Object}  settings   - resultado de preloadImages()
 * @param {Object}  [opts]
 * @param {string}  [opts.docTitle]     - título del documento (negrita, centrado)
 * @param {string}  [opts.docSubtitle]  - subtítulo (cursiva pequeña, centrado)
 * @param {string}  [opts.lang='es']
 * @returns {number} Y donde debe empezar el contenido
 */
export function drawOfficialHeader(doc, settings, opts = {}) {
  const { docTitle = '', docSubtitle = '', lang = 'es' } = opts;
  const W = doc.internal.pageSize.getWidth();

  // Logo (izquierda, pequeño)
  addInstitutionLogo(doc, settings, 10, 6, 17, 17);

  // Sello (derecha, discreto)
  addInstitutionSeal(doc, settings, W - 27, 6, 17, 17);

  // Nombre de la institución
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...PDF_NAVY);
  doc.text(getInstitutionName(settings).toUpperCase(), W / 2, 13, { align: 'center' });

  // Línea informativa 1
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...PDF_GRAY);
  const fldoe = getInstitutionFldoe(settings);
  doc.text(
    `FLDOE #${fldoe}  ·  MSA-CESS Official Candidate  ·  501(c)(3) Nonprofit  ·  Florida, USA`,
    W / 2, 18.5, { align: 'center' },
  );

  // Línea informativa 2 (email + website)
  const email   = getInstitutionEmail(settings) || 'administration@chanakacademy.org';
  const website = settings?.website || 'chanakacademy.org';
  doc.text(`${email}  ·  ${website}`, W / 2, 23, { align: 'center' });

  // Línea separadora fina (navy, 0.3pt)
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
  return yBottom + 4; // Y donde empieza el contenido
}

/**
 * Dibuja una etiqueta de sección de bajo consumo.
 * Acento izquierdo (2×6 mm, navy) + texto negrita + línea fina inferior.
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {string} title
 * @param {number} [leftMargin=PDF_MARGIN]
 * @returns {number} Y después de la etiqueta
 */
export function drawSectionLabel(doc, y, title, leftMargin = PDF_MARGIN) {
  const W = doc.internal.pageSize.getWidth();
  // Acento izquierdo (pequeño bloque navy — único fill sólido permitido)
  doc.setFillColor(...PDF_NAVY);
  doc.rect(leftMargin, y, 2, 6, 'F');
  // Texto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(title, leftMargin + 5, y + 5);
  // Línea fina inferior
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.line(leftMargin, y + 7.5, W - leftMargin, y + 7.5);
  doc.setTextColor(...PDF_BLACK);
  return y + 12;
}

/**
 * Sella footer discreto (línea fina + texto pequeño gris) en TODAS las páginas.
 * Sin banda de color. Número de página en azul-navy a la derecha.
 *
 * @param {import('jspdf').jsPDF} doc
 * @param {Object}  settings
 * @param {Object}  [opts]
 * @param {string}  [opts.pageLabel='Pág.']
 * @param {string}  [opts.refLine]  - texto breve mostrado en página 1 (izquierda)
 */
export function applyOfficialFooterAllPages(doc, settings, opts = {}) {
  const { pageLabel = 'Pág.', refLine = '' } = opts;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const n = doc.getNumberOfPages();
  const footerText = _officialFooterText(settings);

  for (let i = 1; i <= n; i++) {
    doc.setPage(i);

    // Línea fina separadora
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.2);
    doc.line(10, H - PDF_FOOTER_H, W - 10, H - PDF_FOOTER_H);

    // Texto del footer (máx. 2 líneas, centrado, gris)
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

    // Número de página (derecha, navy)
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
