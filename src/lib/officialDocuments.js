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

  const [logo64, seal64] = await Promise.all([
    toBase64(settings.logo_url),
    toBase64(settings.seal_url),
  ]);

  return { ...settings, _logo64: logo64, _seal64: seal64 };
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

export const splitStudentName = (studentName = '') => {
  const [first, ...rest] = studentName.trim().split(/\s+/).filter(Boolean);
  return { first_name: first || studentName, last_name: rest.join(' ') };
};
