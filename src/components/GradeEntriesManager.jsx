import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Loader2, Plus, Trash2, CheckCircle2, AlertCircle,
  Send, Lock, X, Save, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  calculateAverageGrade,
  getRecommendedMinimum,
  normalizeNumericGrade,
} from '@/lib/academicUtils';

// ── Estado del envío ──────────────────────────────────────────────────────────
const SUBMISSION_STATUS_CONFIG = {
  draft:              { label: 'Borrador',           className: 'bg-slate-100 text-slate-600 border-slate-200' },
  submitted:          { label: 'En revisión',        className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved:           { label: 'Aprobado',           className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected:           { label: 'Rechazado',          className: 'bg-red-100 text-red-700 border-red-200' },
  revision_requested: { label: 'Corrección solicitada', className: 'bg-orange-100 text-orange-700 border-orange-200' },
};

// Formulario vacío por defecto
const EMPTY_FORM = {
  assessment_name: '',
  score: '',
  date_recorded:   new Date().toISOString().split('T')[0],
  comments:        '',
};

// ── Componente ────────────────────────────────────────────────────────────────
/**
 * GradeEntriesManager
 *
 * Props:
 *  - studentSubject   : objeto student_subjects (con grade_submission_status)
 *  - canEdit          : bool — el padre pasa true; el componente bloquea internamente
 *                       si el estado es submitted/approved
 *  - enteredByRole    : rol del usuario actual ('parent', 'tutor', etc.)
 *                       se guarda en student_grade_entries.entered_by_role
 *  - onEntriesChanged : callback cuando cambia el promedio o el estado
 */
export default function GradeEntriesManager({
  studentSubject,
  canEdit = false,
  enteredByRole = null,
  onEntriesChanged,
}) {
  const [entries,          setEntries]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [submitting,       setSubmitting]       = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(
    studentSubject?.grade_submission_status || 'draft'
  );
  const { toast } = useToast();

  // ── Formulario para nueva entrada ──────────────────────────────────────────
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm,     setAddForm]     = useState(EMPTY_FORM);
  const [addSaving,   setAddSaving]   = useState(false);
  const [addError,    setAddError]    = useState('');

  const minEntries = getRecommendedMinimum(studentSubject?.academic_block);

  const average = useMemo(() => {
    const v = calculateAverageGrade(entries);
    return v === null ? null : v.toFixed(2);
  }, [entries]);

  const meetsMinimum = entries.length >= minEntries;

  // ── Bloqueo interno ────────────────────────────────────────────────────────
  // submitted / approved: solo lectura.
  // revision_requested / rejected: se puede editar y reenviar.
  const isLocked = submissionStatus === 'submitted' || submissionStatus === 'approved';
  const effectiveCanEdit = canEdit && !isLocked;

  const isRevisionRequested =
    submissionStatus === 'revision_requested' || submissionStatus === 'rejected';

  // ── Helpers ────────────────────────────────────────────────────────────────
  const persistAverageGrade = async (nextEntries) => {
    if (!studentSubject?.id) return;
    const nextGrade = calculateAverageGrade(nextEntries);
    const { error } = await supabase
      .from('student_subjects')
      .update({ grade: nextGrade, submitted_at: new Date().toISOString() })
      .eq('id', studentSubject.id)
      .eq('student_id', studentSubject.student_id)
      .eq('quarter', studentSubject.quarter)
      .eq('school_year', studentSubject.school_year);
    if (error) throw error;
    if (typeof onEntriesChanged === 'function') {
      await onEntriesChanged({ ...studentSubject, grade: nextGrade });
    }
  };

  const loadEntries = async () => {
    if (!studentSubject?.id) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_grade_entries')
        .select('*')
        .eq('student_subject_id', studentSubject.id)
        .eq('student_id', studentSubject.student_id)
        .eq('quarter', studentSubject.quarter)
        .eq('school_year', studentSubject.school_year)
        .order('entry_order', { ascending: true })
        .order('created_at',  { ascending: true });
      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error('[GradeEntriesManager] Error loading:', err);
      toast({ title: 'Error', description: 'No se pudieron cargar las notas parciales.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSubmissionStatus(studentSubject?.grade_submission_status || 'draft');
    setShowAddForm(false);
    setAddForm(EMPTY_FORM);
    loadEntries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    studentSubject?.id,
    studentSubject?.student_id,
    studentSubject?.quarter,
    studentSubject?.school_year,
    studentSubject?.grade_submission_status,
  ]);

  // ── Guardar nueva entrada (formulario) ─────────────────────────────────────
  const handleSaveNew = async (e) => {
    e.preventDefault();
    setAddError('');

    const scoreNum = parseFloat(addForm.score);
    if (!addForm.assessment_name.trim()) {
      setAddError('El nombre de la evaluación es obligatorio.');
      return;
    }
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setAddError('La calificación debe estar entre 0 y 100.');
      return;
    }
    if (!addForm.date_recorded) {
      setAddError('La fecha es obligatoria.');
      return;
    }

    setAddSaving(true);
    try {
      const maxOrder =
        entries.length > 0
          ? Math.max(...entries.map((e) => e.entry_order || 0))
          : 0;

      const payload = {
        student_subject_id: studentSubject.id,
        student_id:         studentSubject.student_id,
        quarter:            studentSubject.quarter,
        school_year:        studentSubject.school_year,
        assessment_name:    addForm.assessment_name.trim(),
        score:              normalizeNumericGrade(scoreNum),
        date_recorded:      addForm.date_recorded,
        comments:           addForm.comments.trim() || null,
        entry_order:        maxOrder + 1,
        entered_by_role:    enteredByRole || null,
      };

      // entered_by se obtiene con la sesión actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) payload.entered_by = user.id;

      const { data, error } = await supabase
        .from('student_grade_entries')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const nextEntries = [...entries, data];
      setEntries(nextEntries);
      await persistAverageGrade(nextEntries);

      toast({ title: 'Nota guardada', description: `"${data.assessment_name}" agregada correctamente.` });
      setShowAddForm(false);
      setAddForm(EMPTY_FORM);
    } catch (err) {
      console.error('[GradeEntriesManager] Error saving new entry:', err);
      setAddError(err.message || 'No se pudo guardar la nota.');
    } finally {
      setAddSaving(false);
    }
  };

  // ── Editar entrada existente ───────────────────────────────────────────────
  const updateEntry = async (id, field, value) => {
    if (!effectiveCanEdit) return;
    const previousEntries = [...entries];
    const nextEntries = entries.map((entry) =>
      entry.id === id
        ? { ...entry, [field]: field === 'score' ? normalizeNumericGrade(value) : value }
        : entry
    );
    setEntries(nextEntries);
    try {
      const updateData = {
        [field]: field === 'score' ? normalizeNumericGrade(value) : value,
      };
      const { error } = await supabase
        .from('student_grade_entries')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
      await persistAverageGrade(nextEntries);
    } catch (err) {
      console.error('[GradeEntriesManager] Error updating:', err);
      setEntries(previousEntries);
      toast({ title: 'Error', description: 'No se pudo actualizar la nota.', variant: 'destructive' });
    }
  };

  // ── Eliminar entrada ───────────────────────────────────────────────────────
  const deleteEntry = async (id) => {
    if (!effectiveCanEdit) return;
    if (!window.confirm('¿Eliminar esta nota parcial?')) return;
    const previousEntries = [...entries];
    const nextEntries = entries.filter((e) => e.id !== id);
    setEntries(nextEntries);
    try {
      const { error } = await supabase
        .from('student_grade_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await persistAverageGrade(nextEntries);
      toast({ title: 'Eliminada', description: 'Nota parcial eliminada.' });
    } catch (err) {
      console.error('[GradeEntriesManager] Error deleting:', err);
      setEntries(previousEntries);
      toast({ title: 'Error', description: 'No se pudo eliminar.', variant: 'destructive' });
    }
  };

  // ── Enviar para revisión ───────────────────────────────────────────────────
  const handleSubmitForReview = async () => {
    if (!studentSubject?.id || entries.length === 0) return;
    setSubmitting(true);
    try {
      const rpcName = isRevisionRequested ? 'resubmit_subject_grades' : 'submit_subject_grades';
      const { error } = await supabase.rpc(rpcName, {
        p_student_subject_id: studentSubject.id,
      });
      if (error) throw error;

      setSubmissionStatus('submitted');
      toast({ title: 'Enviado', description: 'Notas enviadas para revisión.' });

      if (typeof onEntriesChanged === 'function') {
        await onEntriesChanged({ ...studentSubject, grade_submission_status: 'submitted' });
      }
    } catch (err) {
      console.error('[GradeEntriesManager] Error submitting:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo enviar.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (!studentSubject) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-slate-400">
        Seleccione una materia para ver sus notas parciales.
      </div>
    );
  }

  const statusCfg = SUBMISSION_STATUS_CONFIG[submissionStatus] || SUBMISSION_STATUS_CONFIG.draft;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">

      {/* ── Header ── */}
      <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h4 className="font-bold text-slate-800 text-lg">{studentSubject.subject_name}</h4>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
              {studentSubject.academic_block || 'Sin Bloque'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {studentSubject.quarter} · {studentSubject.school_year}
            </span>
            <span className="text-xs text-slate-400">
              Mínimo recomendado: {minEntries} notas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Promedio</p>
            <p className="font-black text-xl text-[#193D6D] leading-none">{average ?? '—'}</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${
            meetsMinimum
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {meetsMinimum ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {entries.length} / {minEntries}
          </div>
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusCfg.className}`}>
            {isLocked && <Lock className="w-3 h-3" />}
            {statusCfg.label}
          </span>
        </div>
      </div>

      {/* ── Alerta de promedio < 80 ── */}
      {average !== null && Number(average) < 80 && (
        <div className="mx-4 mt-3 mb-0 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-sm shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Promedio bajo el nivel de dominio esperado (80).</strong>{' '}
            Se recomienda revisión o actividad de recuperación antes de enviar.
          </span>
        </div>
      )}

      {/* ── Alerta de corrección solicitada ── */}
      {isRevisionRequested && studentSubject.grade_review_comment && (
        <div className="mx-4 mt-3 mb-0 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm shrink-0">
          <p className="font-bold text-orange-800 mb-0.5">
            {submissionStatus === 'rejected' ? '⛔ Notas rechazadas' : '📝 Corrección solicitada'}
          </p>
          <p className="text-orange-700">{studentSubject.grade_review_comment}</p>
          <p className="text-xs text-orange-500 mt-1">Corrija las notas y vuelva a enviar para revisión.</p>
        </div>
      )}

      {/* ── Lista de entradas ── */}
      <div className="p-4 flex-1 overflow-y-auto min-h-[220px]">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : entries.length === 0 && !showAddForm ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
            <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
            <p className="font-medium text-slate-600">Sin notas registradas</p>
            <p className="text-sm">Usa el botón de abajo para agregar notas parciales.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:border-[#193D6D]/30 transition-colors"
              >
                <div className="flex items-center justify-center bg-slate-100 text-slate-500 font-bold text-sm w-8 h-8 rounded-md shrink-0">
                  {index + 1}
                </div>

                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Nombre */}
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 sm:hidden">Evaluación</label>
                    {effectiveCanEdit ? (
                      <input
                        type="text"
                        value={entry.assessment_name || ''}
                        onChange={(e) => updateEntry(entry.id, 'assessment_name', e.target.value)}
                        placeholder="Nombre de la evaluación"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D6D]/20 focus:border-[#193D6D]"
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-800">{entry.assessment_name || 'Sin nombre'}</span>
                    )}
                  </div>

                  {/* Calificación */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 sm:hidden">Nota</label>
                    {effectiveCanEdit ? (
                      <input
                        type="number" min="0" max="100" step="0.1"
                        value={entry.score === null ? '' : entry.score}
                        onChange={(e) => updateEntry(entry.id, 'score', e.target.value)}
                        placeholder="0-100"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-bold text-[#193D6D] focus:outline-none focus:ring-2 focus:ring-[#193D6D]/20 focus:border-[#193D6D]"
                      />
                    ) : (
                      <span className={`text-sm font-bold ${Number(entry.score) < 80 ? 'text-amber-600' : 'text-[#193D6D]'}`}>
                        {entry.score}
                      </span>
                    )}
                  </div>

                  {/* Fecha */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 sm:hidden">Fecha</label>
                    {effectiveCanEdit ? (
                      <input
                        type="date"
                        value={entry.date_recorded || ''}
                        onChange={(e) => updateEntry(entry.id, 'date_recorded', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#193D6D]/20 focus:border-[#193D6D]"
                      />
                    ) : (
                      <span className="text-sm text-slate-500">
                        {entry.date_recorded ? new Date(entry.date_recorded + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    )}
                  </div>

                  {/* Quién ingresó */}
                  <div className="sm:col-span-2 flex items-center">
                    {entry.entered_by_role && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                        {entry.entered_by_role === 'parent' || entry.entered_by_role === 'family' ? 'Padre' :
                         entry.entered_by_role === 'tutor' || entry.entered_by_role === 'mentor' ? 'Tutor' :
                         entry.entered_by_role === 'admin' || entry.entered_by_role === 'super_admin' ? 'Admin' :
                         entry.entered_by_role}
                      </span>
                    )}
                  </div>
                </div>

                {effectiveCanEdit && (
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                    title="Eliminar nota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            {/* ── Formulario de nueva nota (inline) ── */}
            {showAddForm && (
              <form
                onSubmit={handleSaveNew}
                className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200"
              >
                <p className="text-sm font-black text-[#193D6D]">Nueva nota parcial</p>

                {addError && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {addError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Nombre */}
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre de evaluación / PACE <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={addForm.assessment_name}
                      onChange={(e) => setAddForm(f => ({ ...f, assessment_name: e.target.value }))}
                      placeholder="Ej: PACE Matemáticas #3, Prueba Oral..."
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D6D]/30 focus:border-[#193D6D]"
                      disabled={addSaving}
                      autoFocus
                    />
                  </div>

                  {/* Calificación */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Calificación <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" min="0" max="100" step="0.1"
                      required
                      value={addForm.score}
                      onChange={(e) => setAddForm(f => ({ ...f, score: e.target.value }))}
                      placeholder="0 – 100"
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm font-bold text-[#193D6D] focus:outline-none focus:ring-2 focus:ring-[#193D6D]/30 focus:border-[#193D6D]"
                      disabled={addSaving}
                    />
                  </div>

                  {/* Fecha */}
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fecha <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={addForm.date_recorded}
                      onChange={(e) => setAddForm(f => ({ ...f, date_recorded: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#193D6D]/30 focus:border-[#193D6D]"
                      disabled={addSaving}
                    />
                  </div>

                  {/* Comentario */}
                  <div className="sm:col-span-12">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Comentario <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={addForm.comments}
                      onChange={(e) => setAddForm(f => ({ ...f, comments: e.target.value }))}
                      placeholder="Observación adicional sobre esta evaluación..."
                      className="w-full px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#193D6D]/30 focus:border-[#193D6D]"
                      disabled={addSaving}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={addSaving}
                    className="flex items-center gap-2 px-5 py-2 bg-[#193D6D] hover:bg-[#122e54] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {addSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); setAddError(''); }}
                    disabled={addSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Footer con acciones ── */}
      {(effectiveCanEdit || isRevisionRequested || isLocked || (!showAddForm && canEdit && submissionStatus === 'draft' && entries.length > 0)) && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex flex-col sm:flex-row gap-3 flex-wrap">

          {/* Botón agregar nota */}
          {effectiveCanEdit && !showAddForm && (
            <button
              onClick={() => { setShowAddForm(true); setAddError(''); setAddForm(EMPTY_FORM); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-slate-300 text-slate-600 hover:border-[#193D6D] hover:text-[#193D6D] rounded-lg font-bold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Agregar Nueva Nota Parcial
            </button>
          )}

          {/* Enviar / reenviar para revisión */}
          {canEdit && (submissionStatus === 'draft' || isRevisionRequested) && entries.length > 0 && !showAddForm && (
            <button
              onClick={handleSubmitForReview}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-[#193D6D] hover:bg-[#122e54] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isRevisionRequested ? <RefreshCw className="w-4 h-4" /> : <Send className="w-4 h-4" />
              }
              {isRevisionRequested ? 'Reenviar para Revisión' : 'Enviar para Revisión'}
            </button>
          )}

          {/* Mensaje de bloqueado */}
          {isLocked && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-bold">
              <Lock className="w-4 h-4" />
              {submissionStatus === 'submitted'
                ? 'Notas enviadas — pendiente de revisión.'
                : 'Notas aprobadas — solo lectura.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
