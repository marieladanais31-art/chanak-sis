import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, X, AlertTriangle, CheckCircle2, Clock, BookOpen } from 'lucide-react';
import { QUARTERS } from '@/lib/academicUtils';

const PACE_STATUSES = [
  { value: 'pending',     label: 'Pendiente',    color: 'bg-slate-100 text-slate-600' },
  { value: 'in_progress', label: 'En Progreso',  color: 'bg-blue-100 text-blue-700' },
  { value: 'delivered',   label: 'Entregado',    color: 'bg-indigo-100 text-indigo-700' },
  { value: 'evaluated',   label: 'Evaluado',     color: 'bg-emerald-100 text-emerald-700' },
  { value: 'delayed',     label: 'Retrasado',    color: 'bg-red-100 text-red-700' },
  { value: 'cancelled',   label: 'Cancelado',    color: 'bg-gray-100 text-gray-500' },
];

const STATUS_MAP = Object.fromEntries(PACE_STATUSES.map(s => [s.value, s]));
const today = new Date().toISOString().split('T')[0];

const INPUT = 'w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm';

const EMPTY_FORM = {
  subject_name: '', pace_number: '', quarter: 'Q1', grade_level: '',
  estimated_start_date: '', estimated_delivery_date: '', actual_delivery_date: '',
  status: 'pending', grade_obtained: '', tutor_notes: '', coordinator_notes: '',
};

/**
 * Props:
 *  peiId        string — ID del PEI padre (requerido para guardar)
 *  studentId    string
 *  schoolYear   string
 *  canEdit      bool — coordinador/admin pueden editar; tutor puede editar status/notas
 *  tutorMode    bool — tutor puede editar status y notas, pero no agregar/borrar
 */
export default function PaceProjectionManager({ peiId, studentId, schoolYear, canEdit = false, tutorMode = false }) {
  const { toast } = useToast();
  const [paces, setPaces]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState(null); // null = new, object = editing
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [filterQ, setFilterQ]   = useState('all');

  const load = useCallback(async () => {
    if (!peiId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pei_pace_projections')
        .select('*')
        .eq('pei_id', peiId)
        .order('quarter', { ascending: true })
        .order('subject_name', { ascending: true })
        .order('pace_number', { ascending: true });
      if (error) throw error;
      // Auto-detectar retrasados
      const enriched = (data || []).map(p => ({
        ...p,
        _isOverdue: p.estimated_delivery_date < today && !['evaluated','cancelled'].includes(p.status),
      }));
      setPaces(enriched);
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudieron cargar los PACEs.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [peiId]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, school_year: schoolYear || '' });
    setModalOpen(true);
  };

  const openEdit = (pace) => {
    setEditing(pace);
    setForm({
      subject_name: pace.subject_name || '',
      pace_number: pace.pace_number != null ? String(pace.pace_number) : '',
      quarter: pace.quarter || 'Q1',
      grade_level: pace.grade_level || '',
      estimated_start_date: pace.estimated_start_date || '',
      estimated_delivery_date: pace.estimated_delivery_date || '',
      actual_delivery_date: pace.actual_delivery_date || '',
      status: pace.status || 'pending',
      grade_obtained: pace.grade_obtained != null ? String(pace.grade_obtained) : '',
      tutor_notes: pace.tutor_notes || '',
      coordinator_notes: pace.coordinator_notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!peiId || !studentId) {
      toast({ title: 'Error', description: 'Guarda el PEI antes de añadir PACEs.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        pei_id: peiId,
        student_id: studentId,
        subject_name: form.subject_name.trim(),
        pace_number: parseInt(form.pace_number) || 0,
        quarter: form.quarter,
        grade_level: form.grade_level || null,
        school_year: schoolYear || form.school_year,
        estimated_start_date: form.estimated_start_date || null,
        estimated_delivery_date: form.estimated_delivery_date || null,
        actual_delivery_date: form.actual_delivery_date || null,
        status: form.status,
        grade_obtained: form.grade_obtained ? parseFloat(form.grade_obtained) : null,
        tutor_notes: form.tutor_notes || null,
        coordinator_notes: form.coordinator_notes || null,
        updated_at: new Date().toISOString(),
      };
      if (editing) {
        const { error } = await supabase.from('pei_pace_projections').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pei_pace_projections').insert([payload]);
        if (error) throw error;
      }
      toast({ title: 'PACE guardado', description: `${form.subject_name} PACE #${form.pace_number}` });
      setModalOpen(false);
      await load();
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'No se pudo guardar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este PACE?')) return;
    try {
      const { error } = await supabase.from('pei_pace_projections').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo eliminar.', variant: 'destructive' });
    }
  };

  const filtered = filterQ === 'all' ? paces : paces.filter(p => p.quarter === filterQ);
  const overdueCount = paces.filter(p => p._isOverdue).length;

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h4 className="font-bold text-slate-700 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600" /> Proyección de PACEs
          </h4>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
              <AlertTriangle className="w-3 h-3" /> {overdueCount} retrasado{overdueCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button onClick={() => setFilterQ('all')} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${filterQ === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              Todos
            </button>
            {QUARTERS.map(q => (
              <button key={q.id} onClick={() => setFilterQ(q.id)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${filterQ === q.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {q.id}
              </button>
            ))}
          </div>
          {canEdit && !tutorMode && (
            <button onClick={openNew}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Añadir PACE
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <p className="text-center text-slate-400 py-6 text-sm">No hay PACEs registrados para este filtro.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2.5 font-bold">Materia</th>
                <th className="px-3 py-2.5 font-bold text-center">PACE #</th>
                <th className="px-3 py-2.5 font-bold text-center">Q</th>
                <th className="px-3 py-2.5 font-bold">Entrega Est.</th>
                <th className="px-3 py-2.5 font-bold">Entrega Real</th>
                <th className="px-3 py-2.5 font-bold text-center">Estado</th>
                <th className="px-3 py-2.5 font-bold text-center">Nota</th>
                {(canEdit || tutorMode) && <th className="px-3 py-2.5 font-bold text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => {
                const st = STATUS_MAP[p.status] || STATUS_MAP.pending;
                return (
                  <tr key={p.id} className={`hover:bg-slate-50 ${p._isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2 font-medium text-slate-800">
                      {p._isOverdue && <AlertTriangle className="w-3 h-3 text-red-500 inline mr-1" />}
                      {p.subject_name}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-blue-700">{p.pace_number}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{p.quarter}</td>
                    <td className="px-3 py-2 text-slate-600">{p.estimated_delivery_date || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{p.actual_delivery_date || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-slate-700">
                      {p.grade_obtained != null ? `${p.grade_obtained}%` : '—'}
                    </td>
                    {(canEdit || tutorMode) && (
                      <td className="px-3 py-2 text-right">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(p)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg">
                            <Pencil className="w-3 h-3" />
                          </button>
                          {canEdit && !tutorMode && (
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal add/edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800 text-lg">
                {editing ? `Editar PACE — ${editing.subject_name} #${editing.pace_number}` : 'Nuevo PACE'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Materia *</label>
                  <input required type="text" value={form.subject_name} onChange={e => setForm(f => ({...f, subject_name: e.target.value}))} className={INPUT} placeholder="Ej. Mathematics" disabled={tutorMode} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">PACE # *</label>
                  <input required type="number" min="1" value={form.pace_number} onChange={e => setForm(f => ({...f, pace_number: e.target.value}))} className={INPUT} placeholder="101" disabled={tutorMode} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Trimestre *</label>
                  <select value={form.quarter} onChange={e => setForm(f => ({...f, quarter: e.target.value}))} className={INPUT} disabled={tutorMode}>
                    {QUARTERS.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Grado</label>
                  <input type="text" value={form.grade_level} onChange={e => setForm(f => ({...f, grade_level: e.target.value}))} className={INPUT} placeholder="10th" disabled={tutorMode} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className={INPUT}>
                    {PACE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Inicio Est.</label>
                  <input type="date" value={form.estimated_start_date} onChange={e => setForm(f => ({...f, estimated_start_date: e.target.value}))} className={INPUT} disabled={tutorMode} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Entrega Est.</label>
                  <input type="date" value={form.estimated_delivery_date} onChange={e => setForm(f => ({...f, estimated_delivery_date: e.target.value}))} className={INPUT} disabled={tutorMode} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Entrega Real</label>
                  <input type="date" value={form.actual_delivery_date} onChange={e => setForm(f => ({...f, actual_delivery_date: e.target.value}))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nota Obtenida</label>
                  <input type="number" min="0" max="100" step="0.1" value={form.grade_obtained} onChange={e => setForm(f => ({...f, grade_obtained: e.target.value}))} className={INPUT} placeholder="0–100" />
                </div>
                <div className="col-span-2 md:col-span-3">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Observaciones del Tutor</label>
                  <textarea rows={2} value={form.tutor_notes} onChange={e => setForm(f => ({...f, tutor_notes: e.target.value}))} className={INPUT + ' resize-none'} />
                </div>
                {!tutorMode && (
                  <div className="col-span-2 md:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Observaciones del Coordinador</label>
                    <textarea rows={2} value={form.coordinator_notes} onChange={e => setForm(f => ({...f, coordinator_notes: e.target.value}))} className={INPUT + ' resize-none'} />
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {saving ? 'Guardando...' : 'Guardar PACE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
