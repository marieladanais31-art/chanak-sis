import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Edit, X, Save, Calendar } from 'lucide-react';
import { ACTIVE_SCHOOL_YEAR } from '@/lib/academicUtils';

const INPUT = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const LABEL = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const SUBJECTS = ['Español', 'Life Skills', 'Physical Education', 'Arts'];

const MONTH_NAMES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const STATUS_META = {
  pending:   { label: 'Pendiente',   color: 'bg-slate-100 text-slate-700' },
  submitted: { label: 'Entregado',   color: 'bg-amber-100 text-amber-800' },
  graded:    { label: 'Calificado',  color: 'bg-green-100 text-green-700' },
};

const EMPTY_FORM = {
  subject_name: 'Español', month: new Date().getMonth() + 1,
  title: '', description: '', assigned_date: '', due_date: '',
  submitted_date: '', score: '', status: 'pending', feedback: '',
};

export default function MonthlyAssignments({ studentId, studentName, schoolYear, canEdit = false }) {
  const { toast } = useToast();
  const year = schoolYear || ACTIVE_SCHOOL_YEAR;

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('monthly_assignments')
      .select('*')
      .eq('student_id', studentId)
      .eq('school_year', year)
      .order('month')
      .order('due_date');
    if (!error) setAssignments(data || []);
    setLoading(false);
  }, [studentId, year]);

  useEffect(() => { load(); }, [load]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      subject_name: a.subject_name,
      month: a.month,
      title: a.title,
      description: a.description || '',
      assigned_date: a.assigned_date || '',
      due_date: a.due_date || '',
      submitted_date: a.submitted_date || '',
      score: a.score !== null ? String(a.score) : '',
      status: a.status,
      feedback: a.feedback || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Falta el título', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      student_id: studentId,
      school_year: year,
      subject_name: form.subject_name,
      month: parseInt(form.month),
      title: form.title.trim(),
      description: form.description || null,
      assigned_date: form.assigned_date || null,
      due_date: form.due_date || null,
      submitted_date: form.submitted_date || null,
      score: form.score !== '' ? parseFloat(form.score) : null,
      status: form.status,
      feedback: form.feedback || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('monthly_assignments').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('monthly_assignments').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Asignación actualizada' : 'Asignación creada' });
      setShowModal(false);
      load();
    }
  };

  const filtered = filterSubject === 'all'
    ? assignments
    : assignments.filter(a => a.subject_name === filterSubject);

  const gradeColor = (score) => {
    if (score === null || score === undefined) return 'text-slate-400';
    if (score >= 96) return 'text-emerald-700 font-black';
    if (score >= 80) return 'text-blue-700 font-bold';
    if (score >= 70) return 'text-amber-700 font-bold';
    return 'text-red-700 font-bold';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterSubject('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterSubject === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Todas
          </button>
          {SUBJECTS.map(s => (
            <button
              key={s}
              onClick={() => setFilterSubject(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterSubject === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s}
            </button>
          ))}
        </div>
        {canEdit && (
          <button
            onClick={openNew}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva asignación
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">No hay asignaciones</p>
          {canEdit && <p className="text-sm mt-1">Haz clic en "Nueva asignación" para empezar.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Mes</th>
                <th className="px-4 py-3 text-left">Asignatura</th>
                <th className="px-4 py-3 text-left">Título</th>
                <th className="px-4 py-3 text-center">Vence</th>
                <th className="px-4 py-3 text-center">Nota</th>
                <th className="px-4 py-3 text-center">Estado</th>
                {canEdit && <th className="px-4 py-3 text-center">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(a => {
                const meta = STATUS_META[a.status] || STATUS_META.pending;
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-600 font-medium">{MONTH_NAMES[a.month]}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-xs">{a.subject_name}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">{a.title}</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-xs">{a.due_date || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm ${gradeColor(a.score)}`}>
                        {a.score !== null ? `${a.score}%` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${meta.color}`}>{meta.label}</span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => openEdit(a)} className="text-blue-600 hover:text-blue-800 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="font-black text-slate-800">{editingId ? 'Editar asignación' : 'Nueva asignación'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Asignatura</label>
                  <select className={INPUT} value={form.subject_name} onChange={set('subject_name')}>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Mes</label>
                  <select className={INPUT} value={form.month} onChange={set('month')}>
                    {MONTH_NAMES.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Título de la asignación *</label>
                <input className={INPUT} value={form.title} onChange={set('title')} placeholder="Ej. Redacción narrativa, Proyecto de arte…" />
              </div>
              <div>
                <label className={LABEL}>Descripción</label>
                <textarea rows={3} className={INPUT} value={form.description} onChange={set('description')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Fecha asignada</label>
                  <input type="date" className={INPUT} value={form.assigned_date} onChange={set('assigned_date')} />
                </div>
                <div>
                  <label className={LABEL}>Fecha límite</label>
                  <input type="date" className={INPUT} value={form.due_date} onChange={set('due_date')} />
                </div>
              </div>
              <hr className="border-slate-200" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL}>Estado</label>
                  <select className={INPUT} value={form.status} onChange={set('status')}>
                    <option value="pending">Pendiente</option>
                    <option value="submitted">Entregado</option>
                    <option value="graded">Calificado</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Fecha entrega</label>
                  <input type="date" className={INPUT} value={form.submitted_date} onChange={set('submitted_date')} />
                </div>
                <div>
                  <label className={LABEL}>Nota (0–100)</label>
                  <input type="number" min="0" max="100" step="0.01" className={INPUT} value={form.score} onChange={set('score')} placeholder="—" />
                </div>
              </div>
              <div>
                <label className={LABEL}>Retroalimentación</label>
                <textarea rows={3} className={INPUT} value={form.feedback} onChange={set('feedback')} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 text-sm font-bold hover:text-slate-800">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
