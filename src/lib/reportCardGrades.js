import { calculateAverageGrade, normalizeBlock, normalizeNumericGrade } from '@/lib/academicUtils';

const APPROVED_STATUS = 'approved';

function normalizeText(value) {
  return String(value || '').trim();
}

function isAceSubject(subject) {
  const block = normalizeBlock(subject?.academic_block);
  const source = `${block} ${subject?.academic_block || ''} ${subject?.pillar_type || ''} ${subject?.category || ''}`.toUpperCase();
  return source.includes('CORE') || source.includes('A.C.E') || source.includes('ACE');
}

function isLifeSkillsSubject(subject) {
  const block = normalizeBlock(subject?.academic_block);
  const source = `${block} ${subject?.academic_block || ''} ${subject?.pillar_type || ''} ${subject?.category || ''}`.toUpperCase();
  return source.includes('LIFE SKILLS') || source.includes('LEADERSHIP');
}

function isLocalExtensionSubject(subject) {
  const block = normalizeBlock(subject?.academic_block);
  const source = `${block} ${subject?.academic_block || ''} ${subject?.pillar_type || ''} ${subject?.category || ''}`.toUpperCase();
  return source.includes('EXTENSIÓN') || source.includes('EXTENSION') || source.includes('LOCAL');
}

function extractPaceNumber(entry) {
  const match = normalizeText(entry?.assessment_name).match(/PACE\s*#?\s*(\d+)/i);
  return match?.[1] || null;
}

function uniqueValues(values) {
  return [...new Set(values.map(normalizeText).filter(Boolean))];
}

export function isApprovedGradeEntry(entry) {
  return normalizeText(entry?.submission_status).toLowerCase() === APPROVED_STATUS;
}

export function normalizeReportCardScore(value) {
  const score = normalizeNumericGrade(value);
  return score === null ? null : Number(score.toFixed(2));
}

export function buildReportCoursesFromApprovedGrades(subjects = [], gradeEntries = []) {
  const approvedEntriesBySubject = new Map();

  gradeEntries.filter(isApprovedGradeEntry).forEach((entry) => {
    if (!entry?.student_subject_id) return;
    const current = approvedEntriesBySubject.get(entry.student_subject_id) || [];
    current.push({ ...entry, score: normalizeReportCardScore(entry.score) });
    approvedEntriesBySubject.set(entry.student_subject_id, current);
  });

  return subjects
    .map((subject) => {
      const entries = approvedEntriesBySubject.get(subject.id) || [];
      if (entries.length === 0) return null;

      const paceNumbers = uniqueValues(entries.map(extractPaceNumber));
      const scoreEntries = entries.filter((entry) => entry.score !== null);
      const average = calculateAverageGrade(scoreEntries);
      const comments = uniqueValues(entries.map((entry) => entry.review_comment || entry.assessment_name));
      const ace = isAceSubject(subject);
      const lifeSkills = isLifeSkillsSubject(subject);
      const localExtension = isLocalExtensionSubject(subject);
      const masteryStatus = ace && average !== null ? (average >= 80 ? 'approved' : 'not_mastered') : null;

      return {
        student_subject_id: subject.id,
        subject_name: subject.subject_name || 'Materia registrada',
        academic_block: subject.academic_block || subject.pillar_type || subject.category || '',
        pace_numbers: ace ? paceNumbers.join(', ') : '',
        credits: String(subject.credit_value ?? subject.credits ?? 0.5),
        final_grade: average !== null ? String(average) : '',
        grade_status: average !== null && average < 60 ? 'failed' : 'approved',
        subject_category: ace ? 'core_ace' : lifeSkills ? 'life_skills' : localExtension ? 'local_extension' : 'core_ace',
        is_local_subject: localExtension,
        assessment_count: entries.length,
        qualitative_evaluation: average === null ? comments.join(' · ') : '',
        evaluation_note: comments.join(' · '),
        mastery_status: masteryStatus,
      };
    })
    .filter(Boolean);
}

export function summarizeReportReadiness(gradeEntries = []) {
  const relevantEntries = gradeEntries.filter((entry) => entry?.id);
  const pendingEntries = relevantEntries.filter((entry) => !isApprovedGradeEntry(entry));
  const approvedEntries = relevantEntries.filter(isApprovedGradeEntry);

  return {
    hasApprovedGrades: approvedEntries.length > 0,
    allPeriodGradesApproved: relevantEntries.length > 0 && pendingEntries.length === 0,
    approvedCount: approvedEntries.length,
    pendingCount: pendingEntries.length,
    totalCount: relevantEntries.length,
  };
}
