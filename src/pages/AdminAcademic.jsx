import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { BookOpen, Search, Loader2, Edit, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const BLOCK_ORDER = [
  'Core A.C.E.',
  'Extensión Local',
  'Life Skills',
  'Core Credits',
  'Local Validation / Foreign Language',
  'Life Skills & Leadership',
  'Electives',
  'OTROS',
];

export default function AdminAcademic() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [academicSubjects, setAcademicSubjects] = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);
  const [templateApplyMessage, setTemplateApplyMessage] = useState(null);

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedSubjectForGrade, setSelectedSubjectForGrade] = useState('');
  const [gradeValue, setGradeValue] = useState('');
  const [gradeStatus, setGradeStatus] = useState('pending');
  const [savingGrade, setSavingGrade] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredStudents(students);
    } else {
      const lower = search.toLowerCase();
      setFilteredStudents(
        students.filter(
          (s) =>
            (s.first_name || '').toLowerCase().includes(lower) ||
            (s.last_name || '').toLowerCase().includes(lower) ||
            (s.email || '').toLowerCase().includes(lower)
        )
      );
    }
  }, [search, students]);

  useEffect(() => {
    if (selectedStudent) {
      loadAcademicSubjects();
      setTemplateApplyMessage(null);
    } else {
      setAcademicSubjects([]);
    }
  }, [selectedStudent, selectedQuarter]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, us_grade_level, grade_label, email')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (err) {
      console.error('Error loading students:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los estudiantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicSubjects = async () => {
    if (!selectedStudent) return;

    setLoadingSubjects(true);
    try {
      const { data, error } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .eq('school_year', '2025-2026')
        .eq('quarter', selectedQuarter)
        .order('subject_order', { ascending: true });

      if (error) throw error;

      const unique = [];
      const seen = new Set();

      for (const item of data || []) {
        const key = `${item.subject_name}__${item.academic_block || ''}__${item.category || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      setAcademicSubjects(unique);
    } catch (err) {
      console.error('Error loading academic subjects:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las materias.',
        variant: 'destructive',
      });
      setAcademicSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const assignSubjectsFromTemplate = async (studentId, gradeLabel) => {
    const { data: templates, error: templateError } = await supabase
      .from('grade_subject_templates')
      .select('*')
      .eq('grade_label', gradeLabel)
      .eq('is_active', true)
      .order('subject_order', { ascending: true });

    if (templateError) throw templateError;
    if (!templates || templates.length === 0) {
      throw new Error('No se encontraron materias activas en la plantilla para este grado.');
    }

    const { data: existing, error: existingError } = await supabase
      .from('student_subjects')
      .select('subject_name, category, academic_block')
      .eq('student_id', studentId)
      .eq('school_year', '2025-2026')
      .eq('quarter', 'Q1');

    if (existingError) throw existingError;

    const existingKeys = new Set(
      (existing || []).map(
        (e) => `${e.subject_name}__${e.academic_block || ''}__${e.category || ''}`
      )
    );

    const toInsert = templates
      .filter((t) => {
        const key = `${t.subject_name}__${t.academic_block || ''}__${t.category || ''}`;
        return !existingKeys.has(key);
      })
      .map((t) => ({
        subject_name: t.subject_name,
        category: t.category,
        academic_block: t.academic_block,
        pillar_type: t.pillar_type,
        level_group: t.level_group,
        subject_order: t.subject_order,
        is_credit_course: t.is_credit_course,
        credit_value: t.credit_value,
        convalidation_required: t.convalidation_required,
        convalidation_area: t.convalidation_area,
        convalidation_status: t.convalidation_required ? 'pending' : 'not_required',
        transcript_label: t.transcript_label,
        quarter: 'Q1',
        school_year: '2025-2026',
        student_id: studentId,
        approval_status: 'submitted',
        submitted_at: new Date().toISOString(),
      }));

    if (toInsert.length === 0) {
      throw new Error('Todas las materias de la plantilla ya están asignadas.');
    }

    const { error: insertError } = await supabase
      .from('student_subjects')
      .insert(toInsert);

    if (insertError) throw insertError;

    return 'Materias asignadas correctamente desde plantilla académica.';
  };

  const handleApplyTemplate = async () => {
    if (!selectedStudent || !selectedStudent.grade_label) {
      toast({
        title: 'Atención',
        description: 'El estudiante no tiene un grado (grade_label) asignado.',
        variant: 'destructive',
      });
      return;
    }

    const confirmApply = window.confirm(
      `¿Desea aplicar la plantilla académica para ${selectedStudent.first_name} (${selectedStudent.grade_label})?`
    );
    if (!confirmApply) return;

    setIsApplyingTemplate(true);
    setTemplateApplyMessage(null);

    try {
      const msg = await assignSubjectsFromTemplate(
        selectedStudent.id,
        selectedStudent.grade_label
      );
      setTemplateApplyMessage({ type: 'success', text: msg });
      toast({ title: 'Éxito', description: msg });

      if (selectedQuarter !== 'Q1') {
        setSelectedQuarter('Q1');
      } else {
        loadAcademicSubjects();
      }
    } catch (err) {
      setTemplateApplyMessage({ type: 'error', text: err.message });
      toast({
        title: 'Atención',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const openGradeModal = (subjectId = '') => {
    const subject = academicSubjects.find((s) => s.id === subjectId);
    setSelectedSubjectForGrade(subjectId);
    setGradeValue(subject?.grade ?? '');
    setGradeStatus(subject?.approval_status || 'pending');
    setIsGradeModalOpen(true);
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();

    if (!selectedSubjectForGrade) {
      toast({
        title: 'Atención',
        description: 'Debe seleccionar una materia.',
        variant: 'destructive',
      });
      return;
    }

    setSavingGrade(true);
    try {
      const payload = {
        grade: gradeValue === '' ? null : parseFloat(gradeValue),
        approval_status: gradeStatus,
        submitted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('student_subjects')
        .update(payload)
        .eq('id', selectedSubjectForGrade);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Calificación actualizada correctamente.',
      });
      setIsGradeModalOpen(false);
      loadAcademicSubjects();
    } catch (err) {
      console.error('Error saving grade:', err);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la calificación.',
        variant: 'destructive',
      });
    } finally {
      setSavingGrade(false);
    }
  };

  const normalizeBlock = (block) => {
    if (!block) return 'OTROS';
    if (BLOCK_ORDER.includes(block)) return block;

    const b = String(block).toUpperCase();

    if (b.includes('CORE A.C.E')) return 'Core A.C.E.';
    if (b.includes('CORE CREDIT')) return 'Core Credits';
    if (b.includes('EXTENSIÓN LOCAL') || b.includes('EXTENSION LOCAL')) return 'Extensión Local';
    if (b.includes('LOCAL VALIDATION') || b.includes('FOREIGN LANGUAGE')) {
      return 'Local Validation / Foreign Language';
    }
    if (b.includes('LIFE SKILLS & LEADERSHIP')) return 'Life Skills & Leadership';
    if (b.includes('LIFE SKILLS')) return 'Life Skills';
    if (b.includes('ELECT')) return 'Electives';

    return 'OTROS';
  };

  const groupedSubjects = useMemo(() => {
    const grouped = {};
    BLOCK_ORDER.forEach((block) => {
      grouped[block] = [];
    });

    academicSubjects.forEach((sub) => {
      const block = normalizeBlock(sub.academic_block);
      grouped[block].push(sub);
    });

    return grouped;
  }, [academicSubjects]);

  const uniqueSubjectsForSelect = useMemo(() => {
    return academicSubjects.filter((subject, index, self) => {
      const key = `${subject.subject_name}__${subject.academic_block || ''}`;
      return (
        index ===
        self.findIndex(
          (s) => `${s.subject_name}__${s.academic_block || ''}` === key
        )
      );
    });
  }, [academicSubjects]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm shrink-0 h-[calc(100vh-4rem)]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[rgb(25,61,109)]" /> Módulo Académico
          </h2>
          <div className="relative mt-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[rgb(25,61,109)]/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-[rgb(25,61,109)]" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center p-8 text-slate-500 text-sm">
              No se encontraron estudiantes.
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col gap-1 ${selectedStudent?.id === student.id
                    ? 'bg-[rgb(25,61,109)]/5 border border-[rgb(25,61,109)]/20'
                    : 'hover:bg-slate-50 border border-transparent'
                  }`}
              >
                <span
                  className={`font-semibold ${selectedStudent?.id === student.id
                      ? 'text-[rgb(25,61,109)]'
                      : 'text-slate-700'
                    }`}
                >
                  {student.first_name} {student.last_name}
                </span>
                <span className="text-xs text-slate-500">
                  Grado: {student.grade_label || student.us_grade_level || 'N/A'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!selectedStudent ? (
          <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center p-12 h-full">
            <BookOpen className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">
              Gestión de Calificaciones
            </h3>
            <p className="text-slate-500 max-w-sm">
              Seleccione un estudiante de la lista para visualizar y gestionar sus materias y calificaciones.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 h-[calc(100vh-4rem)]">
            <div className="p-6 border-b border-slate-200 bg-white flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-[#193D6D] truncate">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </h2>
                  {selectedStudent.grade_label && (
                    <button
                      onClick={handleApplyTemplate}
                      disabled={isApplyingTemplate}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-bold transition-colors disabled:opacity-50 shadow-sm shrink-0"
                      title={`Aplicar plantilla: ${selectedStudent.grade_label}`}
                    >
                      {isApplyingTemplate ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5" />
                      )}
                      Aplicar plantilla académica
                    </button>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">
                  Año Escolar: 2025-2026 {selectedStudent.grade_label ? `• Grado: ${selectedStudent.grade_label}` : ''}
                </p>

                {templateApplyMessage && (
                  <div
                    className={`mt-3 p-2.5 rounded-lg text-sm font-bold inline-block ${templateApplyMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                  >
                    {templateApplyMessage.text}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shrink-0">
                <span className="text-sm font-bold text-slate-600 pl-2">Quarter:</span>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-[#193D6D] font-bold focus:outline-none focus:ring-2 focus:ring-[#193D6D]/20"
                >
                  {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {loadingSubjects ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-[#193D6D]" />
                </div>
              ) : academicSubjects.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-xl border border-slate-200">
                  <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-bold">No hay materias registradas</p>
                  <p className="text-sm text-slate-500 mt-1">
                    No se encontraron registros para {selectedQuarter}.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedSubjects).map(([block, subjects]) => {
                    if (!subjects || subjects.length === 0) return null;

                    return (
                      <div
                        key={block}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
                      >
                        <div className="bg-[#193D6D] px-5 py-3">
                          <h3 className="font-bold text-white uppercase text-sm tracking-widest">
                            {block}
                          </h3>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {subjects.map((sub) => (
                            <div
                              key={sub.id}
                              className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 truncate">
                                  {sub.subject_name}
                                </h4>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {sub.category || 'General'}
                                  </span>
                                  <span className="text-xs font-medium text-slate-500">
                                    Créditos: {sub.credit_value || 0}
                                  </span>
                                  {sub.convalidation_required && (
                                    <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                      Convalidación: {sub.convalidation_status || 'pending'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="text-center">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                    Grade
                                  </p>
                                  <p className="font-black text-lg text-[#193D6D] leading-none">
                                    {sub.grade !== null && sub.grade !== undefined ? `${sub.grade}%` : '-'}
                                  </p>
                                </div>

                                <div className="text-center">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                    Status
                                  </p>
                                  <span
                                    className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${sub.approval_status === 'approved'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : sub.approval_status === 'submitted'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                  >
                                    {sub.approval_status === 'approved' ? (
                                      <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                      <AlertCircle className="w-3 h-3" />
                                    )}
                                    {sub.approval_status === 'approved'
                                      ? 'Aprobado'
                                      : sub.approval_status === 'submitted'
                                        ? 'Enviado'
                                        : 'Pendiente'}
                                  </span>
                                </div>

                                <button
                                  onClick={() => openGradeModal(sub.id)}
                                  className="p-2 text-slate-400 hover:text-[#193D6D] hover:bg-blue-50 rounded-lg transition-colors flex shrink-0"
                                  title="Editar Calificación"
                                >
                                  <Edit className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isGradeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-black text-lg text-[#193D6D]">Ingresar Calificación</h3>
              <button
                onClick={() => setIsGradeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
              <div className="mb-2">
                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">
                  Estudiante
                </p>
                <p className="font-black text-slate-800">
                  {selectedStudent?.first_name} {selectedStudent?.last_name}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold mb-1 text-slate-700">Materia</label>
                <select
                  required
                  value={selectedSubjectForGrade}
                  onChange={(e) => setSelectedSubjectForGrade(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-slate-800 focus:border-[#193D6D]"
                >
                  <option value="" disabled>
                    Seleccione una materia
                  </option>
                  {uniqueSubjectsForSelect.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.subject_name} ({s.academic_block || 'Sin bloque'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">
                    Grade (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={gradeValue}
                    onChange={(e) => setGradeValue(e.target.value)}
                    placeholder="Ej. 95"
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-slate-800 focus:border-[#193D6D]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1 text-slate-700">Estado</label>
                  <select
                    required
                    value={gradeStatus}
                    onChange={(e) => setGradeStatus(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-slate-800 focus:border-[#193D6D]"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="submitted">Enviado</option>
                    <option value="approved">Aprobado</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingGrade}
                  className="flex-1 py-2.5 bg-[#193D6D] hover:bg-[#122e54] text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {savingGrade ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}