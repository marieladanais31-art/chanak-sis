import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, FileUp, Loader2, Paperclip, RefreshCw, Send } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { ACTIVE_SCHOOL_YEAR, QUARTERS, dedupeAcademicSubjects } from '@/lib/academicUtils';

// ── Grupos estructurales de evidencia ────────────────────────────────────────
const EVIDENCE_GROUPS = [
  {
    value: 'PACE Test',
    label: 'PACE Test',
    hint:  'Evaluación PACE completada. Mínimo 80/100 para alcanzar dominio.',
    requiresPaceNumber: true,
  },
  {
    value: 'Local Extension',
    label: 'Local Extension',
    hint:  'Extensión curricular local (Lengua y Literatura, Historia local, Geografía local…).',
    requiresPaceNumber: false,
  },
  {
    value: 'Life Skills',
    label: 'Life Skills',
    hint:  'Habilidades para la vida (Tecnología, Ed. Física, Arte/Música, Life Skills Inicial…).',
    requiresPaceNumber: false,
  },
];

// ── Estados de revisión ───────────────────────────────────────────────────────
const STATUS_META = {
  pending_review: {
    label:     'Pendiente de revisión',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  approved: {
    label:     'Aprobada',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  correction_requested: {
    label:     'Corrección solicitada',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  rejected: {
    label:     'Rechazada',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

const INITIAL_FORM = {
  student_id:       '',
  student_subject_id: '',
  quarter:          'Q1',
  evidence_group:   'PACE Test',
  pace_number:      '',
  score:            '',
  comment:          '',
  file:             null,
  drive_url:        '',
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

function isValidUrl(url) {
  return /^https?:\/\/.+\..+/.test(url.trim());
}

export default function ParentEvidencePanel({ studentChildren, studentSubjects, initialStudentId }) {
  const [form,        setForm]        = useState(INITIAL_FORM);
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [message,     setMessage]     = useState(null);

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
  const selectedGroup   = EVIDENCE_GROUPS.find((g) => g.value === form.evidence_group) || EVIDENCE_GROUPS[0];

  // ── Inicializar estudiante ──────────────────────────────────────────────────
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

  // ── Sincronizar materia al cambiar disponibles ─────────────────────────────
  useEffect(() => {
    setForm((current) => {
      const subjectStillValid = availableSubjects.some((subject) => subject.id === current.student_subject_id);
      return subjectStillValid ? current : { ...current, student_subject_id: availableSubjects[0]?.id || '' };
    });
  }, [availableSubjects]);

  // ── Cargar historial ────────────────────────────────────────────────────────
  const loadSubmissions = async () => {
    if (!childIds.length) {
      setSubmissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('academic_evidence_submissions')
      .select(
        'id, student_id, student_subject_id, subject_name, school_year, quarter, ' +
        'pace_number, score, evidence_type, evidence_group, comment, ' +
        'attachment_url, attachment_path, drive_url, ' +
        'review_status, academic_outcome, reviewer_comment, created_at, reviewed_at'
      )
      .in('student_id', childIds)
      .order('created_at', { ascending: false });

    if (error) {
      const esRLS = error.code === '42501' || (error.message || '').includes('policy');
      setMessage({
        type:  'warning',
        title: 'No se pudieron cargar evidencias anteriores.',
        text:  esRLS
          ? 'Revisa la vinculación familiar (family_students). El formulario de envío sigue disponible.'
          : `No se pudo conectar con el historial. El formulario sigue disponible. (${error.message || error.code || 'error desconocido'})`,
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSubmissions(); }, [childIds.join('|')]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  // ── Subir archivo adjunto ───────────────────────────────────────────────────
  const uploadAttachment = async (submissionDraftId) => {
    if (!form.file) return { attachmentPath: null, attachmentUrl: null };
    const extension = getFileExtension(form.file.name);
    const safeName  = form.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path      = `${form.student_id}/${ACTIVE_SCHOOL_YEAR}/${submissionDraftId}-${Date.now()}-${safeName || `evidence.${extension}`}`;
    const { error } = await supabase.storage.from('academic-evidence').upload(path, form.file, { upsert: false });
    if (error) throw error;
    return { attachmentPath: path, attachmentUrl: null };
  };

  // ── Enviar evidencia ────────────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    const evidenceGroup  = form.evidence_group || 'PACE Test';
    const isPaceTest     = evidenceGroup === 'PACE Test';
    const hasScore       = form.score !== '';
    const score          = hasScore ? Number(form.score) : null;
    const driveUrl       = form.drive_url.trim();
    const hasFile        = Boolean(form.file);
    const hasDriveUrl    = Boolean(driveUrl);

    // ── Validaciones ──────────────────────────────────────────────────────────
    if (!form.student_id || !form.student_subject_id || !selectedSubject) {
      setMessage({ type: 'error', title: 'Datos incompletos', text: 'Selecciona estudiante y materia.' });
      return;
    }
    if (isPaceTest && !form.pace_number) {
      setMessage({ type: 'error', title: 'N.º de evaluación obligatorio', text: 'Para PACE Test debes indicar el número de evaluación/PACE.' });
      return;
    }
    if (!hasFile && !hasDriveUrl) {
      setMessage({ type: 'error', title: 'Adjunto requerido', text: 'Adjunta un archivo o proporciona un enlace de Google Drive.' });
      return;
    }
    if (hasDriveUrl && !isValidUrl(driveUrl)) {
      setMessage({ type: 'error', title: 'Enlace inválido', text: 'El enlace de Google Drive debe comenzar con https://' });
      return;
    }
    if (hasScore && (!Number.isFinite(score) || score < 0 || score > 100)) {
      setMessage({ type: 'error', title: 'Score inválido', text: 'La nota debe ser un número entre 0 y 100.' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const draftId            = crypto.randomUUID();
      const { attachmentPath, attachmentUrl } = await uploadAttachment(draftId);
      const belowPaceMinimum   = hasScore && isPaceTest && score < 80;

      const payload = {
        id:                  draftId,
        student_id:          form.student_id,
        student_subject_id:  form.student_subject_id,
        submitted_by:        user?.id || null,
        subject_name:        selectedSubject.subject_name,
        school_year:         ACTIVE_SCHOOL_YEAR,
        quarter:             form.quarter,
        evidence_group:      evidenceGroup,
        evidence_type:       evidenceGroup,   // mirrors evidence_group para compatibilidad SQL
        pace_number:         (isPaceTest && form.pace_number) ? Number(form.pace_number) : null,
        score,
        comment:             form.comment || null,
        attachment_path:     attachmentPath,
        attachment_url:      attachmentUrl,
        drive_url:           hasDriveUrl ? driveUrl : null,
        review_status:       'pending_review',
        academic_outcome:    belowPaceMinimum ? 'requires_repeat' : 'pending_review',
      };

      const { error: insertError } = await supabase.from('academic_evidence_submissions').insert(payload);
      if (insertError) throw insertError;

      setForm((current) => ({
        ...INITIAL_FORM,
        student_id:     current.student_id,
        quarter:        current.quarter,
        evidence_group: current.evidence_group,
      }));
      setMessage({
        type:  'success',
        title: 'Evidencia enviada',
        text:  belowPaceMinimum
          ? 'Evidencia recibida (score < 80 marcado como requires_repeat). Chanak revisará oficialmente.'
          : 'Evidencia enviada y pendiente de revisión oficial por Chanak. No se registra como nota final hasta que sea aprobada.',
      });
      await loadSubmissions();
    } catch (error) {
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Texto de ayuda prescrito ── */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-blue-900">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h2 className="font-black text-lg">Cómo reportar evidencias Off Campus</h2>
            <ul className="text-sm font-medium mt-2 space-y-1 list-disc list-inside">
              <li><strong>PACE Test</strong> — reportar por asignatura; indica el número de evaluación. Adjunta el test escaneado o enlace Drive.</li>
              <li><strong>Local Extension</strong> — reportar por asignatura (historia local, lengua, geografía…). Adjunta foto, documento o enlace Drive.</li>
              <li><strong>Life Skills</strong> — reportar por asignatura (tecnología, arte, ed. física…). Adjunta foto, documento o enlace Drive.</li>
            </ul>
            <p className="text-xs font-bold mt-3 text-blue-800">
              Puedes adjuntar un archivo, un enlace de Google Drive, o ambos. Al menos uno es obligatorio.
              Chanak valida oficialmente cada evidencia antes de registrarla como nota final.
            </p>
          </div>
        </div>
      </div>

      {/* ── Mensaje de estado ── */}
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

      {/* ── Formulario ── */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">

        {/* Estudiante + Quarter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Estudiante</label>
            <select
              value={form.student_id}
              onChange={(e) => updateForm('student_id', e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
            >
              {studentChildren.map((student) => (
                <option key={student.id} value={student.id}>{getStudentName(student)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Trimestre (Quarter)</label>
            <select
              value={form.quarter}
              onChange={(e) => updateForm('quarter', e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
            >
              {QUARTERS.map((q) => (
                <option key={q.id} value={q.id}>{q.id}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Materia */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Asignatura</label>
          <select
            value={form.student_subject_id}
            onChange={(e) => updateForm('student_subject_id', e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
            disabled={availableSubjects.length === 0}
          >
            {availableSubjects.length === 0 ? (
              <option value="">Sin asignaturas para {form.quarter}</option>
            ) : availableSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.subject_name} · {subject.academic_block || subject.pillar_type || 'Bloque académico'}
              </option>
            ))}
          </select>
        </div>

        {/* Grupo de evidencia */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Tipo de evidencia</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EVIDENCE_GROUPS.map((group) => (
              <button
                key={group.value}
                type="button"
                onClick={() => {
                  updateForm('evidence_group', group.value);
                  if (!group.requiresPaceNumber) updateForm('pace_number', '');
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  form.evidence_group === group.value
                    ? 'border-[#193D6D] bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
              >
                <p className={`font-black text-sm ${form.evidence_group === group.value ? 'text-[#193D6D]' : 'text-slate-700'}`}>
                  {group.label}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">{group.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* N.º de evaluación — solo para PACE Test */}
        {selectedGroup.requiresPaceNumber && (
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
              N.º de Evaluación / PACE <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.pace_number}
              onChange={(e) => updateForm('pace_number', e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800 max-w-xs"
              placeholder="Ej. 1049"
              required
            />
            <p className="text-xs text-slate-400 mt-1 font-medium">Número del PACE evaluado (obligatorio para PACE Test).</p>
          </div>
        )}

        {/* Score + Comentario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
              Score / 100 <span className="text-slate-400 font-medium">(opcional)</span>
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.score}
              onChange={(e) => updateForm('score', e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
              placeholder="0 – 100"
            />
            {selectedGroup.requiresPaceNumber && (
              <p className="text-xs text-amber-700 font-bold mt-1">PACE Test: mínimo 80 para dominio.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Comentario</label>
            <textarea
              value={form.comment}
              onChange={(e) => updateForm('comment', e.target.value)}
              className="w-full min-h-[84px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800"
              placeholder="Observaciones de la familia, contexto, condiciones de evaluación…"
            />
          </div>
        </div>

        {/* Enlace Google Drive */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
            Enlace de Google Drive <span className="text-slate-400 font-medium">(obligatorio si no adjuntas archivo)</span>
          </label>
          <input
            type="url"
            value={form.drive_url}
            onChange={(e) => updateForm('drive_url', e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
            placeholder="https://drive.google.com/file/d/…"
          />
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Comparte el archivo desde Google Drive con permisos de visualización y pega el enlace aquí.
          </p>
        </div>

        {/* Archivo adjunto */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
            Archivo adjunto <span className="text-slate-400 font-medium">(obligatorio si no hay enlace Drive)</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600 cursor-pointer hover:border-[#20B2AA] hover:bg-teal-50 transition-colors">
            <FileUp className="w-5 h-5 text-[#20B2AA]" />
            <span>{form.file ? form.file.name : 'Seleccionar archivo (PDF, imagen o documento)'}</span>
            <input type="file" className="hidden" onChange={(e) => updateForm('file', e.target.files?.[0] || null)} />
          </label>
        </div>

        {/* Submit */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500 font-bold">
            Todas las evidencias se guardan como <em>pendiente de revisión</em>. Chanak decide si aprueba, solicita corrección o rechaza.
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

      {/* ── Historial de evidencias ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Historial de evidencias</h3>
            <p className="text-xs text-slate-500 font-bold">Solo evidencias de estudiantes vinculados en family_students.</p>
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
              const student       = studentChildren.find((child) => child.id === submission.student_id);
              const meta          = STATUS_META[submission.review_status] || STATUS_META.pending_review;
              const displayGroup  = submission.evidence_group || submission.evidence_type || 'Evidencia';
              const hasAttachment = Boolean(submission.signed_attachment_url || submission.attachment_url);
              const hasDriveLink  = Boolean(submission.drive_url);

              return (
                <div key={submission.id} className="p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-800">{submission.subject_name}</p>
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-black ${meta.className}`}>{meta.label}</span>
                      {submission.academic_outcome === 'requires_repeat' && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-black border border-orange-200">
                          requires_repeat
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 font-bold">
                      {getStudentName(student)} · {submission.quarter} ·{' '}
                      <span className="font-black text-slate-800">{displayGroup}</span>
                      {submission.pace_number ? ` · Evaluación #${submission.pace_number}` : ''}
                      {submission.score != null ? ` · Score ${submission.score}/100` : ''}
                    </p>
                    {submission.comment && (
                      <p className="text-sm text-slate-500">{submission.comment}</p>
                    )}
                    {submission.reviewer_comment && (
                      <p className="text-sm text-[#193D6D] font-bold">Comentario Chanak: {submission.reviewer_comment}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-2 text-xs text-slate-500 font-bold shrink-0">
                    <span>{formatDate(submission.created_at)}</span>

                    {/* Adjunto */}
                    {hasAttachment && (
                      <a
                        href={submission.signed_attachment_url || submission.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#193D6D] hover:underline"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Ver adjunto
                      </a>
                    )}

                    {/* Enlace Drive */}
                    {hasDriveLink && (
                      <a
                        href={submission.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Ver en Drive
                      </a>
                    )}

                    {submission.review_status === 'approved' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
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
