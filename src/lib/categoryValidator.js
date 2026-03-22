
/**
 * Utility to validate and normalize academic category names
 * to ensure compliance with the student_subjects database constraint.
 */

export const VALID_CATEGORIES = [
  'Core', 
  'LifeSkills', 
  'SecondLanguage', 
  'LocalSocialStudies', 
  'Electivas'
];

/**
 * Maps legacy/display string formats to database-compliant string values.
 * 
 * @param {string} rawCategory - The category string to normalize (e.g. "Core (A.C.E.)", "Life Skills")
 * @returns {string} The normalized category strictly matching constraint requirements.
 */
export function normalizeCategory(rawCategory) {
  if (!rawCategory) return 'Core'; // Safe fallback
  
  const normalized = String(rawCategory).trim().toLowerCase();
  
  if (normalized.includes('core') || normalized.includes('a.c.e.')) {
    return 'Core';
  }
  
  if (normalized.includes('life') && normalized.includes('skill')) {
    return 'LifeSkills';
  }
  
  if (normalized.includes('second') && normalized.includes('language')) {
    return 'SecondLanguage';
  }
  
  if (normalized.includes('local') || normalized.includes('social')) {
    return 'LocalSocialStudies';
  }
  
  if (normalized.includes('electiva') || normalized.includes('elective')) {
    return 'Electivas';
  }
  
  // If exact match from the valid list was somehow passed with weird casing
  const exactMatch = VALID_CATEGORIES.find(c => c.toLowerCase() === normalized);
  if (exactMatch) return exactMatch;
  
  // Default fallback for unrecognized categories to prevent DB crashes
  console.warn(`[categoryValidator] Unrecognized category "${rawCategory}", defaulting to "Electivas"`);
  return 'Electivas';
}

/**
 * Reverses the normalization for display purposes in the UI.
 * 
 * @param {string} dbCategory - The database-compliant string (e.g. "LifeSkills")
 * @returns {string} Human readable formatted category
 */
export function formatCategoryForDisplay(dbCategory) {
  switch (dbCategory) {
    case 'Core': return 'Core (A.C.E.)';
    case 'LifeSkills': return 'Life Skills';
    case 'SecondLanguage': return 'Second Language';
    case 'LocalSocialStudies': return 'Local Social Studies';
    case 'Electivas': return 'Electivas';
    default: return dbCategory;
  }
}
