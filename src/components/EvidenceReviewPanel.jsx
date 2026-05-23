import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileCheck2, Loader2, MessageSquare, Paperclip, RefreshCw, XCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';

const STATUS_CONFIG = {
  pending_review: { label: 'Pendiente de revisión', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Aprobada', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  correction_requested: { label: 'Corrección solicitada', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  rejected: { label: 'Rechazada', className: 'bg-red-50 text-red-700 border-red-200' },
};

const OUTCOME_CONFIG = {
  pending_review: 'Pendiente académico',
  requires_repeat: 'Requiere repetición',
  correction_required: 'Corrección requerida',
  approved: 'Aprobada / completada',
  rejected: 'Rechazada',
};

const FILTERS = [
  { key: 'pending_review', label: 'Pendientes' },
  { key: 'correction_requested', label: 'Corrección' },
  { key: 'approved', label: 'Aprobadas' },
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'all', label: 'Todas' },
];

function getStudentName(student) {
  if (!student) return 'Estudiante';
  return `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Estudiante';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const meta = STATUS_CONFIG[status] || STATUS_CONFIG.pending_review;
  return <span className={`px-2.5 py-0.5 rounded-full border text-xs font-black ${meta.className}`}>{meta.label}</span>;
}

export default function EvidenceReviewPanel({ hubId = null, tutorId = null, compact = false }) {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending_review');
  const [activeId, setActiveId] = useState(null);
  const [internalComment, setInternalComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const scopeText = useMemo(() => {
    if (tutorId) return 'Solo estudiantes asignados al tutor.';
    if (hubId) return 'Solo estudiantes del hub del coordinador.';
    return 'Admin / super_admin puede revisar todas las evidencias.';
  }, [hubId, tutorId]);

  const signAttachments = async (rows) => Promise.all((rows || []).map(async (row) => {
    if (!row.attachment_path) return row;
    const { data, error } = await supabase.storage
      .from('academic-evidence')
      .createSignedUrl(row.attachment_path, 60 * 10);
    return error ? row : { ...row, signed_attachment_url: data?.signedUrl || null };
  }));

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('academic_evidence_submissions')
        .select(`
          id,
          student_id,
          student_subject_id,
          subject_name,
          school_year,
          quarter,
          pace_number,
          score,
          evidence_type,
          comment,
          attachment_path,
          attachment_url,
          review_status,
          academic_outcome,
          reviewer_comment,
          internal_comment,
          reviewed_by,
          reviewed_at,
          approved_by,
          approved_at,
          created_at,
          students ( id, first_name, last_name, us_grade_level, hub_id, tutor_id ),
          student_subjects ( id, academic_block, pillar_type, credit_value, approval_status, grade_submission_status )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('review_status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      let scoped = data || [];
      if (tutorId) scoped = scoped.filter((item) => item.students?.tutor_id === tutorId);
      if (hubId) scoped = scoped.filter((item) => item.students?.hub_id === hubId);

      setItems(await signAttachments(scoped));
    } catch (error) {
      console.error('[EvidenceReviewPanel] Error loading:', error);
      toast({ title: 'Error', description: error.message || 'No se pudieron cargar las evidencias.', variant: 'destructive' });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, hubId, toast, tutorId]);

  useEffect(() => { loadEvidence(); }, [loadEvidence]);

  const handleReview = async (submission, action) => {
    if (!['approved', 'correction_requested', 'rejected'].includes(action)) return;
    if (action === 'approved' && submission.score == null) {
      toast({
        title: 'Score requerido',
        description: 'Toda evidencia aprobada debe tener score sobre 100 para generar nota oficial.',
        variant: 'destructive',
      });
      return;
    }
    if (action === 'approved' && submission.evidence_type === 'PACE Test' && Number(submission.score) < 80) {
      toast({
        title: 'PACE no aprobable',
        description: 'Un PACE Test con score menor a 80 debe quedar como corrección/repetición.',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('review_academic_evidence', {
        p_submission_id: submission.id,
        p_action: action,
        p_internal_comment: internalComment.trim() || null,
      });
      if (error) throw error;

      const descriptions = {
        approved: 'Evidencia aprobada y sincronizada con student_grade_entries.',
        correction_requested: 'Se solicitó corrección a la familia/tutor.',
        rejected: 'Evidencia rechazada.',
      };
      toast({ title: 'Revisión guardada', description: descriptions[action] });
      setActiveId(null);
      setInternalComment('');
      await loadEvidence();
    } catch (error) {
      console.error('[EvidenceReviewPanel] Error reviewing:', error);
      toast({ title: 'Error', description: error.message || 'No se pudo completar la revisión.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-teal-600" /> Revisión de Evidencias
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Aprobar, pedir corrección o rechazar evidencias Off Campus. {scopeText}
          </p>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Life Skills y Extensión Local son áreas válidas; PACE Test aprobado requiere score ≥ 80/100.
          </p>
        </div>
        <button
          type="button"
          onClick={loadEvidence}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 hover:bg-slate-100"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
              filterStatus === key
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-teal-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-600">No hay evidencias en este estado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
          {items.map((item) => {
            const isActive = activeId === item.id;
            const canApprove = item.score != null && !(item.evidence_type === 'PACE Test' && Number(item.score) < 80);
            return (
              <div key={item.id} className="p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-slate-800 text-lg">{item.subject_name}</p>
                      <StatusBadge status={item.review_status} />
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-black border border-slate-200">
                        {OUTCOME_CONFIG[item.academic_outcome] || item.academic_outcome}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 font-bold">
                      {getStudentName(item.students)} · {item.students?.us_grade_level || 'Sin grado'} · {item.quarter} · {item.school_year}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-black">{item.evidence_type}</span> · Score <span className={Number(item.score || 0) < 80 ? 'font-black text-amber-600' : 'font-black text-[#193D6D]'}>{item.score == null ? 'Pendiente' : `${Number(item.score).toFixed(2)}/100`}</span>
                      {item.pace_number ? ` · PACE ${item.pace_number}` : ''}
                    </p>
                    <p className="text-xs text-slate-500 font-bold">
                      Área: {item.student_subjects?.academic_block || item.student_subjects?.pillar_type || 'Materia registrada'}
                      {item.student_subjects?.credit_value ? ` · Créditos ${item.student_subjects.credit_value}` : ''}
                    </p>
                    {item.comment && <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-3">{item.comment}</p>}
                    {(item.reviewer_comment || item.internal_comment) && (
                      <p className="text-sm text-blue-700 font-bold bg-blue-50 border border-blue-100 rounded-lg p-3">
                        Comentario interno: {item.internal_comment || item.reviewer_comment}
                      </p>
                    )}
                    {!canApprove && (
                      <p className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-flex">
                        Score pendiente o PACE Test menor de 80: usa pedir corrección/repetición, no aprobación.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-start lg:items-end gap-2 text-xs text-slate-500 font-bold">
                    <span>Enviada: {formatDate(item.created_at)}</span>
                    {item.reviewed_at && <span>Revisada: {formatDate(item.reviewed_at)}</span>}
                    {(item.signed_attachment_url || item.attachment_url) && (
                      <a
                        href={item.signed_attachment_url || item.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#193D6D] hover:underline"
                      >
                        <Paperclip className="w-3.5 h-3.5" /> Ver adjunto
                      </a>
                    )}
                    {(item.review_status === 'pending_review' || item.review_status === 'correction_requested') && (
                      <button
                        type="button"
                        onClick={() => setActiveId(isActive ? null : item.id)}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-black text-xs"
                      >
                        {isActive ? 'Cerrar revisión' : 'Revisar'}
                      </button>
                    )}
                  </div>
                </div>

                {isActive && (
                  <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={internalComment}
                        onChange={(event) => setInternalComment(event.target.value)}
                        placeholder="Comentario interno para auditoría / corrección..."
                        className="flex-1 px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleReview(item, 'approved')}
                        disabled={actionLoading || !canApprove}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Aprobar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(item, 'correction_requested')}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                        Pedir corrección
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(item, 'rejected')}
                        disabled={actionLoading}
                        className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        Rechazar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
