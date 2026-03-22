
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, GraduationCap, CalendarDays, Save, BookOpen, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import GradeEntriesManager from '@/components/GradeEntriesManager';
import { ACADEMIC_YEAR, BLOCK_ORDER, QUARTERS, dedupeStudentSubjects, normalizeBlock } from '@/lib/academicRecords';


export default function AdminAcademico() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [activeQuarter, setActiveQuarter] = useState('Q1');
  const [savingId, setSavingId] = useState(null);
  
  // Modal state
  const [selectedStudentSubject, setSelectedStudentSubject] = useState(null);
  const [isGradeEntriesModalOpen, setIsGradeEntriesModalOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      loadSubjects(selectedStudent, activeQuarter);
    } else {
      setSubjects([]);
    }
  }, [selectedStudent, activeQuarter]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_label, us_grade_level')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('[AdminAcademico] Error loading students:', err);
      toast({
        title: 'Error',
        description: 'Error al cargar estudiantes.',
        variant: 'destructive',
      });
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
        .eq('school_year', ACADEMIC_YEAR)
        .eq('quarter', quarter)
        .order('subject_order', { ascending: true });

      if (error) throw error;

      setSubjects(dedupeStudentSubjects(data || []));
    } catch (err) {
      console.error('[AdminAcademico] Error loading subjects:', err);
      toast({
        title: 'Error',
        description: 'Error al cargar materias del estudiante.',
        variant: 'destructive',
      });
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const updateSubjectField = async (id, field, value) => {
    const normalizedValue = value;

    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: normalizedValue } : s))
    );

    setSavingId(id);

    try {
      const payload = {
        [field]: normalizedValue,
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('student_subjects')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('[AdminAcademico] Error saving field:', err);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el cambio.',
        variant: 'destructive',
      });
      if (selectedStudent) {
        loadSubjects(selectedStudent, activeQuarter);
      }
    } finally {
      setSavingId(null);
    }
  };

  const groupedSubjects = useMemo(() => {
    const grouped = {};
    BLOCK_ORDER.forEach((block) => {
      grouped[block] = [];
    });

    subjects.forEach((sub) => {
      const block = normalizeBlock(sub.academic_block);
      if (!grouped[block]) grouped[block] = [];
      grouped[block].push(sub);
    });

    return grouped;
  }, [subjects]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Módulo Académico</h2>
        <p className="text-sm text-slate-500 font-medium">
          Gestión real de materias y notas por trimestre
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wider">
          <GraduationCap className="w-4 h-4 inline-block mr-1 text-blue-600" /> Seleccionar Estudiante
        </label>
        <select
          className="w-full p-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium bg-slate-50"
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
        >
          <option value="">-- Seleccione un estudiante de la lista --</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.first_name} {s.last_name} ({s.grade_label || s.us_grade_level || 'N/A'})
            </option>
          ))}
        </select>
      </div>

      {selectedStudent && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
            {QUARTERS.map((q) => (
              <button
                key={q.id}
                onClick={() => setActiveQuarter(q.id)}
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                  activeQuarter === q.id
                    ? 'border-blue-600 text-blue-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <CalendarDays className={`w-4 h-4 ${activeQuarter === q.id ? 'text-blue-600' : 'text-slate-400'}`} />
                {q.label}
              </button>
            ))}
          </div>

          <div className="p-6 bg-slate-50/50">
            {loadingSubjects ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-xl border border-slate-200 max-w-md mx-auto">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-700 font-bold">No hay materias cargadas</p>
                <p className="text-sm text-slate-500 mt-1">
                  {`No se encontraron registros en student_subjects para ${activeQuarter} (${ACADEMIC_YEAR}).`}
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {BLOCK_ORDER.map((block) => {
                  const list = groupedSubjects[block] || [];
                  if (list.length === 0) return null;

                  return (
                    <div key={block} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="bg-blue-900 px-5 py-3 flex items-center justify-between">
                        <h3 className="font-bold text-white uppercase text-sm tracking-widest">{block}</h3>
                        <span className="text-xs font-bold text-blue-200 bg-blue-800/50 px-2 py-0.5 rounded-full">
                          {list.length} materias
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 text-slate-600 font-bold">
                            <tr>
                              <th className="p-4">Materia</th>
                              <th className="p-4 text-center">Nota</th>
                              <th className="p-4 text-center">Estado</th>
                              <th className="p-4 text-center">Convalidación</th>
                              <th className="p-4 text-center">Créditos</th>
                              <th className="p-4 text-center">Notas Parciales</th>
                              <th className="p-4 text-center">Guardar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {list.map((sub) => (
                              <tr key={sub.id} className="hover:bg-slate-50">
                                <td className="p-4">
                                  <div className="font-bold text-slate-800">{sub.subject_name}</div>
                                  <div className="text-xs text-slate-500 mt-1">
                                    {sub.category || 'General'}
                                  </div>
                                </td>

                                <td className="p-4 text-center">
                                  <div className="w-24 mx-auto text-center border border-slate-200 rounded-lg px-2 py-2 text-slate-800 font-bold bg-slate-50">
                                    {sub.grade ?? '—'}
                                  </div>
                                </td>

                                <td className="p-4 text-center">
                                  <select
                                    value={sub.approval_status || 'pending'}
                                    onChange={(e) => updateSubjectField(sub.id, 'approval_status', e.target.value)}
                                    className="border border-slate-300 rounded px-2 py-1 bg-white"
                                  >
                                    <option value="pending">Pendiente</option>
                                    <option value="submitted">Enviado</option>
                                    <option value="approved">Aprobado</option>
                                  </select>
                                </td>

                                <td className="p-4 text-center">
                                  {sub.convalidation_required ? (
                                    <select
                                      value={sub.convalidation_status || 'pending'}
                                      onChange={(e) => updateSubjectField(sub.id, 'convalidation_status', e.target.value)}
                                      className="border border-slate-300 rounded px-2 py-1 bg-white"
                                    >
                                      <option value="pending">Pendiente</option>
                                      <option value="in_review">En revisión</option>
                                      <option value="approved">Convalidado</option>
                                      <option value="rejected">Rechazado</option>
                                    </select>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>

                                <td className="p-4 text-center">
                                  {Number(sub.credit_value || 0).toFixed(2)}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => {
                                      setSelectedStudentSubject(sub);
                                      setIsGradeEntriesModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg font-bold"
                                  >
                                    Ver notas
                                  </button>
                                </td>

                                <td className="p-4 text-center">
                                  {savingId === sub.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 mx-auto" />
                                  ) : (
                                    <Save className="w-4 h-4 text-slate-400 mx-auto" />
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grade Entries Modal */}
      {isGradeEntriesModalOpen && selectedStudentSubject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-800">
                Notas Parciales: {selectedStudentSubject.subject_name}
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
                onEntriesChange={(average) => {
                  setSubjects((prev) => prev.map((subject) => subject.id === selectedStudentSubject.id ? { ...subject, grade: average } : subject));
                  setSelectedStudentSubject((prev) => prev ? { ...prev, grade: average } : prev);
                }}
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
