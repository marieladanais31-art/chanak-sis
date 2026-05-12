import React, { useState, useEffect } from 'react';
import { ACTIVE_SCHOOL_YEAR, isPassingPaceScore } from '@/lib/academicUtils';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  LogOut,
  GraduationCap,
  Download,
  Activity,
  AlertCircle,
  CheckCircle2,
  Loader2,
  BookOpen,
  ClipboardCheck,
  FileText,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateTrimestralPACES, QUARTERS, getQuarterName, isValidQuarter } from '@/utils/schoolCalendar';

const MISSING_STUDENT_COLUMN_CODES = new Set(['42703', 'PGRST204']);
const OPTIONAL_TABLE_MISSING_CODES = new Set(['42P01', 'PGRST106', 'PGRST116', 'PGRST200', 'PGRST204']);
const DASHBOARD_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const QUARTER_CODES = DASHBOARD_QUARTERS;

const isMissingStudentColumnError = (error) => (
  MISSING_STUDENT_COLUMN_CODES.has(error?.code) ||
  /column .* does not exist/i.test(error?.message || '') ||
  /Could not find .* column/i.test(error?.message || '')
);

const isOptionalTableError = (error) => (
  OPTIONAL_TABLE_MISSING_CODES.has(error?.code) ||
  /relation .* does not exist/i.test(error?.message || '') ||
  /Could not find the table/i.test(error?.message || '') ||
  /Could not find .* column/i.test(error?.message || '')
);

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const formatScore = (score) => {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) return '—';
  return `${Math.max(0, Math.min(100, numericScore)).toFixed(numericScore % 1 === 0 ? 0 : 1)}/100`;
};

const formatDate = (date) => {
  if (!date) return 'Sin fecha';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return parsed.toLocaleDateString();
};

const getSubjectType = (subject) => (
  subject?.academic_block || subject?.pillar_type || 'Materia asignada'
);

const isDashboardQuarter = (quarter) => DASHBOARD_QUARTERS.includes(quarter);

const getDashboardQuarterName = (quarter) => (
  isValidQuarter(quarter) ? getQuarterName(quarter) : `${quarter} (Jul-Ago)`
);

const getMasteryMessage = (score) => (
  isPassingPaceScore(score) ? 'Dominio ACE alcanzado' : 'Requiere repetición/corrección'
);

const dedupeSubjects = (subjectRows) => {
  const seen = new Set();
  return (subjectRows || []).filter((subject) => {
    const key = subject.id || [
      subject.student_id,
      subject.subject_name,
      subject.academic_block,
      subject.pillar_type,
      subject.quarter,
      subject.school_year,
    ].join('__');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

async function findStudentByColumn(column, value, { caseInsensitive = false } = {}) {
  if (!value) return null;

  let query = supabase.from('students').select('*').limit(1);
  query = caseInsensitive ? query.ilike(column, value) : query.eq(column, value);

  const { data, error } = await query;
  if (error) {
    if (isMissingStudentColumnError(error)) {
      console.info(`ℹ️ StudentDashboard: columna students.${column} no disponible; se omite esta estrategia.`);
      return null;
    }
    throw error;
  }

  return data?.[0] || null;
}

async function findLinkedStudent(profile, user) {
  if (profile?.role !== 'student') return null;

  const studentByProfileId = await findStudentByColumn('profile_id', profile.id);
  console.log('[StudentDashboard] student by profile_id', studentByProfileId);
  if (studentByProfileId) return studentByProfileId;

  const profileEmail = normalizeEmail(profile?.email || user?.email);
  const authUserId = profile?.user_id || user?.id;
  const lookupSteps = [
    { column: 'email', value: profileEmail, caseInsensitive: true },
    { column: 'student_email', value: profileEmail, caseInsensitive: true },
    { column: 'user_id', value: authUserId },
  ];

  for (const step of lookupSteps) {
    const found = await findStudentByColumn(step.column, step.value, {
      caseInsensitive: step.caseInsensitive,
    });
    if (found) return found;
  }

  return null;
}

export default function StudentDashboard() {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [evidenceSubmissions, setEvidenceSubmissions] = useState([]);
  const [publishedTranscripts, setPublishedTranscripts] = useState([]);
  const [publishedPei, setPublishedPei] = useState(null);
  const [gradesError, setGradesError] = useState(null);
  const [subjectsError, setSubjectsError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setGradesError(null);
      setSubjectsError(null);

      try {
        console.log(`👨‍🎓 Inicializando StudentDashboard para perfil: ${profile.id}`);
        console.log('[StudentDashboard] auth profile', profile);
        const sData = await findLinkedStudent(profile, user);
        console.log('[StudentDashboard] linked student found', sData);
        setStudent(sData);

        if (!sData) {
          setGrades([]);
          setSubjects([]);
          setEvidenceSubmissions([]);
          setPublishedTranscripts([]);
          setPublishedPei(null);
          return;
        }

        let loadedSubjects = [];

        try {
          const { data: subData, error: subError } = await supabase
            .from('student_subjects')
            .select('id, student_id, subject_name, academic_block, pillar_type, grade, quarter, school_year, approval_status, credit_value')
            .eq('student_id', sData.id)
            .eq('school_year', ACTIVE_SCHOOL_YEAR)
            .in('quarter', QUARTER_CODES)
            .order('quarter', { ascending: true })
            .order('subject_name', { ascending: true });

          if (subError) {
            console.error('[StudentDashboard] subjects load error', subError);
            setSubjectsError('No se pudieron cargar materias.');
            setSubjects([]);
          } else {
            loadedSubjects = dedupeSubjects(subData || []);
            setSubjects(loadedSubjects);
          }
        } catch (subError) {
          console.error('[StudentDashboard] subjects load error', subError);
          setSubjectsError('No se pudieron cargar materias.');
          setSubjects([]);
        }

        const subjectsById = new Map(loadedSubjects.map((subject) => [subject.id, subject]));

        try {
          const { data: gData, error: gError } = await supabase
            .from('student_grade_entries')
            .select('id, student_id, student_subject_id, assessment_name, score, quarter, school_year, submission_status, created_at, updated_at, date_recorded, review_comment')
            .eq('student_id', sData.id)
            .eq('school_year', ACTIVE_SCHOOL_YEAR)
            .in('quarter', QUARTER_CODES)
            .eq('submission_status', 'approved')
            .not('score', 'is', null)
            .order('quarter', { ascending: true })
            .order('date_recorded', { ascending: true });

          if (gError) {
            console.error('[StudentDashboard] grades load error', gError);
            setGradesError('No se pudieron cargar calificaciones.');
            setGrades([]);
          } else {
            const validatedGrades = (gData || []).map((gradeEntry) => {
              const subject = subjectsById.get(gradeEntry.student_subject_id);
              return {
                ...gradeEntry,
                subject: subject?.subject_name || gradeEntry.assessment_name || 'Materia registrada',
                category: getSubjectType(subject),
                completed_at: gradeEntry.date_recorded || gradeEntry.updated_at || gradeEntry.created_at,
                quarter: isDashboardQuarter(gradeEntry.quarter) ? gradeEntry.quarter : QUARTERS.Q1,
              };
            });
            setGrades(validatedGrades);
          }
        } catch (gError) {
          console.error('[StudentDashboard] grades load error', gError);
          setGradesError('No se pudieron cargar calificaciones.');
          setGrades([]);
        }

        try {
          const { data: evidenceData, error: evidenceError } = await supabase
            .from('academic_evidence_submissions')
            .select('id, student_id, student_subject_id, subject_name, school_year, quarter, pace_number, score, evidence_type, review_status, academic_outcome, reviewer_comment, created_at, reviewed_at')
            .eq('student_id', sData.id)
            .eq('school_year', ACTIVE_SCHOOL_YEAR)
            .in('quarter', QUARTER_CODES)
            .order('created_at', { ascending: false });

          if (evidenceError) {
            if (!isOptionalTableError(evidenceError)) console.warn('[StudentDashboard] evidence load warning', evidenceError);
            setEvidenceSubmissions([]);
          } else {
            setEvidenceSubmissions(evidenceData || []);
          }
        } catch (evidenceError) {
          if (!isOptionalTableError(evidenceError)) console.warn('[StudentDashboard] evidence load warning', evidenceError);
          setEvidenceSubmissions([]);
        }

        try {
          const { data: transcriptData, error: transcriptError } = await supabase
            .from('transcript_records')
            .select('id, student_id, school_year, quarter, language, status, gpa, academic_observations, published_at, created_at')
            .eq('student_id', sData.id)
            .eq('school_year', ACTIVE_SCHOOL_YEAR)
            .eq('status', 'published')
            .order('published_at', { ascending: false });

          if (transcriptError) {
            if (!isOptionalTableError(transcriptError)) console.warn('[StudentDashboard] transcripts load warning', transcriptError);
            setPublishedTranscripts([]);
          } else {
            setPublishedTranscripts(transcriptData || []);
          }
        } catch (transcriptError) {
          if (!isOptionalTableError(transcriptError)) console.warn('[StudentDashboard] transcripts load warning', transcriptError);
          setPublishedTranscripts([]);
        }

        try {
          const { data: peiData, error: peiError } = await supabase
            .from('individualized_education_plans')
            .select('id, student_id, school_year, quarter, status, issue_date, published_at, initial_diagnosis, quarterly_objectives')
            .eq('student_id', sData.id)
            .eq('school_year', ACTIVE_SCHOOL_YEAR)
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(1);

          if (peiError) {
            if (!isOptionalTableError(peiError)) console.warn('[StudentDashboard] PEI load warning', peiError);
            setPublishedPei(null);
          } else {
            setPublishedPei(peiData?.[0] || null);
          }
        } catch (peiError) {
          if (!isOptionalTableError(peiError)) console.warn('[StudentDashboard] PEI load warning', peiError);
          setPublishedPei(null);
        }
      } catch (err) {
        console.error('❌ Error loading linked student:', err);
        setStudent(null);
        setGrades([]);
        setSubjects([]);
        setEvidenceSubmissions([]);
        setPublishedTranscripts([]);
        setPublishedPei(null);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [profile, user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  if (!student) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <AlertCircle className="w-16 h-16 text-slate-400 mb-4" />
      <h2 className="text-xl font-bold text-slate-700">Estudiante no vinculado. Contacte a administración.</h2>
      <button onClick={handleLogout} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors">Cerrar sesión</button>
    </div>
  );

  const projection = calculateTrimestralPACES(student.created_at, grades);
  const averageScore = grades.length > 0
    ? grades.reduce((acc, grade) => acc + Number(grade.score || 0), 0) / grades.length
    : null;
  const masteryCount = grades.filter((grade) => isPassingPaceScore(grade.score)).length;

  const renderQuarterGrades = (quarterCode) => {
    const qGrades = grades.filter((grade) => grade.quarter === quarterCode);
    if (grades.length === 0) return <p className="text-slate-500 text-sm py-4 px-6">Aún no hay calificaciones aprobadas.</p>;
    if (qGrades.length === 0) return <p className="text-slate-500 text-sm py-4 px-6">No hay calificaciones aprobadas en este trimestre.</p>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 font-bold">
            <tr>
              <th className="p-3 px-6">Materia</th>
              <th className="p-3 px-6">Tipo</th>
              <th className="p-3 px-6 text-center">Nota</th>
              <th className="p-3 px-6">Resultado</th>
              <th className="p-3 px-6 text-right">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {qGrades.map((grade) => (
              <tr key={grade.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 px-6 font-medium text-slate-800">{grade.subject}</td>
                <td className="p-3 px-6 text-slate-500 text-xs uppercase tracking-wider">{grade.category}</td>
                <td className="p-3 px-6 text-center font-bold text-slate-800">{formatScore(grade.score)}</td>
                <td className={`p-3 px-6 text-xs font-black uppercase tracking-wide ${isPassingPaceScore(grade.score) ? 'text-emerald-700' : 'text-rose-700'}`}>{getMasteryMessage(grade.score)}</td>
                <td className="p-3 px-6 text-right text-slate-500">{formatDate(grade.completed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-sky-600 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">Mi Portal Estudiantil</h1>
              <p className="text-sm text-sky-100">{student.first_name} {student.last_name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-sky-700 hover:bg-sky-800 px-4 py-2 rounded-lg transition-colors font-semibold">
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 py-8 space-y-8">
        <section className="space-y-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="w-6 h-6 text-sky-600" /> Resumen académico
          </h3>

          <div className={`p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 ${projection.isOnTrack ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <div className="flex items-center gap-4">
              {projection.isOnTrack ? <CheckCircle2 className="w-12 h-12 text-emerald-600 shrink-0" /> : <AlertCircle className="w-12 h-12 text-rose-600 shrink-0" />}
              <div>
                <h2 className={`text-xl font-black ${projection.isOnTrack ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {projection.quarterName}
                </h2>
                <p className={`text-sm font-medium mt-1 ${projection.isOnTrack ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {projection.isOnTrack
                    ? `¡Excelente! Estás al día con ${projection.actualPACES} PACES aprobados.`
                    : `Atención: Te faltan ${projection.deficit} PACES para cumplir la meta trimestral.`}
                </p>
              </div>
            </div>
            <button onClick={() => setReportModalOpen(true)} className="w-full sm:w-auto py-3 px-6 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors">
              <Activity className="w-5 h-5 text-sky-600" /> Ver resumen
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Notas aprobadas</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{grades.length}</p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Dominio ACE</p>
              <p className="text-3xl font-black text-emerald-700 mt-2">{masteryCount}</p>
            </div>
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Promedio</p>
              <p className="text-3xl font-black text-purple-700 mt-2">{averageScore === null ? '—' : formatScore(averageScore)}</p>
            </div>
          </div>

          {grades.length === 0 && !gradesError && (
            <div className="bg-white border border-slate-200 text-slate-600 rounded-2xl p-4">
              Aún no hay calificaciones aprobadas.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Layers className="w-6 h-6 text-sky-600" /> Mis materias
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {subjects.length === 0 ? (
              <p className="text-slate-500 text-sm py-6 px-6">Aún no hay materias asignadas.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                {subjects.map((subject) => (
                  <div key={subject.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
                    <p className="font-black text-slate-800">{subject.subject_name}</p>
                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mt-1">{getSubjectType(subject)}</p>
                    <div className="flex gap-2 flex-wrap mt-3 text-xs font-bold">
                      <span className="bg-white border border-slate-200 rounded-full px-3 py-1">{subject.quarter}</span>
                      <span className="bg-white border border-slate-200 rounded-full px-3 py-1">{subject.school_year}</span>
                      {subject.grade !== null && subject.grade !== undefined && <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-3 py-1">Promedio {formatScore(subject.grade)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {(gradesError || subjectsError) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">El portal sigue disponible, pero hubo un problema cargando datos académicos.</p>
              <ul className="text-sm mt-1 list-disc list-inside">
                {gradesError && <li>{gradesError}</li>}
                {subjectsError && <li>{subjectsError}</li>}
              </ul>
            </div>
          </div>
        )}

        <section className="space-y-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-sky-600" /> Registro por trimestre
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {DASHBOARD_QUARTERS.map((quarterCode, index) => (
                <div key={quarterCode} className={`pt-6 ${index < DASHBOARD_QUARTERS.length - 1 ? 'border-b border-slate-100' : ''} ${index % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <h4 className="font-bold text-lg text-slate-800 mb-2 px-6">{getDashboardQuarterName(quarterCode)}</h4>
                  {renderQuarterGrades(quarterCode)}
                </div>
              ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-sky-600" /> Evidencias/estado de revisión
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {evidenceSubmissions.length === 0 ? (
              <p className="text-slate-500 text-sm py-6 px-6">Aún no hay evidencias registradas para revisión.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {evidenceSubmissions.map((evidence) => (
                  <div key={evidence.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-800">{evidence.subject_name}</p>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{evidence.evidence_type} · {evidence.quarter} · {formatScore(evidence.score)}</p>
                      {evidence.reviewer_comment && <p className="text-sm text-slate-600 mt-2">{evidence.reviewer_comment}</p>}
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-500">{evidence.review_status}</p>
                      <p className="text-sm font-bold text-slate-700">{evidence.academic_outcome}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-sky-600" /> Boletines publicados
            </h3>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {publishedTranscripts.length === 0 ? (
                <p className="text-slate-500 text-sm py-6 px-6">Aún no hay boletines publicados.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {publishedTranscripts.map((transcript) => (
                    <div key={transcript.id} className="p-5">
                      <p className="font-black text-slate-800">{transcript.quarter} · {transcript.school_year}</p>
                      <p className="text-sm text-slate-500">Publicado: {formatDate(transcript.published_at || transcript.created_at)}</p>
                      {transcript.gpa !== null && transcript.gpa !== undefined && <p className="text-sm font-bold text-purple-700 mt-1">GPA: {transcript.gpa}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" /> PEI publicado
            </h3>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
              {publishedPei ? (
                <div>
                  <p className="font-black text-slate-800">PEI {publishedPei.school_year}</p>
                  <p className="text-sm text-slate-500">Publicado: {formatDate(publishedPei.published_at || publishedPei.issue_date)}</p>
                  {publishedPei.quarter && <p className="text-sm font-bold text-indigo-700 mt-1">Periodo: {publishedPei.quarter}</p>}
                  {student.pei_url && (
                    <a href={student.pei_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex py-2.5 px-4 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold items-center gap-2 transition-colors">
                      <Download className="w-4 h-4" /> Descargar PEI
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Aún no hay PEI publicado.</p>
              )}
            </div>
          </div>
        </section>
      </main>

      {reportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                <Activity className="w-6 h-6 text-sky-600" /> Resumen General
              </h3>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-sky-50 border border-sky-100 p-4 rounded-xl text-center">
                  <p className="text-[10px] font-black text-sky-600 uppercase tracking-wider mb-1">Total Notas</p>
                  <p className="text-2xl font-black text-sky-900">{grades.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Dominio ACE</p>
                  <p className="text-2xl font-black text-emerald-900">{masteryCount}</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-center col-span-2">
                  <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">Promedio General</p>
                  <p className="text-2xl font-black text-purple-900">{averageScore === null ? '—' : formatScore(averageScore)}</p>
                </div>
              </div>
              <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr><th className="p-3">Materia</th><th className="p-3 text-center">Nota</th><th className="p-3">Resultado</th><th className="p-3 text-right">Trimestre</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((grade) => (
                    <tr key={grade.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-medium text-slate-800">{grade.subject}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{formatScore(grade.score)}</td>
                      <td className="p-3 text-xs font-black uppercase text-slate-600">{getMasteryMessage(grade.score)}</td>
                      <td className="p-3 text-right text-slate-500 font-medium">{grade.quarter}</td>
                    </tr>
                  ))}
                  {grades.length === 0 && (
                    <tr><td colSpan="4" className="p-6 text-center text-slate-500">Aún no hay calificaciones aprobadas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setReportModalOpen(false)} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
