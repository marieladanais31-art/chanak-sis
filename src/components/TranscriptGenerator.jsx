import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { generateTranscriptPDF } from '@/lib/transcriptPdf';
import { ACTIVE_SCHOOL_YEAR, QUARTERS } from '@/lib/academicUtils';
import {
  Download, Save, Loader2, Plus, Trash2, ChevronRight,
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

const GRADE_STATUS = ['pending', 'approved', 'failed'];

const SUBJECT_LIST = [
  'Math', 'English', 'Word Building', 'Science', 'Social Studies',
  'Spanish Language', 'History & Geography Local', 'World History',
  'World Geography', 'American History',
  'Life Skills', 'Physical Education', 'Arts',
  '— Manual (escribir) —',
];

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
    const [settingsRes, creditsRes] = await Promise.all([
      supabase.from('institutional_settings').select('*').limit(1).single(),
      supabase.from('student_credits_summary').select('*').eq('student_id', studentId),
    ]);
    if (settingsRes.data) setSettings(settingsRes.data);
    if (creditsRes.data) setCreditsSummary(creditsRes.data);

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

  const addCourse = () => setCourses(prev => [...prev, { ...EMPTY_COURSE }]);
  const removeCourse = (idx) => setCourses(prev => prev.filter((_, i) => i !== idx));

  const importFromAcademico = async () => {
    const { data, error } = await supabase
      .from('student_subjects')
      .select('subject_name, academic_block, grade, credit_value, approval_status')
      .eq('student_id', studentId)
      .eq('school_year', meta.school_year)
      .eq('quarter', meta.quarter)
      .eq('approval_status', 'approved');

    if (error) {
      toast({ title: 'Error al importar', description: error.message, variant: 'destructive' });
      return;
    }
    if (!data || data.length === 0) {
      toast({ title: 'Sin materias aprobadas', description: `No hay materias con estado "Aprobado" en ${meta.quarter} ${meta.school_year}.`, variant: 'destructive' });
      return;
    }
    const imported = data.map(s => ({
      subject_name: s.subject_name || '',
      academic_block: s.academic_block || '',
      pace_numbers: '',
      credits: String(s.credit_value ?? 0.5),
      final_grade: s.grade !== null && s.grade !== undefined ? String(s.grade) : '',
      grade_status: 'approved',
    }));
    setCourses(imported);
    toast({ title: `${imported.length} materias importadas desde Académico` });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let tid = transcriptId;
      const trPayload = {
        student_id: studentId,
        school_year: meta.school_year,
        quarter: meta.quarter,
        language: meta.language,
        gpa: meta.gpa !== '' ? parseFloat(meta.gpa) : null,
        academic_observations: meta.academic_observations || null,
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

      // Upsert courses: delete all then re-insert (simplest strategy for small lists)
      await supabase.from('transcript_courses').delete().eq('transcript_id', tid);
      const coursePayload = courses
        .filter(c => c.subject_name.trim())
        .map(c => ({
          transcript_id: tid,
          subject_name:  c.subject_name,
          academic_block:c.academic_block || null,
          pace_numbers:  c.pace_numbers || null,
          credits:       parseFloat(c.credits) || 0.5,
          final_grade:   c.final_grade !== '' ? parseFloat(c.final_grade) : null,
          grade_status:  c.grade_status || 'pending',
        }));
      if (coursePayload.length > 0) {
        const { error } = await supabase.from('transcript_courses').insert(coursePayload);
        if (error) throw error;
      }

      toast({ title: 'Boletín guardado', description: 'Los cambios fueron guardados.' });
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
      const tsField = { in_review: 'reviewed_at', approved: 'approved_at', published: 'published_at' }[nextStatus];
      const patch = { status: nextStatus, updated_at: new Date().toISOString() };
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
                  Importar desde Académico
                </button>
                <button onClick={addCourse} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">
                  <Plus className="w-3.5 h-3.5" /> Agregar materia
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {courses.map((course, idx) => {
              const isManual = !SUBJECT_LIST.slice(0, -1).includes(course.subject_name);
              return (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-xl p-2 border border-slate-200">
                {isManual ? (
                  <input
                    className="col-span-3 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder="Nombre de la materia"
                    value={course.subject_name}
                    onChange={setCourseField(idx, 'subject_name')}
                    disabled={isReadOnly}
                  />
                ) : (
                  <select
                    className="col-span-3 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400"
                    value={course.subject_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCourseField(idx, 'subject_name')({ target: { value: val === '— Manual (escribir) —' ? '' : val } });
                    }}
                    disabled={isReadOnly}
                  >
                    <option value="">— Seleccionar —</option>
                    {SUBJECT_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
                <input
                  className="col-span-2 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="Bloque"
                  value={course.academic_block}
                  onChange={setCourseField(idx, 'academic_block')}
                  disabled={isReadOnly}
                />
                <input
                  className="col-span-2 p-2 border border-slate-300 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-blue-400"
                  placeholder="PACEs"
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
                  disabled={isReadOnly}
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
                  <option value="failed">Reprobado</option>
                </select>
                {!isReadOnly && (
                  <button onClick={() => removeCourse(idx)} className="col-span-1 flex justify-center text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              );
            })}
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
