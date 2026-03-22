
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { LogOut, GraduationCap, Download, Activity, AlertCircle, CheckCircle2, Loader2, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calculateTrimestralPACES, QUARTERS, getQuarterName, isValidQuarter } from '@/utils/schoolCalendar';

export default function StudentDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  
  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!profile?.id) return;
      try {
        console.log(`👨‍🎓 Inicializando StudentDashboard para ID: ${profile.id}`);
        const { data: sData, error: sError } = await supabase.from('students').select('*').eq('user_id', profile.id).single();
        if (sError) throw sError;
        setStudent(sData);

        if (sData) {
          const { data: gData } = await supabase.from('student_grades').select('*').eq('student_id', sData.id);
          const validatedGrades = (gData || []).map(g => ({
            ...g,
            quarter: isValidQuarter(g.quarter) ? g.quarter : QUARTERS.Q1
          }));
          setGrades(validatedGrades);
        }

        const { data: subData } = await supabase.from('subjects').select('*');
        setSubjects(subData || []);

      } catch (err) {
        console.error("❌ Error loading student data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [profile]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) return <div className="min-h-screen flex justify-center items-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  if (!student) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <AlertCircle className="w-16 h-16 text-slate-400 mb-4" />
      <h2 className="text-xl font-bold text-slate-700">No se encontró perfil de estudiante asociado.</h2>
      <button onClick={handleLogout} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors">Cerrar Sesión</button>
    </div>
  );

  const projection = calculateTrimestralPACES(student.created_at, grades);

  const renderQuarterGrades = (quarterCode) => {
    const qGrades = grades.filter(g => g.quarter === quarterCode);
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
              const subDetails = subjects.find(s => s.name === g.subject);
              return (
                <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 px-6 font-medium text-slate-800">{g.subject}</td>
                  <td className="p-3 px-6 text-slate-500 text-xs uppercase tracking-wider">{subDetails?.category || 'Electiva'}</td>
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
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Cerrar Sesión</span>
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
                    <p className="text-2xl font-black text-emerald-900">{grades.filter(g => parseFloat(g.score)>=70).length}</p>
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
                     <tr><td colSpan="3" className="p-6 text-center text-slate-500">Aún no hay notas registradas.</td></tr>
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
