import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2, Paperclip, RefreshCw, Send } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { ACTIVE_SCHOOL_YEAR, QUARTERS, dedupeAcademicSubjects } from '@/lib/academicUtils';

const EVIDENCE_TYPES = [
  'PACE Test',
  'Self Test',
  'Proyecto',
  'Life Skills',
  'Extensión Local',
];

const STATUS_META = {
  pending_review: {
    label: 'Pendiente de revisión',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  approved: {
    label: 'Validada por Chanak',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  correction_requested: {
    label: 'Corrección / repetición requerida',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  rejected: {
    label: 'Rechazada',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

const INITIAL_FORM = {
  student_id: '',
  student_subject_id: '',
  quarter: 'Q1',
  pace_number: '',
  score: '',
  evidence_type: 'PACE Test',
  comment: '',
  file: null,
};

function getStudentName(student) {
  if (!student) return 'Estudiante';
  return `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Estudiante';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getFileExtension(fileName) {
  const parts = (fileName || '').split('.');
  return parts.length > 1 ? parts.pop() : 'bin';
}

export default function ParentEvidencePanel({ studentChildren, studentSubjects, initialStudentId }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const childIds = useMemo(() => (studentChildren || []).map((child) => child.id), [studentChildren]);

  const availableSubjects = useMemo(() => {
    const filtered = (studentSubjects || []).filter(
      (subject) =>
        subject.student_id === form.student_id &&
        subject.school_year === ACTIVE_SCHOOL_YEAR &&
        subject.quarter === form.quarter
    );

    return dedupeAcademicSubjects(filtered).sort((a, b) => {
      const aOrder = a.subject_order ?? 999;
      const bOrder = b.subject_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.subject_name || '').localeCompare(b.subject_name || '');
    });
  }, [form.quarter, form.student_id, studentSubjects]);

  const selectedSubject = availableSubjects.find((subject) => subject.id === form.student_subject_id);

  useEffect(() => {
    if (!studentChildren || studentChildren.length === 0) {
      setForm(INITIAL_FORM);
      return;
    }

    setForm((current) => {
      const preferredStudentId = studentChildren.some((child) => child.id === initialStudentId)
        ? initialStudentId
        : studentChildren[0].id;
      const studentStillValid = studentChildren.some((child) => child.id === current.student_id);
      return studentStillValid ? current : { ...current, student_id: preferredStudentId };
    });
  }, [initialStudentId, studentChildren]);

  useEffect(() => {
    setForm((current) => {
      const subjectStillValid = availableSubjects.some((subject) => subject.id === current.student_subject_id);
      return subjectStillValid ? current : { ...current, student_subject_id: availableSubjects[0]?.id || '' };
    });
  }, [availableSubjects]);

  const loadSubmissions = async () => {
    if (!childIds.length) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('academic_evidence_submissions')
      .select('id, student_id, student_subject_id, subject_name, school_year, quarter, pace_number, score, evidence_type, comment, attachment_url, attachment_path, review_status, academic_outcome, reviewer_comment, created_at, reviewed_at')
      .in('student_id', childIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[ParentEvidencePanel] academic_evidence_submissions no disponible:', error.message);
      setMessage({
        type: 'error',
        title: 'Tabla de evidencias no disponible',
        text: 'Aplica la migración SQL incluida para crear academic_evidence_submissions y activar RLS por family_students.',
      });
      setSubmissions([]);
    } else {
      setMessage(null);
      const enriched = await Promise.all((data || []).map(async (submission) => {
        if (!submission.attachment_path) return submission;
        const { data: signedData, error: signedError } = await supabase.storage
          .from('academic-evidence')
          .createSignedUrl(submission.attachment_path, 60 * 10);
        return signedError ? submission : { ...submission, signed_attachment_url: signedData?.signedUrl || null };
      }));
      setSubmissions(enriched);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSubmissions();
  }, [childIds.join('|')]);

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const uploadAttachment = async (submissionDraftId) => {
    if (!form.file) return { attachmentPath: null, attachmentUrl: null };

    const extension = getFileExtension(form.file.name);
    const safeName = form.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${form.student_id}/${ACTIVE_SCHOOL_YEAR}/${submissionDraftId}-${Date.now()}-${safeName || `evidence.${extension}`}`;

    const { error } = await supabase.storage
      .from('academic-evidence')
      .upload(path, form.file, { upsert: false });

    if (error) throw error;

    return { attachmentPath: path, attachmentUrl: null };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    const hasScore = form.score !== '';
    const score = hasScore ? Number(form.score) : null;
    if (!form.student_id || !form.student_subject_id || !selectedSubject) {
      setMessage({ type: 'error', title: 'Datos incompletos', text: 'Selecciona estudiante y materia desde student_subjects.' });
      return;
    }
    if (hasScore && (!Number.isFinite(score) || score < 0 || score > 100)) {
      setMessage({ type: 'error', title: 'Score inválido', text: 'La nota debe ser un número entre 0 y 100.' });
      return;
    }

    setSaving(true);
    try {
      const draftId = crypto.randomUUID();
      const { attachmentPath, attachmentUrl } = await uploadAttachment(draftId);
      const belowPaceMinimum = hasScore && form.evidence_type === 'PACE Test' && score < 80;

      const payload = {
        id: draftId,
        student_id: form.student_id,
        student_subject_id: form.student_subject_id,
        subject_name: selectedSubject.subject_name,
        school_year: ACTIVE_SCHOOL_YEAR,
        quarter: form.quarter,
        pace_number: form.pace_number ? Number(form.pace_number) : null,
        score,
        evidence_type: form.evidence_type,
        comment: form.comment || null,
        attachment_path: attachmentPath,
        attachment_url: attachmentUrl,
        review_status: 'pending_review',
        academic_outcome: belowPaceMinimum ? 'requires_repeat' : 'pending_review',
      };

      const { error } = await supabase.from('academic_evidence_submissions').insert(payload);
      if (error) throw error;

      setForm((current) => ({
        ...INITIAL_FORM,
        student_id: current.student_id,
        quarter: current.quarter,
        evidence_type: current.evidence_type,
      }));
      setMessage({
        type: 'success',
        title: 'Evidencia enviada',
        text: belowPaceMinimum
          ? 'La evidencia quedó pendiente de revisión oficial por Chanak. El score menor de 80 queda señalado como requires_repeat, pero la familia no aprueba ni rechaza notas.'
          : 'La evidencia quedó pendiente de revisión oficial por Chanak. No se insertó como nota final.',
      });
      await loadSubmissions();
    } catch (error) {
      console.error('[ParentEvidencePanel] submit error:', error);
      setMessage({ type: 'error', title: 'No se pudo guardar', text: error.message || 'Intenta nuevamente.' });
    } finally {
      setSaving(false);
    }
  };

  if (!studentChildren || studentChildren.length === 0) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
        Vincula estudiantes a la familia para reportar evidencias académicas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-blue-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h2 className="font-black text-lg">Evidencias Académicas Off Campus</h2>
            <p className="text-sm font-medium mt-1">
              La familia reporta datos verídicos como supervisor primario. Chanak valida oficialmente las calificaciones;
              este formulario no aprueba ni inserta notas finales.
            </p>
            <p className="text-xs font-bold mt-2">Regla: las notas son sobre 100; PACE Test aprobado requiere mínimo 80.</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border p-4 text-sm font-bold ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : message.type === 'warning'
              ? 'bg-orange-50 border-orange-200 text-orange-700'
              : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p className="font-black">{message.title}</p>
          <p className="font-medium mt-1">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Estudiante</label>
            <select
              value={form.student_id}
              onChange={(event) => updateForm('student_id', event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
            >
              {studentChildren.map((student) => (
                <option key={student.id} value={student.id}>{getStudentName(student)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Quarter</label>
            <select
              value={form.quarter}
              onChange={(event) => updateForm('quarter', event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
            >
              {QUARTERS.map((quarter) => (
                <option key={quarter.id} value={quarter.id}>{quarter.id}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Materia desde student_subjects</label>
          <select
            value={form.student_subject_id}
            onChange={(event) => updateForm('student_subject_id', event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
            disabled={availableSubjects.length === 0}
          >
            {availableSubjects.length === 0 ? (
              <option value="">No hay materias para {form.quarter}</option>
            ) : availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.subject_name} · {subject.academic_block || subject.pillar_type || 'Bloque académico'}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">PACE number</label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.pace_number}
              onChange={(event) => updateForm('pace_number', event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
              placeholder="Ej. 1049"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Score / 100 opcional</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.score}
              onChange={(event) => updateForm('score', event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
              placeholder="0–100 (opcional)"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Tipo</label>
            <select
              value={form.evidence_type}
              onChange={(event) => updateForm('evidence_type', event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
            >
              {EVIDENCE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Comentario</label>
          <textarea
            value={form.comment}
            onChange={(event) => updateForm('comment', event.target.value)}
            className="w-full min-h-[110px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800"
            placeholder="Observaciones de la familia, contexto, evidencia o necesidades de revisión."
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Archivo adjunto opcional</label>
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600 cursor-pointer hover:border-[#20B2AA] hover:bg-teal-50 transition-colors">
            <FileUp className="w-5 h-5 text-[#20B2AA]" />
            <span>{form.file ? form.file.name : 'Seleccionar archivo (PDF, imagen o documento)'}</span>
            <input type="file" className="hidden" onChange={(event) => updateForm('file', event.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500 font-bold">
            Todas las evidencias se guardan como pending_review; Chanak revisa y decide si aprueba, solicita corrección o rechaza.
          </p>
          <button
            type="submit"
            disabled={saving || availableSubjects.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#193D6D] hover:bg-[#142d5a] text-white rounded-xl font-black text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar a revisión Chanak
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Historial de evidencias</h3>
            <p className="text-xs text-slate-500 font-bold">Solo evidencias de estudiantes vinculados por family_students.</p>
          </div>
          <button
            type="button"
            onClick={loadSubmissions}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#193D6D]" /></div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">Aún no hay evidencias registradas.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {submissions.map((submission) => {
              const student = studentChildren.find((child) => child.id === submission.student_id);
              const meta = STATUS_META[submission.review_status] || STATUS_META.pending_review;
              return (
                <div key={submission.id} className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-800">{submission.subject_name}</p>
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-black ${meta.className}`}>{meta.label}</span>
                      {submission.academic_outcome === 'requires_repeat' && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-black border border-orange-200">requires_repeat</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 font-bold">
                      {getStudentName(student)} · {submission.quarter} · {submission.evidence_type} · Score {submission.score != null ? `${submission.score}/100` : 'sin score'}
                      {submission.pace_number ? ` · PACE ${submission.pace_number}` : ''}
                    </p>
                    {submission.comment && <p className="text-sm text-slate-500">{submission.comment}</p>}
                    {submission.reviewer_comment && (
                      <p className="text-sm text-[#193D6D] font-bold">Comentario Chanak: {submission.reviewer_comment}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-start lg:items-end gap-2 text-xs text-slate-500 font-bold">
                    <span>{formatDate(submission.created_at)}</span>
                    {(submission.signed_attachment_url || submission.attachment_url) && (
                      <a
                        href={submission.signed_attachment_url || submission.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#193D6D] hover:underline"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Ver adjunto
                      </a>
                    )}
                    {submission.review_status === 'approved' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
