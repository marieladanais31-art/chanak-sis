import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, CheckCircle2, XCircle, RotateCcw, ClipboardList, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_LABELS = {
  submitted: { label: 'Enviado', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved:  { label: 'Aprobado', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected:  { label: 'Rechazado', className: 'bg-red-100 text-red-800 border-red-200' },
  draft:     { label: 'Borrador', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] || STATUS_LABELS.draft;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export default function GradeReviewPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('submitted');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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
          student_id,
          students ( first_name, last_name, us_grade_level )
        `)
        .order('grade_submitted_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('grade_submission_status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('[GradeReviewPanel] Error loading submissions:', err);
      toast({ title: 'Error', description: 'No se pudieron cargar los envíos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, toast]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const handleReview = async (subjectId, action) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('review_subject_grades', {
        p_student_subject_id: subjectId,
        p_action: action,
        p_comment: reviewComment || null,
      });
      if (error) throw error;

      toast({
        title: action === 'approved' ? 'Notas aprobadas' : 'Notas rechazadas',
        description: action === 'approved'
          ? 'Las notas han sido aprobadas correctamente.'
          : 'Las notas han sido rechazadas. El tutor/padre podrá corregirlas.',
      });

      setReviewingId(null);
      setReviewComment('');
      await loadSubmissions();
    } catch (err) {
      console.error('[GradeReviewPanel] Error reviewing:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo completar la revisión.', variant: 'destructive' });
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
      toast({ title: 'Restablecido', description: 'Las notas regresaron a estado borrador.' });
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
    return new Date(val).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-blue-600" /> Revisión de Notas
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Aprueba o rechaza los envíos de notas de tutores y padres.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'submitted', label: 'Pendientes' },
          { key: 'approved', label: 'Aprobados' },
          { key: 'rejected', label: 'Rechazados' },
          { key: 'all', label: 'Todos' },
        ].map(({ key, label }) => (
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
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4 font-bold">Estudiante</th>
                <th className="p-4 font-bold">Materia</th>
                <th className="p-4 font-bold text-center">Quarter</th>
                <th className="p-4 font-bold text-center">Promedio</th>
                <th className="p-4 font-bold text-center">Estado</th>
                <th className="p-4 font-bold text-center">Enviado</th>
                <th className="p-4 font-bold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const student = item.students;
                const isReviewing = reviewingId === item.id;

                return (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">
                          {student?.first_name} {student?.last_name}
                        </p>
                        <p className="text-xs text-slate-500">{student?.us_grade_level || '—'}</p>
                      </td>
                      <td className="p-4 font-medium text-slate-800">{item.subject_name}</td>
                      <td className="p-4 text-center text-slate-600">{item.quarter}</td>
                      <td className="p-4 text-center font-bold text-[#193D6D]">
                        {item.grade != null ? `${parseFloat(item.grade).toFixed(1)}%` : '—'}
                      </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={item.grade_submission_status} />
                        {item.grade_review_comment && (
                          <p className="text-xs text-slate-500 mt-1 max-w-xs truncate" title={item.grade_review_comment}>
                            {item.grade_review_comment}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-center text-xs text-slate-500">
                        {formatDate(item.grade_submitted_at)}
                      </td>
                      <td className="p-4 text-center">
                        {item.grade_submission_status === 'submitted' && (
                          <button
                            onClick={() => setReviewingId(isReviewing ? null : item.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-bold transition-colors"
                          >
                            Revisar
                          </button>
                        )}
                        {item.grade_submission_status === 'approved' && (
                          <button
                            onClick={() => handleReset(item.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg font-bold transition-colors mx-auto"
                          >
                            <RotateCcw className="w-3 h-3" /> Reabrir
                          </button>
                        )}
                        {item.grade_submission_status === 'rejected' && (
                          <button
                            onClick={() => handleReset(item.id)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs rounded-lg font-bold transition-colors mx-auto"
                          >
                            <RotateCcw className="w-3 h-3" /> Restablecer
                          </button>
                        )}
                      </td>
                    </tr>

                    {isReviewing && (
                      <tr className="bg-blue-50 border-b border-blue-100">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                                Comentario (opcional)
                              </label>
                              <input
                                type="text"
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="Observación para el tutor/padre..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                              />
                            </div>
                            <div className="flex gap-3 shrink-0">
                              <button
                                onClick={() => handleReview(item.id, 'approved')}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                              >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleReview(item.id, 'rejected')}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
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
      )}
    </div>
  );
}
