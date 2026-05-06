import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Plus, Trash2, CheckCircle2, AlertCircle, Send, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculateAverageGrade, getRecommendedMinimum, normalizeNumericGrade } from '@/lib/academicUtils';

const SUBMISSION_STATUS_CONFIG = {
  draft:     { label: 'Borrador',   className: 'bg-slate-100 text-slate-600 border-slate-200' },
  submitted: { label: 'En revisión', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved:  { label: 'Aprobado',   className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected:  { label: 'Rechazado',  className: 'bg-red-100 text-red-700 border-red-200' },
};

export default function GradeEntriesManager({ studentSubject, canEdit = false, onEntriesChanged }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(studentSubject?.grade_submission_status || 'draft');
  const { toast } = useToast();

  const minEntries = getRecommendedMinimum(studentSubject?.academic_block);

  const average = useMemo(() => {
    const computedAverage = calculateAverageGrade(entries);
    return computedAverage === null ? null : computedAverage.toFixed(2);
  }, [entries]);

  const meetsMinimum = entries.length >= minEntries;

  const persistAverageGrade = async (nextEntries) => {
    if (!studentSubject?.id) return;

    const nextGrade = calculateAverageGrade(nextEntries);
    const { error } = await supabase
      .from('student_subjects')
      .update({
        grade: nextGrade,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', studentSubject.id)
      .eq('student_id', studentSubject.student_id)
      .eq('quarter', studentSubject.quarter)
      .eq('school_year', studentSubject.school_year);

    if (error) throw error;

    if (typeof onEntriesChanged === 'function') {
      await onEntriesChanged({
        ...studentSubject,
        grade: nextGrade,
      });
    }
  };

  const loadEntries = async () => {
    if (!studentSubject?.id) {
      setEntries([]);
      setLoading(false);
      return;
    }

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
        .order('created_at', { ascending: true });

      if (error) throw error;

      const nextEntries = data || [];
      setEntries(nextEntries);
    } catch (err) {
      console.error('Error loading grade entries:', err);
      toast({ title: 'Error', description: 'No se pudieron cargar las notas parciales.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSubmissionStatus(studentSubject?.grade_submission_status || 'draft');
    loadEntries();
  }, [studentSubject?.id, studentSubject?.student_id, studentSubject?.quarter, studentSubject?.school_year, studentSubject?.grade_submission_status]);

  const isLocked = submissionStatus === 'submitted' || submissionStatus === 'approved';
  const effectiveCanEdit = canEdit && !isLocked;

  const handleSubmitForReview = async () => {
    if (!studentSubject?.id || entries.length === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_subject_grades', {
        p_student_subject_id: studentSubject.id,
      });
      if (error) throw error;

      setSubmissionStatus('submitted');
      toast({ title: 'Enviado', description: 'Las notas fueron enviadas para revisión.' });

      if (typeof onEntriesChanged === 'function') {
        await onEntriesChanged({ ...studentSubject, grade_submission_status: 'submitted' });
      }
    } catch (err) {
      console.error('Error submitting grades:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo enviar para revisión.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const addEntry = async () => {
    if (!effectiveCanEdit || !studentSubject) return;
    setAdding(true);

    try {
      const maxOrder = entries.length > 0 ? Math.max(...entries.map((entry) => entry.entry_order || 0)) : 0;

      const newEntry = {
        student_subject_id: studentSubject.id,
        student_id: studentSubject.student_id,
        quarter: studentSubject.quarter,
        school_year: studentSubject.school_year,
        assessment_name: `Actividad ${maxOrder + 1}`,
        score: 0,
        date_recorded: new Date().toISOString().split('T')[0],
        entry_order: maxOrder + 1,
      };

      const { data, error } = await supabase
        .from('student_grade_entries')
        .insert([newEntry])
        .select()
        .single();

      if (error) throw error;

      const nextEntries = [...entries, data];
      setEntries(nextEntries);
      await persistAverageGrade(nextEntries);
      toast({ title: 'Éxito', description: 'Nota agregada correctamente.' });
    } catch (err) {
      console.error('Error adding entry:', err);
      toast({ title: 'Error', description: 'No se pudo agregar la nota.', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

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
      const updateData = { [field]: value };

      if (field === 'score') {
        updateData.score = normalizeNumericGrade(value);
      }

      const { error } = await supabase
        .from('student_grade_entries')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      await persistAverageGrade(nextEntries);
    } catch (err) {
      console.error('Error updating entry:', err);
      setEntries(previousEntries);
      toast({ title: 'Error', description: 'No se pudo actualizar la nota.', variant: 'destructive' });
    }
  };

  const deleteEntry = async (id) => {
    if (!effectiveCanEdit) return;

    if (!window.confirm('¿Está seguro de eliminar esta nota parcial?')) return;

    const previousEntries = [...entries];
    const nextEntries = entries.filter((entry) => entry.id !== id);
    setEntries(nextEntries);

    try {
      const { error } = await supabase
        .from('student_grade_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await persistAverageGrade(nextEntries);
      toast({ title: 'Éxito', description: 'Nota eliminada correctamente.' });
    } catch (err) {
      console.error('Error deleting entry:', err);
      setEntries(previousEntries);
      toast({ title: 'Error', description: 'No se pudo eliminar la nota.', variant: 'destructive' });
    }
  };

  if (!studentSubject) {
    return <div className="text-sm text-slate-500">Seleccione una materia para ver sus notas.</div>;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h4 className="font-bold text-slate-800 text-lg">{studentSubject.subject_name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
              {studentSubject.academic_block || 'Sin Bloque'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {studentSubject.quarter} · {studentSubject.school_year}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Mínimo recomendado: {minEntries} notas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">Promedio</p>
            <p className="font-black text-xl text-[#193D6D] leading-none">{average ?? '—'}</p>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${
              meetsMinimum
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {meetsMinimum ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {entries.length} / {minEntries} Notas
          </div>
          {(() => {
            const cfg = SUBMISSION_STATUS_CONFIG[submissionStatus] || SUBMISSION_STATUS_CONFIG.draft;
            return (
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.className}`}>
                {isLocked && <Lock className="w-3 h-3" />}
                {cfg.label}
              </span>
            );
          })()}
        </div>
      </div>

      {/* < 80 mastery alert */}
      {average !== null && Number(average) < 80 && (
        <div className="mx-4 mt-3 mb-0 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-800 text-sm shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Promedio bajo el nivel de dominio esperado (80).</strong>{' '}
            Se recomienda revisión adicional o actividad de recuperación antes de enviar.
          </span>
        </div>
      )}

      <div className="p-4 flex-1 overflow-y-auto min-h-[250px]">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
            <AlertCircle className="w-10 h-10 text-slate-300 mb-2" />
            <p className="font-medium text-slate-600">No hay notas registradas</p>
            <p className="text-sm">Agregue notas parciales para calcular el promedio automático.</p>
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
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 sm:hidden">Actividad</label>
                    {effectiveCanEdit ? (
                      <input
                        type="text"
                        value={entry.assessment_name || ''}
                        onChange={(e) => updateEntry(entry.id, 'assessment_name', e.target.value)}
                        placeholder="Nombre de la actividad"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193D6D]/20 focus:border-[#193D6D]"
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-800">{entry.assessment_name || 'Sin nombre'}</span>
                    )}
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 sm:hidden">Calificación</label>
                    {effectiveCanEdit ? (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={entry.score === null ? '' : entry.score}
                        onChange={(e) => updateEntry(entry.id, 'score', e.target.value)}
                        placeholder="0-100"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm font-bold text-[#193D6D] focus:outline-none focus:ring-2 focus:ring-[#193D6D]/20 focus:border-[#193D6D]"
                      />
                    ) : (
                      <span className="text-sm font-bold text-[#193D6D]">{entry.score}</span>
                    )}
                  </div>

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
                      <span className="text-sm text-slate-600">
                        {entry.date_recorded ? new Date(entry.date_recorded).toLocaleDateString() : '-'}
                      </span>
                    )}
                  </div>
                </div>

                {effectiveCanEdit && (
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0 sm:ml-auto"
                    title="Eliminar nota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {(effectiveCanEdit || (canEdit && submissionStatus === 'draft' && entries.length > 0)) && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex flex-col sm:flex-row gap-3">
          {effectiveCanEdit && (
            <button
              onClick={addEntry}
              disabled={adding}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-slate-300 text-slate-600 hover:border-[#193D6D] hover:text-[#193D6D] rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Agregar Nueva Nota Parcial
            </button>
          )}
          {canEdit && submissionStatus === 'draft' && entries.length > 0 && (
            <button
              onClick={handleSubmitForReview}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-[#193D6D] hover:bg-[#122e54] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar para Revisión
            </button>
          )}
          {isLocked && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-bold">
              <Lock className="w-4 h-4" />
              {submissionStatus === 'submitted' ? 'Notas enviadas — pendiente de revisión.' : 'Notas aprobadas — solo lectura.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
