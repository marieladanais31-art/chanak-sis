
export const QUARTERS = [
  { id: 'Q1', name: 'Quarter 1' },
  { id: 'Q2', name: 'Quarter 2' },
  { id: 'Q3', name: 'Quarter 3' },
  { id: 'Q4', name: 'Quarter 4' }
];

export const BLOCK_ORDER = [
  'CORE A.C.E. / CORE CREDITS', 
  'EXTENSIÓN LOCAL', 
  'LIFE SKILLS & LEADERSHIP', 
  'ELECTIVES', 
  'CORE CREDITS', 
  'LOCAL VALIDATION / FOREIGN LANGUAGE',
  'LIFE SKILLS'
];

export function normalizeBlock(blockName) {
  if (!blockName) return 'OTHER';
  const upper = blockName.trim().toUpperCase();
  if (BLOCK_ORDER.includes(upper)) return upper;
  
  // Handle some common variations
  if (upper.includes('CORE A.C.E.') || upper === 'CORE') return 'CORE A.C.E. / CORE CREDITS';
  if (upper.includes('EXTENSIÓN')) return 'EXTENSIÓN LOCAL';
  if (upper.includes('LIFE SKILLS')) return 'LIFE SKILLS & LEADERSHIP';
  
  return upper;
}

export function dedupeSubjects(subjects) {
  if (!subjects || !Array.isArray(subjects)) return [];
  const unique = [];
  const seen = new Set();
  for (const item of subjects) {
    if (item.id && !seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  }
  return unique;
}

export function getRecommendedMinimum(blockName) {
  const normalized = normalizeBlock(blockName);
  if (normalized.includes('CORE')) return 4;
  if (normalized.includes('EXTENSIÓN')) return 3;
  if (normalized.includes('VALIDATION')) return 3;
  return 2; // Default for Electives, Life Skills, etc.
}
