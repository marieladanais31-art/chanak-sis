import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, ArrowLeft, CheckCircle2, ExternalLink,
  Loader2, Paperclip, RefreshCw, Send,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { ACTIVE_SCHOOL_YEAR, QUARTERS, dedupeAcademicSubjects } from '@/lib/academicUtils';

// ── Grupos estructurales de evidencia ────────────────────────────────────────
const EVIDENCE_GROUPS = [
  {
    value:              'PACE Test',
    label:              'PACE Test',
    hint:               'Evaluación PACE completada. Mínimo 80/100 para alcanzar dominio.',
    requiresPaceNumber: true,
  },
  {
    value:              'Local Extension',
    label:              'Local Extension',
    hint:               'Extensión curricular local (Lengua y Literatura, Historia local, Geografía local…).',
    requiresPaceNumber: false,
  },
  {
    value:              'Life Skills',
    label:              'Life Skills',
    hint:               'Habilidades para la vida (Tecnología, Ed. Física, Arte/Música, Life Skills Inicial…).',
    requiresPaceNumber: false,
  },
];

const PROJ_STATUS_LABELS = {
  pending:     'Pendiente',
  in_progress: 'En progreso',
  delivered:   'Entregado',
  evaluated:   'Evaluado',
  delayed:     'Retrasado',
  cancelled:   'Cancelado',
};

// ── Estados de revisión ───────────────────────────────────────────────────────
const STATUS_META = {
  pending_review:       { label: 'Pendiente de revisión', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:             { label: 'Aprobada',              className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  correction_requested: { label: 'Corrección solicitada', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  rejected:             { label: 'Rechazada',             className: 'bg-red-50 text-red-700 border-red-200' },
};

const INITIAL_FORM = {
  student_id:         '',
  student_subject_id: '',
  quarter:            'Q1',
  evidence_group:     'PACE Test',
  pace_number:        '',
  score:              '',
  comment:            '',
  file:               null,
  drive_url:          '',
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

/** Valida que sea un enlace de Google Drive o Google Docs */
function isValidDriveUrl(url) {
  return /^https:\/\/(drive|docs)\.google\.com\/.+/.test(url.trim());
}

export default function ParentEvidencePanel({ studentChildren, studentSubjects, initialStudentId }) {
  const [form,           setForm]           = useState(INITIAL_FORM);
  const [submissions,    setSubmissions]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [message,        setMessage]        = useState(null);

  // ── Proyecciones PEI para la asignatura/trimestre seleccionados ───────────
  const [projections,    setProjections]    = useState([]);
  const [loadingProj,    setLoadingProj]    = useState(false);
  // Entrada manual de pace_number cuando no hay proyecciones o el padre elige "otro"
  const [manualPace,     setManualPace]     = useState(false);

  const childIds = useMemo(
    () => (studentChildren || []).map((child) => child.id),
    [studentChildren],
  );

  const availableSubjects = useMemo(() => {
    const filtered = (studentSubjects || []).filter(
      (subject) =>
        subject.student_id === form.student_id &&
        subject.school_year === ACTIVE_SCHOOL_YEAR &&
        subject.quarter     === form.quarter,
    );
    return dedupeAcademicSubjects(filtered).sort((a, b) => {
      const aOrder = a.subject_order ?? 999;
      const bOrder = b.subject_order ?? 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return (a.subject_name || '').localeCompare(b.subject_name || '');
    });
  }, [form.quarter, form.student_id, studentSubjects]);

  const selectedSubject = availableSubjects.find((s) => s.id === form.student_subject_id);
  const selectedGroup   = EVIDENCE_GROUPS.find((g) => g.value === form.evidence_group) || EVIDENCE_GROUPS[0];

  // ── Inicializar estudiante ──────────────────────────────────────────────────
  useEffect(() => {
    if (!studentChildren || studentChildren.length === 0) { setForm(INITIAL_FORM); return; }
    setForm((current) => {
      const preferredId    = studentChildren.some((c) => c.id === initialStudentId) ? initialStudentId : studentChildren[0].id;
      const studentIsValid = studentChildren.some((c) => c.id === current.student_id);
      return studentIsValid ? current : { ...current, student_id: preferredId };
    });
  }, [initialStudentId, studentChildren]);

  // ── Sincronizar materia al cambiar lista de disponibles ────────────────────
  useEffect(() => {
    setForm((current) => {
      const valid = availableSubjects.some((s) => s.id === current.student_subject_id);
      return valid ? current : { ...current, student_subject_id: availableSubjects[0]?.id || '' };
    });
  }, [availableSubjects]);

  // ── Cargar proyecciones del PEI para la asignatura/trimestre activos ───────
  const loadProjections = useCallback(async () => {
    const subjectName = selectedSubject?.subject_name;
    if (!form.student_id || !form.quarter || !subjectName) {
      setProjections([]);
      return;
    }
    setLoadingProj(true);
    setManualPace(false);
    setForm((cur) => ({ ...cur, pace_number: '' }));
    try {
      const { data, error } = await supabase
        .from('pei_pace_projections')
        .select('id, pace_number, status, estimated_delivery_date, pace_type')
        .eq('student_id', form.student_id)
        .eq('quarter',    form.quarter)
        .eq('school_year', ACTIVE_SCHOOL_YEAR)
        .eq('subject_name', subjectName)
        .order('pace_number', { ascending: true });
      if (error) {
        if (import.meta.env.DEV) console.warn('[ParentEvidencePanel] projections load:', error.message);
        setProjections([]);
      } else {
        setProjections(data || []);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[ParentEvidencePanel] projections error:', err);
      setProjections([]);
    } finally {
      setLoadingProj(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.student_id, form.quarter, form.student_subject_id]);

  useEffect(() => { loadProjections(); }, [loadProjections]);

  // ── Cargar historial de evidencias ─────────────────────────────────────────
  const loadSubmissions = async () => {
    if (!childIds.length) { setSubmissions([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('academic_evidence_submissions')
      .select(
        'id, student_id, student_subject_id, subject_name, school_year, quarter, ' +
        'pace_number, score, evidence_type, evidence_group, comment, ' +
        'attachment_url, attachment_path, drive_url, ' +
        'review_status, academic_outcome, reviewer_comment, created_at, reviewed_at',
      )
      .in('student_id', childIds)
      .order('created_at', { ascending: false });

    if (error) {
      const esRLS = error.code === '42501' || (error.message || '').includes('policy');
      setMessage({
        type:  'warning',
        title: 'No se pudieron cargar evidencias anteriores.',
        text:  esRLS
          ? 'Revisa la vinculación familiar (family_students). El formulario sigue disponible.'
          : `No se pudo conectar. El formulario sigue disponible. (${error.message || error.code})`,
      });
      setSubmissions([]);
    } else {
      setMessage(null);
      const enriched = await Promise.all((data || []).map(async (sub) => {
        if (!sub.attachment_path) return sub;
        const { data: signed, error: se } = await supabase.storage
          .from('academic-evidence').createSignedUrl(sub.attachment_path, 600);
        return se ? sub : { ...sub, signed_attachment_url: signed?.signedUrl || null };
      }));
      setSubmissions(enriched);
    }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSubmissions(); }, [childIds.join('|')]);

  const updateForm = (field, value) => setForm((cur) => ({ ...cur, [field]: value }));

  // Upload de archivo local desactivado — se usa solo Google Drive
  // eslint-disable-next-line no-unused-vars
  const uploadAttachment = async (_draftId) => ({ attachmentPath: null, attachmentUrl: null });

  // ── Enviar evidencia ────────────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    const evidenceGroup = form.evidence_group || 'PACE Test';
    const isPaceTest    = evidenceGroup === 'PACE Test';
    const hasScore      = form.score !== '';
    const score         = hasScore ? Number(form.score) : null;
    const driveUrl      = form.drive_url.trim();
    const hasFile       = false; // upload local desactivado — solo Drive
    const hasDriveUrl   = Boolean(driveUrl);

    if (!form.student_id || !form.student_subject_id || !selectedSubject) {
      setMessage({ type: 'error', title: 'Datos incompletos', text: 'Selecciona estudiante y asignatura.' });
      return;
    }
    if (isPaceTest && !form.pace_number) {
      setMessage({ type: 'error', title: 'N.º de evaluación obligatorio', text: 'Selecciona o ingresa el número de evaluación/PACE.' });
      return;
    }
    // Adjunto y/o nota: al menos uno de los tres debe estar presente
    if (!hasFile && !hasDriveUrl && !hasScore) {
      setMessage({ type: 'error', title: 'Datos incompletos', text: 'Ingresa al menos una nota (score) o adjunta un archivo o enlace de Drive.' });
      return;
    }
    if (hasDriveUrl && !isValidDriveUrl(driveUrl)) {
      setMessage({ type: 'error', title: 'Enlace de Drive inválido', text: 'Introduce un enlace de Google Drive o Google Docs (https://drive.google.com/... o https://docs.google.com/...).' });
      return;
    }
    if (hasScore && (!Number.isFinite(score) || score < 0 || score > 100)) {
      setMessage({ type: 'error', title: 'Score inválido', text: 'La nota debe ser entre 0 y 100.' });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const draftId            = crypto.randomUUID();
      const { attachmentPath, attachmentUrl } = await uploadAttachment(draftId);
      const belowMin = hasScore && isPaceTest && score < 80;

      const payload = {
        id:                 draftId,
        student_id:         form.student_id,
        student_subject_id: form.student_subject_id,
        submitted_by:       user?.id || null,
        subject_name:       selectedSubject.subject_name,
        school_year:        ACTIVE_SCHOOL_YEAR,
        quarter:            form.quarter,
        evidence_group:     evidenceGroup,
        evidence_type:      evidenceGroup,
        pace_number:        (isPaceTest && form.pace_number) ? Number(form.pace_number) : null,
        score,
        comment:            form.comment || null,
        attachment_path:    attachmentPath,
        attachment_url:     attachmentUrl,
        drive_url:          hasDriveUrl ? driveUrl : null,
        review_status:      'pending_review',
        academic_outcome:   belowMin ? 'requires_repeat' : 'pending_review',
      };

      const { error: insertError } = await supabase.from('academic_evidence_submissions').insert(payload);
      if (insertError) throw insertError;

      setForm((cur) => ({ ...INITIAL_FORM, student_id: cur.student_id, quarter: cur.quarter, evidence_group: cur.evidence_group }));
      setManualPace(false);
      const noAttachment = !attachmentPath && !hasDriveUrl;
      setMessage({
        type:  'success',
        title: noAttachment ? 'Evaluación registrada (pendiente de evidencia)' : 'Evaluación enviada',
        text:  belowMin
          ? 'Nota registrada (score < 80 marcado como requires_repeat). Chanak revisará oficialmente.'
          : noAttachment
            ? 'La nota fue registrada sin adjunto. Puede añadir la evidencia (archivo o Drive) más tarde desde esta misma pestaña.'
            : 'Evaluación enviada y pendiente de revisión oficial por Chanak. No se registra como nota final hasta que sea aprobada.',
      });
      await loadSubmissions();
    } catch (err) {
      setMessage({ type: 'error', title: 'No se pudo guardar', text: err.message || 'Intenta nuevamente.' });
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
            <h2 className="font-black text-lg">Registrar evaluación y/o evidencia Drive</h2>
            <p className="text-sm font-medium mt-1 text-blue-800">
              Suba la evidencia a la carpeta de Google Drive del estudiante y pegue aquí el enlace compartido.
              La nota puede registrarse aunque la evidencia Drive se añada después.
              Chanak revisará y validará oficialmente antes de registrar la nota final.
            </p>
            <ul className="text-sm font-medium mt-2 space-y-1 list-disc list-inside">
              <li><strong>PACE Test</strong> — selecciona la evaluación proyectada, ingresa la nota y/o pega el enlace Drive del test.</li>
              <li><strong>Local Extension</strong> — reportar por asignatura y <em>mes</em>. Pega el enlace Drive de la tarea mensual.</li>
              <li><strong>Life Skills</strong> — reportar por <em>trimestre</em>. Pega el enlace Drive del proyecto trimestral.</li>
            </ul>
            <p className="text-xs font-bold mt-3 text-blue-800">
              Mínimo requerido: nota (score) O enlace Drive. Solo se aceptan enlaces de Google Drive o Google Docs.
            </p>
          </div>
        </div>
      </div>

      {/* ── Mensaje de estado ── */}
      {message && (
        <div className={`rounded-xl border p-4 text-sm font-bold ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : message.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-700'
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
              {studentChildren.map((s) => (
                <option key={s.id} value={s.id}>{getStudentName(s)}</option>
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
              {QUARTERS.map((q) => <option key={q.id} value={q.id}>{q.id}</option>)}
            </select>
          </div>
        </div>

        {/* Asignatura */}
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
            ) : availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subject_name} · {s.academic_block || s.pillar_type || 'Bloque académico'}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de evidencia */}
        <div>
          <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Tipo de evidencia</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EVIDENCE_GROUPS.map((group) => (
              <button
                key={group.value}
                type="button"
                onClick={() => {
                  updateForm('evidence_group', group.value);
                  if (!group.requiresPaceNumber) { updateForm('pace_number', ''); setManualPace(false); }
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  form.evidence_group === group.value ? 'border-[#193D6D] bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
              >
                <p className={`font-black text-sm ${form.evidence_group === group.value ? 'text-[#193D6D]' : 'text-slate-700'}`}>{group.label}</p>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-snug">{group.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── N.º de Evaluación — selector inteligente con proyecciones PEI ── */}
        {selectedGroup.requiresPaceNumber && (
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
              N.º de Evaluación / PACE <span className="text-red-500">*</span>
            </label>

            {loadingProj ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando evaluaciones proyectadas…
              </div>
            ) : projections.length > 0 && !manualPace ? (
              /* ── Selector con proyecciones PEI ── */
              <div className="space-y-2">
                <select
                  value={form.pace_number}
                  onChange={(e) => updateForm('pace_number', e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
                >
                  <option value="">Seleccionar evaluación proyectada en el PEI…</option>
                  {projections.map((p) => (
                    <option key={p.id} value={String(p.pace_number)}>
                      {selectedSubject?.subject_name} · {form.quarter} · Evaluación #{p.pace_number}
                      {p.estimated_delivery_date ? ` · Est. ${p.estimated_delivery_date}` : ''}
                      {' · '}{PROJ_STATUS_LABELS[p.status] || p.status}
                      {p.pace_type === 'leveling' ? ' (Nivelación)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-emerald-700 font-bold">
                  ✓ {projections.length} evaluación{projections.length !== 1 ? 'es' : ''} proyectada{projections.length !== 1 ? 's' : ''} para esta asignatura/trimestre.
                </p>
                <button
                  type="button"
                  onClick={() => { setManualPace(true); updateForm('pace_number', ''); }}
                  className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
                >
                  El número no aparece en la lista → ingresar manualmente
                </button>
              </div>
            ) : (
              /* ── Sin proyecciones o entrada manual ── */
              <div className="space-y-2">
                {manualPace && projections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setManualPace(false); updateForm('pace_number', ''); }}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-bold"
                  >
                    <ArrowLeft className="w-3 h-3" /> Volver a evaluaciones proyectadas
                  </button>
                )}
                {!manualPace && projections.length === 0 && selectedSubject && !loadingProj && (
                  <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      No hay evaluaciones proyectadas en el PEI para <strong>{selectedSubject.subject_name} · {form.quarter}</strong>.
                      Contacte con coordinación o ingrese el número manualmente si ha sido autorizado.
                    </span>
                  </div>
                )}
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.pace_number}
                  onChange={(e) => updateForm('pace_number', e.target.value)}
                  className="w-full max-w-xs rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
                  placeholder="Ej. 1049"
                  required
                />
                <p className="text-xs text-slate-400 font-medium">Número del PACE/evaluación (obligatorio para PACE Test).</p>
              </div>
            )}
          </div>
        )}

        {/* Score + Comentario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
              Score / 100 <span className="text-slate-400 font-medium">(opcional)</span>
            </label>
            <input
              type="number" min="0" max="100" step="0.01"
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
            Enlace de Google Drive <span className="text-slate-400 font-medium">(obligatorio si hay evidencia documental)</span>
          </label>
          <input
            type="url"
            value={form.drive_url}
            onChange={(e) => updateForm('drive_url', e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-800"
            placeholder="https://drive.google.com/file/d/…"
          />
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Solo se aceptan https://drive.google.com/... o https://docs.google.com/...
            Comparte con permisos "Cualquiera con el enlace puede ver".
          </p>
        </div>

        {/* Estructura recomendada de carpetas Drive */}
        <details className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700">
            📁 Estructura recomendada de carpetas Google Drive
          </summary>
          <div className="px-4 pb-4 pt-1">
            <pre className="text-[10px] text-slate-600 font-mono leading-relaxed whitespace-pre-wrap">{`ESTUDIANTE / 2025-2026
├── 01_CORE_ACE
│   ├── Math          → Q1 / Q2 / Q3
│   ├── English       → Q1 / Q2 / Q3
│   ├── Word Building → Q1 / Q2 / Q3
│   ├── Science       → Q1 / Q2 / Q3
│   └── Social Studies→ Q1 / Q2 / Q3
├── 02_EXTENSION_LOCAL
│   ├── Lengua_y_Literatura → Sep / Oct / Nov / Dic / Ene / Feb / Mar / Abr / May / Jun
│   ├── Local_History       → (igual por mes)
│   └── Local_Geography     → (igual por mes)
├── 03_LIFE_SKILLS
│   ├── Art_Music          → Q1 / Q2 / Q3
│   ├── Technology         → Q1 / Q2 / Q3
│   ├── Physical_Education → Q1 / Q2 / Q3
│   └── Life_Skills_Level1 → Q1 / Q2 / Q3
├── 04_DOCUMENTOS_OFICIALES
├── 05_BOLETINES
├── 06_CONTRATOS_Y_CARTAS
└── 07_EVIDENCIAS_GENERALES`}</pre>
            <p className="text-[10px] text-slate-400 mt-2 font-medium">
              Extensión Local → una tarea por mes. Life Skills → un proyecto por trimestre.
            </p>
          </div>
        </details>

        {/* Submit */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2">
          <p className="text-xs text-slate-500 font-bold">
            Se requiere al menos nota (score) o enlace Drive. No se aceptan subidas de archivo locales.
            Chanak valida y aprueba oficialmente antes de registrar la nota final.
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
            {submissions.map((sub) => {
              const student      = studentChildren.find((c) => c.id === sub.student_id);
              const meta         = STATUS_META[sub.review_status] || STATUS_META.pending_review;
              const displayGroup = sub.evidence_group || sub.evidence_type || 'Evidencia';
              // Línea identificadora unificada: Math · Q1 · PACE Test · Evaluación #1049
              const evalLine = [
                sub.subject_name,
                sub.quarter,
                displayGroup,
                sub.pace_number ? `Evaluación #${sub.pace_number}` : null,
              ].filter(Boolean).join(' · ');

              return (
                <div key={sub.id} className="p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-1.5">
                    {/* Línea principal unificada */}
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-800">{evalLine}</p>
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-black ${meta.className}`}>{meta.label}</span>
                      {sub.academic_outcome === 'requires_repeat' && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-black border border-orange-200">
                          requires_repeat
                        </span>
                      )}
                    </div>
                    {/* Detalle secundario */}
                    <p className="text-xs text-slate-500 font-bold">
                      {getStudentName(student)}
                      {sub.score != null ? ` · Score ${sub.score}/100` : ''}
                      {sub.school_year ? ` · ${sub.school_year}` : ''}
                      {!sub.attachment_path && !sub.attachment_url && !sub.drive_url && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px] font-black">Sin adjunto</span>
                      )}
                    </p>
                    {sub.comment && <p className="text-sm text-slate-500">{sub.comment}</p>}
                    {sub.reviewer_comment && (
                      <p className="text-sm text-[#193D6D] font-bold">Comentario Chanak: {sub.reviewer_comment}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-start lg:items-end gap-2 text-xs text-slate-500 font-bold shrink-0">
                    <span>{formatDate(sub.created_at)}</span>
                    {Boolean(sub.signed_attachment_url || sub.attachment_url) && (
                      <a href={sub.signed_attachment_url || sub.attachment_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#193D6D] hover:underline">
                        <Paperclip className="w-3.5 h-3.5" /> Ver adjunto
                      </a>
                    )}
                    {sub.drive_url && (
                      <a href={sub.drive_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> Ver en Drive
                      </a>
                    )}
                    {sub.review_status === 'approved' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
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
