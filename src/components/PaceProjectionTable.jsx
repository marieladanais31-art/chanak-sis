/**
 * PaceProjectionTable.jsx
 * Vista institucional de la proyección anual de PACEs.
 * Muestra la tabla en formato: Materia | Q1(x5) | Q2(x5) | Q3(x5) | Niv1 | Niv2 | Prom
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Pencil, Trash2, X, CheckCircle2, AlertTriangle } from 'lucide-react';

const SUBJECTS_DEFAULT = ['Math', 'English', 'Word Building', 'Science', 'Social Studies'];

const INPUT = 'w-full p-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 text-xs';

const PACE_TYPE_LABELS = { advance: 'Avance', leveling: 'Nivelación' };

const EMPTY_FORM = {
  subject_name: '', pace_number: '', quarter: 'Q1', pace_type: 'advance',
  status: 'pending', grade_obtained: '', estimated_delivery_date: '',
};

export default function PaceProjectionTable({ peiId, studentId, schoolYear, canEdit = false }) {
  const { toast } = useToast();
  const [paces, setPaces]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);

  const load = useCallback(async () => {
    if (!peiId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pei_pace_projections')
        .select('*')
        .eq('pei_id', peiId)
        .order('subject_name').order('quarter').order('pace_number');
      if (error) throw error;
      setPaces(data || []);
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los PACEs.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [peiId]);

  useEffect(() => { load(); }, [load]);

  // ── Agrupar por materia ───────────────────────────────────────────────────
  const buildMatrix = () => {
    const map = {};
    paces.forEach(p => {
      if (!map[p.subject_name]) map[p.subject_name] = { Q1: [], Q2: [], Q3: [], lev: [] };
      if (p.pace_type === 'leveling') {
        map[p.subject_name].lev.push(p);
      } else {
        const q = p.quarter;
        if (map[p.subject_name][q]) map[p.subject_name][q].push(p);
      }
    });

    // Asegurar que las materias default aparecen primero
    const ordered = [...SUBJECTS_DEFAULT.filter(s => map[s]), ...Object.keys(map).filter(s => !SUBJECTS_DEFAULT.includes(s))];
    return { map, ordered };
  };

  const getAvg = (rows) => {
    const g = rows.filter(p => p.grade_obtained != null);
    if (!g.length) return '—';
    return (g.reduce((s, p) => s + Number(p.grade_obtained), 0) / g.length).toFixed(0) + '%';
  };

  const openNew = (subjectName = '', quarter = 'Q1', paceType = 'advance') => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, subject_name: subjectName, quarter, pace_type: paceType, school_year: schoolYear || '' });
    setModalOpen(true);
  };

  const openEdit = (pace) => {
    setEditing(pace);
    setForm({
      subject_name: pace.subject_name || '',
      pace_number: pace.pace_number != null ? String(pace.pace_number) : '',
      quarter: pace.quarter || 'Q1',
      pace_type: pace.pace_type || 'advance',
      status: pace.status || 'pending',
      grade_obtained: pace.grade_obtained != null ? String(pace.grade_obtained) : '',
      estimated_delivery_date: pace.estimated_delivery_date || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!peiId || !studentId) return;
    setSaving(true);
    try {
      const payload = {
        pei_id: peiId,
        student_id: studentId,
        subject_name: form.subject_name.trim(),
        pace_number: parseInt(form.pace_number) || 0,
        quarter: form.quarter,
        pace_type: form.pace_type,
        school_year: schoolYear || '',
        status: form.status,
        grade_obtained: form.grade_obtained ? parseFloat(form.grade_obtained) : null,
        estimated_delivery_date: form.estimated_delivery_date || null,
        updated_at: new Date().toISOString(),
      };
      if (editing) {
        const { error } = await supabase.from('pei_pace_projections').update(payload).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pei_pace_projections').insert([payload]);
        if (error) throw error;
      }
      toast({ title: 'PACE guardado' });
      setModalOpen(false);
      await load();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar.', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const { map, ordered } = buildMatrix();

  // ── Render celda de PACEs (hasta 5 slots) ─────────────────────────────────
  const renderSlots = (paceList, quarter, subj, maxSlots = 5) => {
    const slots = [...paceList.slice(0, maxSlots)];
    const empties = maxSlots - slots.length;

    return (
      <div className="flex flex-col gap-0.5">
        {slots.map(p => (
          <div key={p.id} className="flex items-center gap-1 group">
            <span className={`text-[10px] font-bold px-1 rounded ${p.grade_obtained != null ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'}`}>
              {p.pace_number}
            </span>
            {canEdit && (
              <div className="hidden group-hover:flex gap-0.5">
                <button onClick={() => openEdit(p)} className="p-0.5 text-slate-400 hover:text-blue-600"><Pencil className="w-2.5 h-2.5" /></button>
                <button onClick={() => handleDelete(p.id)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 className="w-2.5 h-2.5" /></button>
              </div>
            )}
          </div>
        ))}
        {canEdit && empties > 0 && (
          <button
            onClick={() => openNew(subj, quarter, 'advance')}
            className="text-[9px] text-slate-300 hover:text-blue-500 text-left leading-none mt-0.5"
          >
            + PACE
          </button>
        )}
      </div>
    );
  };

  const renderNiv = (levList, idx, subj) => {
    const p = levList[idx];
    if (p) {
      return (
        <div className="flex items-center gap-1 group">
          <span className="text-[10px] font-bold px-1 rounded text-amber-700 bg-amber-50">{p.pace_number}</span>
          {canEdit && (
            <div className="hidden group-hover:flex gap-0.5">
              <button onClick={() => openEdit(p)} className="p-0.5 text-slate-400 hover:text-blue-600"><Pencil className="w-2.5 h-2.5" /></button>
              <button onClick={() => handleDelete(p.id)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 className="w-2.5 h-2.5" /></button>
            </div>
          )}
        </div>
      );
    }
    if (canEdit) {
      return (
        <button onClick={() => openNew(subj, 'Q1', 'leveling')} className="text-[9px] text-slate-300 hover:text-amber-500">+ Niv</button>
      );
    }
    return <span className="text-slate-300 text-[10px]">—</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-700 text-sm">Proyección Anual de PACEs — {schoolYear}</h4>
        {canEdit && (
          <button
            onClick={() => openNew()}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
          >
            <Plus className="w-3 h-3" /> Añadir PACE
          </button>
        )}
      </div>

      {ordered.length === 0 ? (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800">No hay PACEs registrados. {canEdit ? 'Use el botón "Añadir PACE" para comenzar.' : ''}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="text-[10px] w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="bg-[#193D6D] text-white font-bold px-3 py-2 border border-[#193D6D] min-w-[100px]">Materia</th>
                <th colSpan={5} className="bg-[#193D6D] text-white font-bold px-2 py-2 text-center border border-[#193D6D]">Trimestre 1</th>
                <th colSpan={5} className="bg-[#20B2AA] text-white font-bold px-2 py-2 text-center border border-[#20B2AA]">Trimestre 2</th>
                <th colSpan={5} className="bg-[#193D6D] text-white font-bold px-2 py-2 text-center border border-[#193D6D]">Trimestre 3</th>
                <th className="bg-amber-600 text-white font-bold px-2 py-2 text-center border border-amber-600">Niv.1</th>
                <th className="bg-amber-600 text-white font-bold px-2 py-2 text-center border border-amber-600">Niv.2</th>
                <th className="bg-slate-700 text-white font-bold px-2 py-2 text-center border border-slate-700">Prom.</th>
              </tr>
              <tr className="bg-slate-100 text-slate-600">
                <th className="px-3 py-1.5 border border-slate-200"></th>
                {['P1','P2','P3','P4','P5','P1','P2','P3','P4','P5','P1','P2','P3','P4','P5'].map((p, i) => (
                  <th key={i} className="px-2 py-1.5 border border-slate-200 text-center font-bold">{p}</th>
                ))}
                <th className="px-2 py-1.5 border border-slate-200 text-center"></th>
                <th className="px-2 py-1.5 border border-slate-200 text-center"></th>
                <th className="px-2 py-1.5 border border-slate-200 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((subj, si) => {
                const d = map[subj];
                const allGraded = [...d.Q1, ...d.Q2, ...d.Q3];
                return (
                  <tr key={subj} className={si % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="px-3 py-2 font-bold text-[#193D6D] border border-slate-200 whitespace-nowrap">{subj}</td>
                    {/* Q1 - 5 slots */}
                    {[0,1,2,3,4].map(idx => (
                      <td key={`q1-${idx}`} className="px-2 py-2 border border-slate-200 text-center align-top">
                        {d.Q1[idx] ? (
                          <div className="flex items-center gap-0.5 group justify-center">
                            <span className={`font-bold px-1 rounded ${d.Q1[idx].grade_obtained != null ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'}`}>{d.Q1[idx].pace_number}</span>
                            {canEdit && (
                              <div className="hidden group-hover:flex gap-0.5">
                                <button onClick={() => openEdit(d.Q1[idx])} className="text-slate-400 hover:text-blue-600"><Pencil className="w-2.5 h-2.5" /></button>
                                <button onClick={() => handleDelete(d.Q1[idx].id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-2.5 h-2.5" /></button>
                              </div>
                            )}
                          </div>
                        ) : canEdit && idx === d.Q1.length ? (
                          <button onClick={() => openNew(subj, 'Q1')} className="text-slate-300 hover:text-blue-500">+</button>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                    ))}
                    {/* Q2 - 5 slots */}
                    {[0,1,2,3,4].map(idx => (
                      <td key={`q2-${idx}`} className="px-2 py-2 border border-slate-200 text-center align-top">
                        {d.Q2[idx] ? (
                          <div className="flex items-center gap-0.5 group justify-center">
                            <span className={`font-bold px-1 rounded ${d.Q2[idx].grade_obtained != null ? 'text-emerald-700 bg-emerald-50' : 'text-teal-700 bg-teal-50'}`}>{d.Q2[idx].pace_number}</span>
                            {canEdit && (
                              <div className="hidden group-hover:flex gap-0.5">
                                <button onClick={() => openEdit(d.Q2[idx])} className="text-slate-400 hover:text-blue-600"><Pencil className="w-2.5 h-2.5" /></button>
                                <button onClick={() => handleDelete(d.Q2[idx].id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-2.5 h-2.5" /></button>
                              </div>
                            )}
                          </div>
                        ) : canEdit && idx === d.Q2.length ? (
                          <button onClick={() => openNew(subj, 'Q2')} className="text-slate-300 hover:text-teal-500">+</button>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                    ))}
                    {/* Q3 - 5 slots */}
                    {[0,1,2,3,4].map(idx => (
                      <td key={`q3-${idx}`} className="px-2 py-2 border border-slate-200 text-center align-top">
                        {d.Q3[idx] ? (
                          <div className="flex items-center gap-0.5 group justify-center">
                            <span className={`font-bold px-1 rounded ${d.Q3[idx].grade_obtained != null ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'}`}>{d.Q3[idx].pace_number}</span>
                            {canEdit && (
                              <div className="hidden group-hover:flex gap-0.5">
                                <button onClick={() => openEdit(d.Q3[idx])} className="text-slate-400 hover:text-blue-600"><Pencil className="w-2.5 h-2.5" /></button>
                                <button onClick={() => handleDelete(d.Q3[idx].id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-2.5 h-2.5" /></button>
                              </div>
                            )}
                          </div>
                        ) : canEdit && idx === d.Q3.length ? (
                          <button onClick={() => openNew(subj, 'Q3')} className="text-slate-300 hover:text-blue-500">+</button>
                        ) : (
                          <span className="text-slate-200">—</span>
                        )}
                      </td>
                    ))}
                    {/* Nivelación */}
                    <td className="px-2 py-2 border border-amber-100 bg-amber-50 text-center align-top">
                      {renderNiv(d.lev, 0, subj)}
                    </td>
                    <td className="px-2 py-2 border border-amber-100 bg-amber-50 text-center align-top">
                      {renderNiv(d.lev, 1, subj)}
                    </td>
                    {/* Promedio */}
                    <td className="px-2 py-2 border border-slate-200 text-center font-bold text-slate-700 bg-slate-50 align-top">
                      {getAvg(allGraded)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal add/edit PACE */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{editing ? 'Editar PACE' : 'Nuevo PACE'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Materia *</label>
                  <input
                    list="subj-list" required type="text"
                    value={form.subject_name}
                    onChange={e => setForm(f => ({...f, subject_name: e.target.value}))}
                    className={INPUT} placeholder="Math, English, Science…"
                  />
                  <datalist id="subj-list">
                    {SUBJECTS_DEFAULT.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">PACE # *</label>
                  <input required type="number" min="1" value={form.pace_number}
                    onChange={e => setForm(f => ({...f, pace_number: e.target.value}))}
                    className={INPUT} placeholder="1083" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Trimestre</label>
                  <select value={form.quarter} onChange={e => setForm(f => ({...f, quarter: e.target.value}))} className={INPUT} disabled={form.pace_type === 'leveling'}>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo</label>
                  <select value={form.pace_type} onChange={e => setForm(f => ({...f, pace_type: e.target.value}))} className={INPUT}>
                    <option value="advance">Avance</option>
                    <option value="leveling">Nivelación</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className={INPUT}>
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En progreso</option>
                    <option value="delivered">Entregado</option>
                    <option value="evaluated">Evaluado</option>
                    <option value="delayed">Retrasado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nota (%)</label>
                  <input type="number" min="0" max="100" step="0.1" value={form.grade_obtained}
                    onChange={e => setForm(f => ({...f, grade_obtained: e.target.value}))}
                    className={INPUT} placeholder="0–100" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fecha entrega est.</label>
                  <input type="date" value={form.estimated_delivery_date}
                    onChange={e => setForm(f => ({...f, estimated_delivery_date: e.target.value}))}
                    className={INPUT} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
