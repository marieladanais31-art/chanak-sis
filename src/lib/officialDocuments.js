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

export const addInstitutionLogo = (doc, settings, x, y, w, h) => {
  if (!settings?.logo_url) return;
  try {
    doc.addImage(settings.logo_url, 'PNG', x, y, w, h);
  } catch {
    try { doc.addImage(settings.logo_url, 'JPEG', x, y, w, h); } catch (_) {}
  }
};

export const splitStudentName = (studentName = '') => {
  const [first, ...rest] = studentName.trim().split(/\s+/).filter(Boolean);
  return { first_name: first || studentName, last_name: rest.join(' ') };
};
