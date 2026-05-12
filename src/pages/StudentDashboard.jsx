
import React, { useState, useEffect } from 'react';
import { ACTIVE_SCHOOL_YEAR, isPassingPaceScore } from '@/lib/academicUtils';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { LogOut, GraduationCap, Download, Activity, AlertCircle, CheckCircle2, Loader2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateTrimestralPACES, QUARTERS, getQuarterName, isValidQuarter } from '@/utils/schoolCalendar';

const MISSING_STUDENT_COLUMN_CODES = new Set(['42703', 'PGRST204']);

const isMissingStudentColumnError = (error) => (
  MISSING_STUDENT_COLUMN_CODES.has(error?.code) ||
  /column .* does not exist/i.test(error?.message || '') ||
  /Could not find .* column/i.test(error?.message || '')
);

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

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
          return;
        }

        const quarterCodes = Object.values(QUARTERS);
        let loadedSubjects = [];

        try {
          const { data: subData, error: subError } = await supabase
            .from('student_subjects')
            .select('id, student_id, subject_name, academic_block, pillar_type, grade, quarter, school_year, approval_status, credit_value')
            .eq('student_id', sData.id)
            .eq('school_year', ACTIVE_SCHOOL_YEAR)
            .in('quarter', quarterCodes);

          if (subError) {
            console.error('[StudentDashboard] subjects load error', subError);
            setSubjectsError('No se pudieron cargar materias.');
            setSubjects([]);
          } else {
            loadedSubjects = subData || [];
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
            .select('id, student_id, student_subject_id, assessment_name, score, quarter, school_year, submission_status, created_at, updated_at')
            .eq('student_id', sData.id)
            .eq('school_year', ACTIVE_SCHOOL_YEAR)
            .in('quarter', quarterCodes)
            .eq('submission_status', 'approved')
            .not('score', 'is', null)
            .order('quarter', { ascending: true })
            .order('created_at', { ascending: true });

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
                category: subject?.academic_block || subject?.pillar_type || 'Materia registrada',
                completed_at: gradeEntry.updated_at || gradeEntry.created_at,
                quarter: isValidQuarter(gradeEntry.quarter) ? gradeEntry.quarter : QUARTERS.Q1,
              };
            });
            setGrades(validatedGrades);
          }
        } catch (gError) {
          console.error('[StudentDashboard] grades load error', gError);
          setGradesError('No se pudieron cargar calificaciones.');
          setGrades([]);
        }
      } catch (err) {
        console.error('❌ Error loading linked student:', err);
        setStudent(null);
        setGrades([]);
        setSubjects([]);
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

  const renderQuarterGrades = (quarterCode) => {
    const qGrades = grades.filter(g => g.quarter === quarterCode);
    if (grades.length === 0) return <p className="text-slate-500 text-sm py-4 px-6">Aún no hay calificaciones registradas.</p>;
    if (qGrades.length === 0) return <p className="text-slate-500 text-sm py-4 px-6">No hay calificaciones en este trimestre.</p>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 font-bold">
            <tr>
              <th className="p-3 px-6">Materia</th>
              <th className="p-3 px-6">Tipo</th>
              <th className="p-3 px-6 text-center">Score</th>
              <th className="p-3 px-6 text-right">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {qGrades.map(g => {
              const subDetails = subjects.find((s) => s.id === g.student_subject_id);
              return (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 px-6 font-medium text-slate-800">{g.subject}</td>
                  <td className="p-3 px-6 text-slate-500 text-xs uppercase tracking-wider">{g.category || subDetails?.academic_block || subDetails?.pillar_type || 'Materia registrada'}</td>
                  <td className="p-3 px-6 text-center font-bold text-slate-800">{g.score}%</td>
                  <td className="p-3 px-6 text-right text-slate-500">{new Date(g.completed_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
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

      <main className="max-w-4xl mx-auto p-4 py-8 space-y-6">
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
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={() => setReportModalOpen(true)} className="flex-1 sm:flex-none py-3 px-6 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors">
              <Activity className="w-5 h-5 text-sky-600" /> Boletín
            </button>
            {student.pei_url && (
              <a href={student.pei_url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none py-3 px-6 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-colors">
                <Download className="w-5 h-5 text-indigo-600" /> Mi PEI
              </a>
            )}
          </div>
        </div>

        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mt-8 mb-4">
          <BookOpen className="w-6 h-6 text-sky-600" /> Registro Académico por Trimestre
        </h3>

        {(gradesError || subjectsError) && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">No se pudieron cargar calificaciones/materias.</p>
              <ul className="text-sm mt-1 list-disc list-inside">
                {gradesError && <li>{gradesError}</li>}
                {subjectsError && <li>{subjectsError}</li>}
              </ul>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="pt-6 border-b border-slate-100">
            <h4 className="font-bold text-lg text-slate-800 mb-2 px-6">{getQuarterName(QUARTERS.Q1)}</h4>
            {renderQuarterGrades(QUARTERS.Q1)}
          </div>
          <div className="pt-6 border-b border-slate-100 bg-slate-50/30">
            <h4 className="font-bold text-lg text-slate-800 mb-2 px-6">{getQuarterName(QUARTERS.Q2)}</h4>
            {renderQuarterGrades(QUARTERS.Q2)}
          </div>
          <div className="pt-6">
            <h4 className="font-bold text-lg text-slate-800 mb-2 px-6">{getQuarterName(QUARTERS.Q3)}</h4>
            {renderQuarterGrades(QUARTERS.Q3)}
          </div>
        </div>
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
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Aprobados</p>
                    <p className="text-2xl font-black text-emerald-900">{grades.filter((g) => isPassingPaceScore(g.score)).length}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-center col-span-2">
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1">Promedio General</p>
                    <p className="text-2xl font-black text-purple-900">
                      {grades.length > 0 ? (grades.reduce((acc, g) => acc + parseFloat(g.score), 0) / grades.length).toFixed(1) : 0}%
                    </p>
                  </div>
               </div>
               <table className="w-full text-left text-sm border border-slate-200 rounded-lg overflow-hidden">
                 <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                   <tr><th className="p-3">Materia</th><th className="p-3 text-center">Score</th><th className="p-3 text-right">Trimestre</th></tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {grades.map(g => (
                     <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                       <td className="p-3 font-medium text-slate-800">{g.subject}</td>
                       <td className="p-3 text-center font-bold text-slate-800">{g.score}%</td>
                       <td className="p-3 text-right text-slate-500 font-medium">{g.quarter}</td>
                     </tr>
                   ))}
                   {grades.length === 0 && (
                     <tr><td colSpan="3" className="p-6 text-center text-slate-500">Aún no hay calificaciones registradas.</td></tr>
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
