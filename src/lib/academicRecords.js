export const ACADEMIC_YEAR = '2025-2026';

export const QUARTERS = [
  { id: 'Q1', label: 'Q1 (Sept-Dec)' },
  { id: 'Q2', label: 'Q2 (Jan-Mar)' },
  { id: 'Q3', label: 'Q3 (Apr-Jun)' },
  { id: 'Q4', label: 'Q4 (Jul-Aug)' },
];

export const BLOCK_ORDER = [
  'Core A.C.E.',
  'Extensión Local',
  'Life Skills',
  'Core Credits',
  'Local Validation / Foreign Language',
  'Life Skills & Leadership',
  'Electives',
  'OTHER',
];

export function normalizeBlock(block) {
  if (!block) return 'OTHER';
  if (BLOCK_ORDER.includes(block)) return block;

  const value = String(block).trim().toUpperCase();

  if (value.includes('CORE A.C.E')) return 'Core A.C.E.';
  if (value.includes('CORE CREDIT')) return 'Core Credits';
  if (value.includes('EXTENSIÓN LOCAL') || value.includes('EXTENSION LOCAL')) return 'Extensión Local';
  if (value.includes('LOCAL VALIDATION') || value.includes('FOREIGN LANGUAGE')) return 'Local Validation / Foreign Language';
  if (value.includes('LIFE SKILLS & LEADERSHIP')) return 'Life Skills & Leadership';
  if (value.includes('LIFE SKILLS')) return 'Life Skills';
  if (value.includes('ELECT')) return 'Electives';

  return 'OTHER';
}

export function dedupeStudentSubjects(subjects = []) {
  const unique = [];
  const seen = new Set();

  for (const item of subjects) {
    const key = item.id || `${item.student_id}__${item.subject_name}__${item.academic_block || ''}__${item.quarter || ''}__${item.school_year || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
}

export function computeAverage(entries = []) {
  const validEntries = entries.filter((entry) => entry?.score !== null && entry?.score !== undefined && !Number.isNaN(Number(entry.score)));

  if (validEntries.length === 0) {
    return null;
  }

  const total = validEntries.reduce((sum, entry) => sum + Number(entry.score), 0);
  return Number((total / validEntries.length).toFixed(2));
}

export async function syncStudentSubjectGrade(supabase, studentSubjectId, entries) {
  const average = computeAverage(entries);

  const payload = {
    grade: average,
    submitted_at: new Date().toISOString(),
    approval_status: average === null ? 'pending' : 'submitted',
  };

  const { error } = await supabase
    .from('student_subjects')
    .update(payload)
    .eq('id', studentSubjectId);

  if (error) throw error;

  return average;
}
