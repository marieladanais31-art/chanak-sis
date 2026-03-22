
export const SUBJECT_CATEGORIES = {
  Core: 'Core A.C.E.',
  LifeSkills: 'Life Skills',
  SecondLanguage: 'Second Language - Castellano',
  LocalSocialStudies: 'Local Social Studies',
  Electivas: 'Electivas'
};

export function normalizeCategory(displayName) {
  if (!displayName) return 'Core';
  
  const normalized = String(displayName).trim().toLowerCase();
  
  if (normalized.includes('core') || normalized.includes('a.c.e')) return 'Core';
  if (normalized.includes('life') || normalized.includes('skill')) return 'LifeSkills';
  if (normalized.includes('second') || normalized.includes('language') || normalized.includes('castellano')) return 'SecondLanguage';
  if (normalized.includes('local') || normalized.includes('social')) return 'LocalSocialStudies';
  if (normalized.includes('electiv')) return 'Electivas';

  const exactMatch = Object.keys(SUBJECT_CATEGORIES).find(k => k.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;

  return 'Electivas';
}

export function formatCategoryForDisplay(dbValue) {
  return SUBJECT_CATEGORIES[dbValue] || dbValue || 'Desconocida';
}

export function getAllCategories() {
  return Object.entries(SUBJECT_CATEGORIES).map(([value, display]) => ({
    value,
    display
  }));
}
