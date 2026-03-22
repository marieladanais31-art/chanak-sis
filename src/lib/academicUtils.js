
export const ACTIVE_SCHOOL_YEAR = '2025-2026';

export const QUARTERS = [
  { id: 'Q1', name: 'Quarter 1' },
  { id: 'Q2', name: 'Quarter 2' },
  { id: 'Q3', name: 'Quarter 3' },
  { id: 'Q4', name: 'Quarter 4' }
];

export const BLOCK_ORDER = [
  'Core A.C.E.',
  'Extensión Local',
  'Core Credits',
  'Local Validation / Foreign Language',
  'Life Skills & Leadership',
  'Life Skills',
  'Electives'
];

export function normalizeBlock(blockName) {
  if (!blockName) return 'OTHER';
  const upper = blockName.trim().toUpperCase();
  const normalizedBlock = BLOCK_ORDER.find((block) => block.toUpperCase() === upper);
  if (normalizedBlock) return normalizedBlock;
  
  // Handle some common variations
  if (upper.includes('CORE A.C.E.') || upper === 'CORE') return 'Core A.C.E.';
  if (upper.includes('CORE CREDIT')) return 'Core Credits';
  if (upper.includes('EXTENSIÓN') || upper.includes('EXTENSION')) return 'Extensión Local';
  if (upper.includes('LOCAL VALIDATION') || upper.includes('FOREIGN LANGUAGE')) return 'Local Validation / Foreign Language';
  if (upper.includes('LIFE SKILLS & LEADERSHIP')) return 'Life Skills & Leadership';
  if (upper.includes('LIFE SKILLS')) return 'Life Skills';
  if (upper.includes('ELECT')) return 'Electives';
  
  return 'OTHER';
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

export function buildSubjectKey(subject) {
  if (!subject) return '';

  return [
    subject.student_id || '',
    subject.subject_id || '',
    subject.subject_name || '',
    subject.academic_block || '',
    subject.category || '',
    subject.quarter || '',
    subject.school_year || '',
  ].join('__');
}

export function dedupeAcademicSubjects(subjects) {
  if (!Array.isArray(subjects)) return [];

  const unique = [];
  const seen = new Set();

  for (const subject of subjects) {
    const key = subject?.id || buildSubjectKey(subject);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(subject);
  }

  return unique;
}

export function normalizeNumericGrade(value) {
  const grade = Number(value);
  if (!Number.isFinite(grade)) return null;

  return Math.min(100, Math.max(0, grade));
}

export function calculateAverageGrade(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;

  const validScores = entries
    .map((entry) => normalizeNumericGrade(entry?.score))
    .filter((score) => score !== null);

  if (validScores.length === 0) return null;

  const sum = validScores.reduce((total, score) => total + score, 0);
  return Number((sum / validScores.length).toFixed(2));
}

export function formatSubjectGrade(subject) {
  const grade = normalizeNumericGrade(subject?.grade);
  if (grade === null) {
    const normalizedBlock = normalizeBlock(subject?.academic_block);
    if (normalizedBlock === 'Life Skills' || normalizedBlock === 'Life Skills & Leadership') {
      return 'In Progress';
    }

    return '—';
  }

  return grade.toFixed(2);
}

export function getRecommendedMinimum(blockName) {
  const normalized = normalizeBlock(blockName).toUpperCase();
  if (normalized.includes('CORE')) return 4;
  if (normalized.includes('EXTENSIÓN')) return 3;
  if (normalized.includes('VALIDATION')) return 3;
  return 2; // Default for Electives, Life Skills, etc.
}
