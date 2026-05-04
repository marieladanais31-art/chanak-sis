
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Users, BookOpen, Loader2, X, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import GradeEntriesManager from '@/components/GradeEntriesManager';
import { ACTIVE_SCHOOL_YEAR, QUARTERS, dedupeAcademicSubjects } from '@/lib/academicUtils';

export default function TutorDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [activeQuarter, setActiveQuarter] = useState('Q1');

  const [selectedStudentSubject, setSelectedStudentSubject] = useState(null);
  const [isGradeEntriesModalOpen, setIsGradeEntriesModalOpen] = useState(false);

  const loadStudents = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level, us_grade_level')
        .eq('tutor_id', profile.id);
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Error al cargar estudiantes asignados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async (studentId, quarter) => {
    setLoadingSubjects(true);
    try {
      const { data, error } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_year', ACTIVE_SCHOOL_YEAR)
        .eq('quarter', quarter)
        .order('subject_order', { ascending: true });
      if (error) throw error;
      setStudentSubjects(dedupeAcademicSubjects(data || []));
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Error al cargar materias.', variant: 'destructive' });
      setStudentSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [profile]);

  useEffect(() => {
    if (selectedStudent) {
      loadSubjects(selectedStudent.id, activeQuarter);
    } else {
      setStudentSubjects([]);
    }
  }, [selectedStudent, activeQuarter]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleEntriesChanged = async (updatedSubject) => {
    if (!selectedStudent) return;
    await loadSubjects(selectedStudent.id, activeQuarter);
    if (updatedSubject?.id && selectedStudentSubject?.id === updatedSubject.id) {
      setSelectedStudentSubject((prev) => ({ ...prev, ...updatedSubject }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-teal-700 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Portal del Tutor</h1>
            <p className="text-sm text-teal-100">{profile?.first_name || 'Tutor'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-teal-800 hover:bg-teal-900 px-4 py-2 rounded-lg transition-colors font-semibold"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-6 h-6 text-teal-600" />
            <h2 className="text-2xl font-black text-slate-800">Mis Estudiantes Asignados</h2>
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : students.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
              No tienes estudiantes asignados en este momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col transition-all cursor-pointer ${
                    selectedStudent?.id === student.id
                      ? 'border-teal-500 ring-2 ring-teal-200'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                  onClick={() => setSelectedStudent(selectedStudent?.id === student.id ? null : student)}
                >
                  <div className="p-5 flex-1">
                    <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg mb-4">
                      {student.first_name.charAt(0)}
                    </div>
                    <h3 className="font-bold text-lg text-slate-800 leading-tight">
                      {student.first_name} {student.last_name}
                    </h3>
                    <p className="text-sm text-slate-500">{student.us_grade_level || student.grade_level || 'Sin grado'}</p>
                  </div>
                  <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
                    <span className="text-xs font-bold text-teal-600">
                      {selectedStudent?.id === student.id ? 'Seleccionado' : 'Ver materias →'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                <h3 className="font-black text-lg text-slate-800">
                  Materias de {selectedStudent.first_name} {selectedStudent.last_name}
                </h3>
              </div>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
              {QUARTERS.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setActiveQuarter(q.id)}
                  className={`px-6 py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                    activeQuarter === q.id
                      ? 'border-teal-600 text-teal-700 bg-white'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" /> {q.id}
                </button>
              ))}
            </div>

            <div className="p-6">
              {loadingSubjects ? (
                <div className="flex justify-center p-10">
                  <Loader2 className="w-7 h-7 animate-spin text-teal-600" />
                </div>
              ) : studentSubjects.length === 0 ? (
                <p className="text-center text-slate-500 py-10">
                  No hay materias registradas para {activeQuarter} ({ACTIVE_SCHOOL_YEAR}).
                </p>
              ) : (
                <div className="space-y-2">
                  {studentSubjects.map((subject) => {
                    const statusCfg = {
                      draft:     { label: 'Borrador',    cls: 'bg-slate-100 text-slate-600' },
                      submitted: { label: 'En revisión', cls: 'bg-amber-100 text-amber-700' },
                      approved:  { label: 'Aprobado',   cls: 'bg-emerald-100 text-emerald-700' },
                      rejected:  { label: 'Rechazado',  cls: 'bg-red-100 text-red-700' },
                    }[subject.grade_submission_status || 'draft'];

                    return (
                      <div
                        key={subject.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{subject.subject_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{subject.category || 'General'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-[#193D6D]">
                            {subject.grade != null ? `${parseFloat(subject.grade).toFixed(1)}%` : '—'}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCfg.cls}`}>
                            {statusCfg.label}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedStudentSubject(subject);
                              setIsGradeEntriesModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-lg font-bold transition-colors"
                          >
                            Gestionar Notas
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {isGradeEntriesModalOpen && selectedStudentSubject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-800">
                Notas: {selectedStudentSubject.subject_name} · {selectedStudentSubject.quarter}
              </h3>
              <button
                onClick={() => setIsGradeEntriesModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <GradeEntriesManager
                studentSubject={selectedStudentSubject}
                canEdit={true}
                onEntriesChanged={handleEntriesChanged}
              />
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsGradeEntriesModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-bold hover:bg-slate-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
