/** Año académico activo (en curso) */
export const ACTIVE_SCHOOL_YEAR    = '2025-2026';
/** Año académico histórico anterior */
export const HISTORICAL_SCHOOL_YEAR = '2024-2025';
/** Año académico futuro próximo (sin datos automáticos) */
export const FUTURE_SCHOOL_YEAR    = '2026-2027';

export const ACE_MASTERY_MINIMUM = 80;
export const PACE_PASSING_SCORE = ACE_MASTERY_MINIMUM;
export const BASE_GRADE_MIN = 0;
export const BASE_GRADE_MAX = 100;
export const HIGH_SCHOOL_FULL_CREDIT_PACES = 12;
export const HIGH_SCHOOL_HALF_CREDIT_PACES = 6;

export const TRANSCRIPT_GRADING_SCALE = [
  { min: 98, max: 100, letter: 'A+' },
  { min: 96, max: 97, letter: 'A' },
  { min: 94, max: 95, letter: 'A-' },
  { min: 92, max: 93, letter: 'B+' },
  { min: 90, max: 91, letter: 'B' },
  { min: 88, max: 89, letter: 'B-' },
  { min: 86, max: 87, letter: 'C+' },
  { min: 83, max: 85, letter: 'C' },
  { min: 80, max: 82, letter: 'C-' },
  { min: 0, max: 79, letter: 'F' },
];

export const ACADEMIC_YEARS = [
  '2023-2024',
  '2024-2025',
  '2025-2026',
  '2026-2027',
  '2027-2028',
];

/**
 * Returns 'Q1' | 'Q2' | 'Q3' | null given a date and a calendar row.
 * @param {string|Date} date
 * @param {object} calendar - academic_calendars row with q1/q2/q3 start+end dates
 */
export function getQuarterFromDate(date, calendar) {
  if (!date || !calendar) return null;
  const d = new Date(date);
  const inRange = (start, end) =>
    start && end && d >= new Date(start) && d <= new Date(end);
  if (inRange(calendar.q1_start_date, calendar.q1_end_date)) return 'Q1';
  if (inRange(calendar.q2_start_date, calendar.q2_end_date)) return 'Q2';
  if (inRange(calendar.q3_start_date, calendar.q3_end_date)) return 'Q3';
  return null;
}

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

  return Math.min(BASE_GRADE_MAX, Math.max(BASE_GRADE_MIN, grade));
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

export function isPassingPaceScore(score) {
  const normalized = normalizeNumericGrade(score);
  return normalized !== null && normalized >= PACE_PASSING_SCORE;
}

export function getPaceStatus(score) {
  const normalized = normalizeNumericGrade(score);
  if (normalized === null) return 'pending';
  return isPassingPaceScore(normalized) ? 'approved' : 'failed';
}

export function calculateHighSchoolCreditsFromPaces(paceCount, courseCreditValue = null, options = {}) {
  const { allowConfiguredCredit = true } = options;
  const count = Number(paceCount);
  const configuredCredit = Number(courseCreditValue);

  if (count >= HIGH_SCHOOL_FULL_CREDIT_PACES) return 1;
  if (count >= HIGH_SCHOOL_HALF_CREDIT_PACES) return 0.5;

  if (allowConfiguredCredit && Number.isFinite(configuredCredit) && configuredCredit > 0) {
    return configuredCredit;
  }

  return 0;
}

export function getGradeNumberFromLevel(level) {
  const normalized = String(level || '').toLowerCase().trim();
  const numericMatch = normalized.match(/(?:grade\s*)?(\d{1,2})(?:st|nd|rd|th|\.º|º)?/);
  if (numericMatch) {
    const grade = Number(numericMatch[1]);
    if (grade >= 1 && grade <= 12) return grade;
  }

  if (normalized.includes('freshman')) return 9;
  if (normalized.includes('sophomore')) return 10;
  if (normalized.includes('junior')) return 11;
  if (normalized.includes('senior')) return 12;

  return null;
}

export function getStudentSchoolStage(student = {}) {
  if (student.school_stage) return student.school_stage;

  const grade = getGradeNumberFromLevel(student.us_grade_level || student.grade_level);
  if (grade === null) return null;
  if (grade <= 5) return 'elementary';
  if (grade <= 8) return 'middle_school';
  return 'high_school';
}

export function shouldShowOfficialCredits(student = {}, options = {}) {
  const stage = getStudentSchoolStage(student);
  if (stage === 'high_school') return true;
  if (stage === 'middle_school') return Boolean(options.allowMiddleSchoolCredits);
  return false;
}

export function gradeToTranscriptLetter(grade) {
  const normalized = normalizeNumericGrade(grade);
  if (normalized === null) return '—';

  const wholePercent = Math.floor(normalized);
  return TRANSCRIPT_GRADING_SCALE.find((range) => wholePercent >= range.min && wholePercent <= range.max)?.letter || 'F';
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

export function getMasteryMinimum() {
  return ACE_MASTERY_MINIMUM;
}

export function getRecommendedMinimum(blockName) {
  const normalized = normalizeBlock(blockName).toUpperCase();
  if (normalized.includes('CORE')) return 4;
  if (normalized.includes('EXTENSIÓN')) return 3;
  if (normalized.includes('VALIDATION')) return 3;
  return 2; // Default for Electives, Life Skills, etc.
}
