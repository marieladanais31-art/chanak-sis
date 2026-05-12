import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { generateTranscriptPDF } from '@/lib/transcriptPdf';
import {
  ACTIVE_SCHOOL_YEAR,
  QUARTERS,
  calculateAverageGrade,
  calculateHighSchoolCreditsFromPaces,
  getPaceStatus,
  isPassingPaceScore,
  normalizeBlock,
  normalizeNumericGrade,
  shouldShowOfficialCredits,
} from '@/lib/academicUtils';
import {
  Download, Save, Loader2, Trash2, ChevronRight,
  FileText, CheckCircle, Send, Eye, AlertCircle, X
} from 'lucide-react';

const INPUT   = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const LABEL   = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const STATUS_META = {
  draft:     { label: 'Borrador',    color: 'bg-slate-100 text-slate-700', next: 'in_review',  nextLabel: 'Enviar a revisión', icon: FileText },
  in_review: { label: 'En revisión', color: 'bg-amber-100 text-amber-800', next: 'approved',   nextLabel: 'Aprobar',          icon: Eye },
  approved:  { label: 'Aprobado',    color: 'bg-blue-100 text-blue-800',   next: 'published',  nextLabel: 'Publicar',         icon: CheckCircle },
  published: { label: 'Publicado',   color: 'bg-green-100 text-green-800', next: null,         nextLabel: null,               icon: Send },
};

const normalizeGradeEntryStatus = (status) => status || 'draft';

const isValidReportArea = (subject) => {
  const normalizedBlock = normalizeBlock(subject?.academic_block || subject?.pillar_type);
  return normalizedBlock !== 'OTHER';
};

const getSubjectCategory = (subject) => {
  const normalizedBlock = normalizeBlock(subject?.academic_block || subject?.pillar_type);
  if (normalizedBlock === 'Extensión Local' || normalizedBlock === 'Local Validation / Foreign Language') return 'local_extension';
  if (normalizedBlock === 'Life Skills' || normalizedBlock === 'Life Skills & Leadership') return 'life_skills';
  return 'core_ace';
};

const extractPaceNumbers = (entries) => entries
  .map((entry) => String(entry.assessment_name || '').match(/PACE\s*#?\s*(\d+)/i)?.[1])
  .filter(Boolean);

const buildCourseFromApprovedEntries = (subject, entries, student) => {
  const average = calculateAverageGrade(entries);
  const normalizedBlock = normalizeBlock(subject?.academic_block || subject?.pillar_type);
  const academicBlock = normalizedBlock === 'OTHER' ? (subject.academic_block || subject.pillar_type || '') : normalizedBlock;
  const subjectCategory = getSubjectCategory(subject);
  const completedPaces = subjectCategory === 'core_ace'
    ? entries.filter((entry) => isPassingPaceScore(entry.score)).length
    : 0;
  const paceNumbers = extractPaceNumbers(entries);
  const showCredits = shouldShowOfficialCredits(student, { allowMiddleSchoolCredits: Boolean(subject.allow_middle_school_credit) });

  return {
    student_subject_id: subject.id,
    subject_name: subject.subject_name || '',
    academic_block: academicBlock,
    pace_numbers: paceNumbers.length > 0 ? paceNumbers.join(', ') : String(completedPaces || ''),
    credits: showCredits ? String(calculateHighSchoolCreditsFromPaces(completedPaces, subject.credit_value, { allowConfiguredCredit: false })) : '0',
    final_grade: average !== null ? String(average) : '',
    grade_status: getPaceStatus(average),
    subject_category: subjectCategory,
    is_local_subject: subjectCategory === 'local_extension',
  };
};


const EMPTY_COURSE = {
  subject_name: '', academic_block: '', pace_numbers: '',
  credits: '0.5', final_grade: '', grade_status: 'pending',
};

/**
 * Props:
 *  - studentId, studentName
 *  - transcriptId?: load existing
 *  - canEdit: coordinator/admin
 *  - onClose
 */
export default function TranscriptGenerator({ studentId, studentName, transcriptId: initId, canEdit = false, onClose }) {
  const { toast } = useToast();

  const [loading, setLoading]     = useState(!!initId);
  const [saving, setSaving]       = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [downloading, setDl]      = useState(false);

  const [transcriptId, setTranscriptId] = useState(initId || null);
  const [settings, setSettings]         = useState(null);
  const [student, setStudent]           = useState(null);
  const [creditsSummary, setCreditsSummary] = useState([]);

  const [meta, setMeta] = useState({
    school_year: ACTIVE_SCHOOL_YEAR,
    quarter: 'Q1',
    language: 'es',
    gpa: '',
    academic_observations: '',
    status: 'draft',
  });
  const [courses, setCourses] = useState([{ ...EMPTY_COURSE }]);

  const loadData = useCallback(async () => {
    // Load institutional settings + credits summary in parallel
    const [settingsRes, creditsRes, studentRes] = await Promise.all([
      supabase.from('institutional_settings').select('*').limit(1).single(),
      supabase.from('student_credits_summary').select('*').eq('student_id', studentId),
      supabase.from('students').select('*').eq('id', studentId).single(),
    ]);
    if (settingsRes.data) setSettings(settingsRes.data);
    if (creditsRes.data) setCreditsSummary(creditsRes.data);
    if (studentRes.data) setStudent(studentRes.data);

    if (!initId) { setLoading(false); return; }

    // Load existing transcript
    const { data: tr } = await supabase
      .from('transcript_records')
      .select('*')
      .eq('id', initId)
      .single();
    if (tr) {
      setTranscriptId(tr.id);
      setMeta({
        school_year: tr.school_year || ACTIVE_SCHOOL_YEAR,
        quarter: tr.quarter || 'Q1',
        language: tr.language || 'es',
        gpa: tr.gpa ?? '',
        academic_observations: tr.academic_observations || '',
        status: tr.status || 'draft',
      });
    }

    const { data: tc } = await supabase
      .from('transcript_courses')
      .select('*')
      .eq('transcript_id', initId)
      .order('created_at', { ascending: true });
    if (tc && tc.length > 0) setCourses(tc);

    setLoading(false);
  }, [initId, studentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const setMetaField = (field) => (e) => setMeta(prev => ({ ...prev, [field]: e.target.value }));

  const setCourseField = (idx, field) => (e) => {
    setCourses(prev => prev.map((c, i) => i === idx ? { ...c, [field]: e.target.value } : c));
  };

  const removeCourse = (idx) => setCourses(prev => prev.filter((_, i) => i !== idx));

  const loadApprovedPeriodCourses = async () => {
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('student_subjects')
      .select('id, student_id, subject_name, academic_block, pillar_type, credit_value, quarter, school_year, grade_submission_status')
      .eq('student_id', studentId)
      .eq('school_year', meta.school_year)
      .eq('quarter', meta.quarter);

    if (subjectsError) throw subjectsError;

    const approvedSubjects = (subjectsData || []).filter(isValidReportArea);
    if (approvedSubjects.length === 0) return [];

    const subjectIds = approvedSubjects.map((subject) => subject.id);
    const { data: entriesData, error: entriesError } = await supabase
      .from('student_grade_entries')
      .select('id, student_subject_id, assessment_name, score, submission_status')
      .eq('student_id', studentId)
      .eq('school_year', meta.school_year)
      .eq('quarter', meta.quarter)
      .in('student_subject_id', subjectIds)
      .eq('submission_status', 'approved')
      .not('score', 'is', null);

    if (entriesError) throw entriesError;

    const entriesBySubject = (entriesData || []).reduce((acc, entry) => {
      if (normalizeGradeEntryStatus(entry.submission_status) !== 'approved') return acc;
      if (!acc[entry.student_subject_id]) acc[entry.student_subject_id] = [];
      acc[entry.student_subject_id].push(entry);
      return acc;
    }, {});

    return approvedSubjects
      .map((subject) => buildCourseFromApprovedEntries(subject, entriesBySubject[subject.id] || [], student))
      .filter((course) => course.subject_name && course.final_grade !== '');
  };

  const getBlockingPeriodGradeEntries = async () => {
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('student_subjects')
      .select('id, subject_name, academic_block, pillar_type, grade_submission_status')
      .eq('student_id', studentId)
      .eq('school_year', meta.school_year)
      .eq('quarter', meta.quarter);

    if (subjectsError) throw subjectsError;

    const periodSubjects = (subjectsData || []).filter(isValidReportArea);
    if (periodSubjects.length === 0) return [];

    const subjectIds = periodSubjects.map((subject) => subject.id);
    const { data: entriesData, error: entriesError } = await supabase
      .from('student_grade_entries')
      .select('id, student_subject_id, assessment_name, submission_status')
      .eq('student_id', studentId)
      .eq('school_year', meta.school_year)
      .eq('quarter', meta.quarter)
      .in('student_subject_id', subjectIds)
      .not('score', 'is', null);

    if (entriesError) throw entriesError;

    return (entriesData || []).filter((entry) => normalizeGradeEntryStatus(entry.submission_status) !== 'approved');
  };


  const getBlockingPendingEvidence = async () => {
    const { data, error } = await supabase
      .from('academic_evidence_submissions')
      .select('id, subject_name, review_status')
      .eq('student_id', studentId)
      .eq('school_year', meta.school_year)
      .eq('quarter', meta.quarter)
      .in('review_status', ['pending_review', 'submitted']);

    if (error) {
      // La tabla de evidencias es complementaria; si no existe en un entorno, las notas oficiales siguen mandando.
      if (error.code === '42P01' || error.code === '42703') return [];
      throw error;
    }

    return data || [];
  };

  const saveCoursesForTranscript = async (tid, courseRows) => {
    await supabase.from('transcript_courses').delete().eq('transcript_id', tid);

    const coursePayload = courseRows
      .filter(c => (c.subject_name || '').trim())
      .map(c => {
        const normalizedFinalGrade = c.final_grade !== '' && c.final_grade !== null && c.final_grade !== undefined
          ? normalizeNumericGrade(c.final_grade)
          : null;
        return {
          transcript_id: tid,
          student_subject_id: c.student_subject_id || null,
          subject_name:  c.subject_name,
          academic_block:c.academic_block || null,
          pace_numbers:  c.pace_numbers || null,
          credits:       shouldShowOfficialCredits(student) ? (parseFloat(c.credits) || 0) : 0,
          final_grade:   normalizedFinalGrade,
          grade_status:  c.grade_status || getPaceStatus(normalizedFinalGrade),
          subject_category: c.subject_category || 'core_ace',
          is_local_subject: Boolean(c.is_local_subject),
        };
      });

    if (coursePayload.length > 0) {
      const { error } = await supabase.from('transcript_courses').insert(coursePayload);
      if (error) throw error;
    }
  };

  const importFromAcademico = async () => {
    try {
      const imported = await loadApprovedPeriodCourses();
      if (imported.length === 0) {
        toast({ title: 'Sin notas aprobadas', description: `No hay notas aprobadas en student_grade_entries para ${meta.quarter} ${meta.school_year}.`, variant: 'destructive' });
        return;
      }
      setCourses(imported);
      toast({ title: `${imported.length} materias importadas desde notas aprobadas` });
    } catch (error) {
      toast({ title: 'Error al importar', description: error.message, variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const approvedCourses = await loadApprovedPeriodCourses();
      if (approvedCourses.length === 0) {
        toast({ title: 'Sin notas aprobadas', description: `No hay notas aprobadas en student_grade_entries para ${meta.quarter} ${meta.school_year}.`, variant: 'destructive' });
        return;
      }

      let tid = transcriptId;
      const totalCredits = approvedCourses.reduce((sum, course) => sum + (parseFloat(course.credits) || 0), 0);
      const trPayload = {
        student_id: studentId,
        school_year: meta.school_year,
        quarter: meta.quarter,
        language: meta.language,
        gpa: meta.gpa !== '' ? parseFloat(meta.gpa) : null,
        academic_observations: meta.academic_observations || null,
        total_credits: totalCredits,
        updated_at: new Date().toISOString(),
      };

      if (tid) {
        const { error } = await supabase.from('transcript_records').update(trPayload).eq('id', tid);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('transcript_records').insert([trPayload]).select('id').single();
        if (error) throw error;
        tid = data.id;
        setTranscriptId(tid);
      }

      await saveCoursesForTranscript(tid, approvedCourses);
      setCourses(approvedCourses);

      toast({ title: 'Boletín guardado', description: 'Se generó exclusivamente desde notas aprobadas.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'No se pudo guardar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!transcriptId) {
      toast({ title: 'Aviso', description: 'Guarda primero el boletín antes de avanzar el estado.', variant: 'destructive' });
      return;
    }
    const nextStatus = STATUS_META[meta.status]?.next;
    if (!nextStatus) return;
    setAdvancing(true);
    try {
      let publishedCourses = null;
      if (nextStatus === 'published') {
        const [blockingEntries, pendingEvidence] = await Promise.all([
          getBlockingPeriodGradeEntries(),
          getBlockingPendingEvidence(),
        ]);
        if (pendingEvidence.length > 0) {
          toast({
            title: 'No se puede publicar',
            description: `Hay ${pendingEvidence.length} evidencia(s) del periodo pendientes de revisión.`,
            variant: 'destructive',
          });
          return;
        }
        if (blockingEntries.length > 0) {
          toast({
            title: 'No se puede publicar',
            description: `Hay ${blockingEntries.length} nota(s) del periodo sin aprobar. Revisa todas las notas antes de publicar el boletín.`,
            variant: 'destructive',
          });
          return;
        }

        const approvedCourses = await loadApprovedPeriodCourses();
        if (approvedCourses.length === 0) {
          toast({
            title: 'No se puede publicar',
            description: 'El boletín necesita al menos una nota aprobada en student_grade_entries para este periodo.',
            variant: 'destructive',
          });
          return;
        }

        await saveCoursesForTranscript(transcriptId, approvedCourses);
        publishedCourses = approvedCourses;
        setCourses(approvedCourses);
      }

      const tsField = { in_review: 'reviewed_at', approved: 'approved_at', published: 'published_at' }[nextStatus];
      const patch = { status: nextStatus, updated_at: new Date().toISOString() };
      if (nextStatus === 'published') {
        patch.total_credits = (publishedCourses || courses).reduce((sum, course) => sum + (parseFloat(course.credits) || 0), 0);
      }
      if (tsField) patch[tsField] = new Date().toISOString();
      const { error } = await supabase.from('transcript_records').update(patch).eq('id', transcriptId);
      if (error) throw error;
      setMeta(prev => ({ ...prev, status: nextStatus }));
      toast({ title: 'Estado actualizado', description: `Boletín en estado: ${STATUS_META[nextStatus].label}` });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'No se pudo avanzar el estado.', variant: 'destructive' });
    } finally {
      setAdvancing(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDl(true);
    try {
      // Fetch student row for PDF
      const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single();
      const transcriptRow = {
        school_year: meta.school_year,
        quarter: meta.quarter,
        gpa: meta.gpa || null,
        academic_observations: meta.academic_observations || null,
      };
      generateTranscriptPDF({
        transcript: transcriptRow,
        courses,
        student: student || { id: studentId },
        settings,
        creditsSummary,
        lang: meta.language,
      });
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    } finally {
      setDl(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-16">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  const status = STATUS_META[meta.status] || STATUS_META.draft;
  const isReadOnly = !canEdit || meta.status === 'published';

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl mx-auto max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
        <div>
          <h2 className="font-black text-lg text-slate-800">Boletín Académico</h2>
          <p className="text-sm text-slate-500">{studentName} · {meta.school_year} · {meta.quarter}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
          </button>
          {onClose && <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className={LABEL}>Año Escolar</label>
            <select value={meta.school_year} onChange={setMetaField('school_year')} disabled={isReadOnly} className={INPUT}>
              <option value="2024-2025">2024-2025</option>
              <option value="2025-2026">2025-2026</option>
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Trimestre</label>
            <select value={meta.quarter} onChange={setMetaField('quarter')} disabled={isReadOnly} className={INPUT}>
              {QUARTERS.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Idioma PDF</label>
            <select value={meta.language} onChange={setMetaField('language')} disabled={isReadOnly} className={INPUT}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>GPA</label>
            <input type="number" step="0.01" min="0" max="4" value={meta.gpa} onChange={setMetaField('gpa')} disabled={isReadOnly} className={INPUT} placeholder="0.00" />
          </div>
        </div>

        {/* Courses */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className={LABEL}>Materias del Trimestre</label>
            {!isReadOnly && (
              <div className="flex items-center gap-3">
                <button
                  onClick={importFromAcademico}
                  className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"
                >
                  Importar notas aprobadas
                </button>

              </div>
            )}
          </div>
          <div className="space-y-2">
            {courses.map((course, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-2 border border-slate-200">
                <input
                  className="col-span-3 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Nombre desde student_subjects"
                  value={course.subject_name}
                  onChange={setCourseField(idx, 'subject_name')}
                  disabled={isReadOnly}
                />
                <input
                  className="col-span-2 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Bloque"
                  value={course.academic_block}
                  onChange={setCourseField(idx, 'academic_block')}
                  disabled={isReadOnly}
                />
                <input
                  className="col-span-2 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="PACEs completados"
                  value={course.pace_numbers}
                  onChange={setCourseField(idx, 'pace_numbers')}
                  disabled={isReadOnly}
                />
                <input
                  className="col-span-1 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400 text-center"
                  placeholder="Cred"
                  type="number" step="0.5" min="0"
                  value={course.credits}
                  onChange={setCourseField(idx, 'credits')}
                  disabled={true}
                />
                <input
                  className="col-span-1 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400 text-center"
                  placeholder="Nota"
                  type="number" step="0.1" min="0" max="100"
                  value={course.final_grade}
                  onChange={setCourseField(idx, 'final_grade')}
                  disabled={isReadOnly}
                />
                <select
                  className="col-span-2 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400"
                  value={course.grade_status}
                  onChange={setCourseField(idx, 'grade_status')}
                  disabled={isReadOnly}
                >
                  <option value="pending">Pendiente</option>
                  <option value="approved">Aprobado</option>
                  <option value="failed">Repetir / corregir</option>
                </select>
                {!isReadOnly && (
                  <button onClick={() => removeCourse(idx)} className="col-span-1 flex justify-center text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Observations */}
        <div>
          <label className={LABEL}>Observaciones Académicas</label>
          <textarea
            rows={4}
            value={meta.academic_observations}
            onChange={setMetaField('academic_observations')}
            disabled={isReadOnly}
            className="w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white resize-none"
            placeholder="Comentarios generales sobre el desempeño del estudiante en este trimestre..."
          />
        </div>

        {!settings && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>No se encontró configuración institucional. El PDF usará datos predeterminados. Configura la institución en Ajustes.</span>
          </div>
        )}
      </div>

      {/* Footer */}
      {canEdit && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {isReadOnly && meta.status === 'published' && (
              <span className="flex items-center gap-1 text-green-700 font-bold">
                <CheckCircle className="w-4 h-4" /> Documento publicado — padres pueden descargarlo
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            )}
            {status.next && !isReadOnly && (
              <button
                onClick={handleAdvanceStatus}
                disabled={advancing}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
              >
                {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {status.nextLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
