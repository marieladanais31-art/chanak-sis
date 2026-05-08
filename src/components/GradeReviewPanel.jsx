import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Loader2, CheckCircle2, XCircle, RotateCcw,
  ClipboardList, AlertCircle, MessageSquare,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── Configuración de estados ──────────────────────────────────────────────────
const STATUS_CONFIG = {
  submitted:          { label: 'Enviado',              className: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved:           { label: 'Aprobado',             className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected:           { label: 'Rechazado',            className: 'bg-red-100 text-red-800 border-red-200' },
  revision_requested: { label: 'Corrección solicitada', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  draft:              { label: 'Borrador',             className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

// Etiqueta de rol legible
const ROLE_LABEL = {
  parent:      'Padre/Madre',
  family:      'Familia',
  tutor:       'Tutor',
  mentor:      'Mentor',
  admin:       'Admin',
  super_admin: 'Super Admin',
  coordinator: 'Coordinador',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Filtros disponibles ───────────────────────────────────────────────────────
const FILTERS = [
  { key: 'submitted',          label: 'Pendientes' },
  { key: 'revision_requested', label: 'Corrección' },
  { key: 'approved',           label: 'Aprobados' },
  { key: 'rejected',           label: 'Rechazados' },
  { key: 'all',                label: 'Todos' },
];

// ── Componente ────────────────────────────────────────────────────────────────
/**
 * GradeReviewPanel
 *
 * Props:
 *  - hubId: uuid | null — si no es null, filtra por hub del coordinador.
 */
export default function GradeReviewPanel({ hubId = null }) {
  const { toast } = useToast();
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterStatus,  setFilterStatus]  = useState('submitted');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewingId,   setReviewingId]   = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Carga de envíos ─────────────────────────────────────────────────────────
  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('student_subjects')
        .select(`
          id,
          subject_name,
          quarter,
          school_year,
          grade,
          grade_submission_status,
          grade_submitted_at,
          grade_reviewed_at,
          grade_review_comment,
          grade_reviewed_by,
          grade_submitted_by,
          student_id,
          students ( first_name, last_name, us_grade_level, hub_id )
        `)
        .order('grade_submitted_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('grade_submission_status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtro por hub (coordinador)
      let result = data || [];
      if (hubId) {
        result = result.filter((item) => item.students?.hub_id === hubId);
      }

      // Obtener roles de quienes enviaron (grade_submitted_by → profiles.role)
      const submitterIds = [...new Set(result
        .map(r => r.grade_submitted_by)
        .filter(Boolean))];

      let submitterRoles = {};
      if (submitterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, role')
          .in('user_id', submitterIds);
        if (profiles) {
          profiles.forEach(p => { submitterRoles[p.user_id] = p.role; });
        }
      }

      // Adjuntar el rol al item
      result = result.map(item => ({
        ...item,
        _submitter_role: submitterRoles[item.grade_submitted_by] || null,
      }));

      setItems(result);
    } catch (err) {
      console.error('[GradeReviewPanel] Error loading:', err);
      toast({ title: 'Error', description: 'No se pudieron cargar los envíos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, hubId, toast]);

  useEffect(() => { loadSubmissions(); }, [loadSubmissions]);

  // ── Acciones de revisión ────────────────────────────────────────────────────
  const handleReview = async (subjectId, action) => {
    if (!['approved', 'rejected', 'revision_requested'].includes(action)) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('review_subject_grades', {
        p_student_subject_id: subjectId,
        p_action:             action,
        p_comment:            reviewComment.trim() || null,
      });
      if (error) throw error;

      const messages = {
        approved:           'Las notas han sido aprobadas.',
        rejected:           'Las notas han sido rechazadas. El tutor/padre puede corregir.',
        revision_requested: 'Se solicitó corrección. El tutor/padre puede reenviar.',
      };
      toast({ title: '✓ Revisión completada', description: messages[action] });

      setReviewingId(null);
      setReviewComment('');
      await loadSubmissions();
    } catch (err) {
      console.error('[GradeReviewPanel] Error reviewing:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo completar.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async (subjectId) => {
    if (!window.confirm('¿Regresar a borrador para permitir correcciones?')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('reset_subject_grades_to_draft', {
        p_student_subject_id: subjectId,
      });
      if (error) throw error;
      toast({ title: 'Restablecido', description: 'Las notas volvieron a estado borrador.' });
      await loadSubmissions();
    } catch (err) {
      console.error('[GradeReviewPanel] Error resetting:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo restablecer.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (val) => {
    if (!val) return '—';
    return new Date(val).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Cabecera */}
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600" /> Revisión de Notas
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Aprueba, solicita corrección o rechaza los envíos de tutores y padres.
          {hubId ? ' · Solo tu hub.' : ''}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
              filterStatus === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-16 text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-600">No hay envíos en este estado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-bold">Estudiante</th>
                  <th className="p-4 font-bold">Materia</th>
                  <th className="p-4 font-bold text-center">Quarter</th>
                  <th className="p-4 font-bold text-center">Promedio</th>
                  <th className="p-4 font-bold text-center">Enviado por</th>
                  <th className="p-4 font-bold text-center">Estado</th>
                  <th className="p-4 font-bold text-center">Fecha envío</th>
                  <th className="p-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const student    = item.students;
                  const isReviewing = reviewingId === item.id;
                  const status     = item.grade_submission_status;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50">

                        {/* Estudiante */}
                        <td className="p-4">
                          <p className="font-bold text-slate-800">
                            {student?.first_name} {student?.last_name}
                          </p>
                          <p className="text-xs text-slate-400">{student?.us_grade_level || '—'}</p>
                        </td>

                        {/* Materia */}
                        <td className="p-4 font-medium text-slate-800">{item.subject_name}</td>

                        {/* Quarter */}
                        <td className="p-4 text-center text-slate-500 text-xs">{item.quarter}</td>

                        {/* Promedio */}
                        <td className="p-4 text-center">
                          {item.grade != null ? (
                            <span className={`font-black text-base ${Number(item.grade) < 80 ? 'text-amber-600' : 'text-[#193D6D]'}`}>
                              {parseFloat(item.grade).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Enviado por (rol) */}
                        <td className="p-4 text-center">
                          {item._submitter_role ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {ROLE_LABEL[item._submitter_role] || item._submitter_role}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="p-4 text-center">
                          <StatusBadge status={status} />
                          {item.grade_review_comment && (
                            <p
                              className="text-xs text-slate-400 mt-1 max-w-[140px] truncate mx-auto"
                              title={item.grade_review_comment}
                            >
                              {item.grade_review_comment}
                            </p>
                          )}
                        </td>

                        {/* Fecha envío */}
                        <td className="p-4 text-center text-xs text-slate-400">
                          {formatDate(item.grade_submitted_at)}
                        </td>

                        {/* Acciones */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 flex-wrap">
                            {(status === 'submitted' || status === 'revision_requested') && (
                              <button
                                onClick={() => setReviewingId(isReviewing ? null : item.id)}
                                className={`px-3 py-1.5 text-white text-xs rounded-lg font-bold transition-colors ${
                                  isReviewing
                                    ? 'bg-slate-500 hover:bg-slate-600'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                              >
                                {isReviewing ? 'Cerrar' : 'Revisar'}
                              </button>
                            )}
                            {(status === 'approved' || status === 'rejected' || status === 'revision_requested') && (
                              <button
                                onClick={() => handleReset(item.id)}
                                disabled={actionLoading}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-bold transition-colors disabled:opacity-50"
                                title="Regresar a borrador"
                              >
                                <RotateCcw className="w-3 h-3" />
                                Borrador
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Panel de revisión expandido */}
                      {isReviewing && (
                        <tr className="bg-blue-50 border-b border-blue-100">
                          <td colSpan={8} className="px-6 py-5">
                            <div className="space-y-3">
                              <p className="text-sm font-black text-[#193D6D]">
                                Revisando notas de {student?.first_name} — {item.subject_name}
                              </p>

                              {/* Campo comentario */}
                              <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  value={reviewComment}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                  placeholder="Comentario u observación (recomendado para correcciones y rechazos)..."
                                  className="flex-1 px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                              </div>

                              {/* Botones de acción */}
                              <div className="flex gap-3 flex-wrap">
                                <button
                                  onClick={() => handleReview(item.id, 'approved')}
                                  disabled={actionLoading}
                                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                                >
                                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                  Aprobar
                                </button>

                                <button
                                  onClick={() => handleReview(item.id, 'revision_requested')}
                                  disabled={actionLoading}
                                  className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                                  title="Solicitar corrección sin rechazar definitivamente"
                                >
                                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                                  Solicitar corrección
                                </button>

                                <button
                                  onClick={() => handleReview(item.id, 'rejected')}
                                  disabled={actionLoading}
                                  className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                                >
                                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                  Rechazar
                                </button>

                                <button
                                  onClick={() => { setReviewingId(null); setReviewComment(''); }}
                                  className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                  Cancelar
                                </button>
                              </div>

                              {/* Distinción entre "solicitar corrección" y "rechazar" */}
                              <p className="text-xs text-slate-400">
                                <strong>Solicitar corrección</strong>: el padre/tutor puede editar y reenviar sin intervención del admin.
                                {' '}<strong>Rechazar</strong>: bloqueo definitivo hasta que un admin restablezca el estado.
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
