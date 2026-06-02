/**
 * PaceProjectionTable.jsx
 * Proyección anual de evaluaciones con:
 *  - Agrupación Core A.C.E. / Extensión Local / Life Skills
 *  - Autoproyección: secuencia regular y modo Gaps/refuerzo
 *  - División automática por trimestre
 *  - Columna P5 expandida para mostrar >5 evaluaciones por trimestre
 *  - pages_per_day por evaluación
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2, Pencil, Trash2, X, CheckCircle2, AlertTriangle, Wand2 } from 'lucide-react';

const INPUT = 'w-full p-1.5 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 text-xs';

// ── Agrupación institucional ───────────────────────────────────────────────
const SUBJECT_GROUP_ORDER = [
  'Core A.C.E.',
  'Extensión Local',
  'Life Skills / Desarrollo Integral',
];
const SUBJECT_GROUP_KEYWORDS = {
  'Core A.C.E.': ['math', 'english', 'word building', 'science', 'social studies', 'bible'],
  'Extensión Local': ['lengua', 'castellana', 'local history', 'local geography',
    'historia local', 'geografía local', 'geografía', 'extension local', 'extensión local', 'spanish'],
  'Life Skills / Desarrollo Integral': ['art', 'music', 'technology',
    'physical education', 'life skills', 'p.e.', 'ed. física', 'educación física', 'tecnología'],
};
const SUBJECT_GROUP_COLORS = {
  'Core A.C.E.':                      'bg-[#193D6D] text-white',
  'Extensión Local':                   'bg-[#20B2AA] text-white',
  'Life Skills / Desarrollo Integral': 'bg-amber-600 text-white',
};
const PAGES_DEFAULTS = {
  'Core A.C.E.':                      '3–5',
  'Extensión Local':                   '1–2',
  'Life Skills / Desarrollo Integral': '1 actividad',
};

function getSubjectGroup(subjectName) {
  const lower = (subjectName || '').toLowerCase().trim();
  for (const group of SUBJECT_GROUP_ORDER) {
    if (SUBJECT_GROUP_KEYWORDS[group].some((kw) => lower.includes(kw))) return group;
  }
  return 'Core A.C.E.';
}

// ── Split automático en trimestres ────────────────────────────────────────
// Regla: base = floor(n/3), rem = n%3
//   Q1 = base, Q2 = base+(rem>=2?1:0), Q3 = base+(rem>=1?1:0)
function splitIntoQuarters(count) {
  if (count <= 0) return { q1: 0, q2: 0, q3: 0 };
  const base = Math.floor(count / 3);
  const rem  = count % 3;
  return {
    q1: base,
    q2: base + (rem >= 2 ? 1 : 0),
    q3: base + (rem >= 1 ? 1 : 0),
  };
}

// ── Calcular fechas estimadas ─────────────────────────────────────────────
function calcDeliveryDates(numbers, startDateStr, frequency) {
  if (!startDateStr || frequency === 'none') return numbers.map(() => null);
  const freqDays = { weekly: 7, biweekly: 14, monthly: 30 };
  const step = freqDays[frequency] || 14;
  const dates = [];
  let current = new Date(startDateStr);
  numbers.forEach(() => {
    dates.push(current.toISOString().split('T')[0]);
    current = new Date(current.getTime() + step * 86400000);
  });
  return dates;
}

const EMPTY_FORM = {
  subject_name: '', pace_number: '', quarter: 'Q1', pace_type: 'advance',
  status: 'pending', grade_obtained: '',
  estimated_start_date: '', estimated_delivery_date: '', projected_completion_date: '',
  pages_per_day: '', tutor_notes: '', coordinator_notes: '',
};

const EMPTY_AUTO = {
  subject_name:  '',
  mode:          'sequence',  // 'sequence' | 'gaps'
  start_num:     '',
  end_num:       '',
  quantity:      '',
  gaps_list:     '',
  split:         true,        // auto-split in Q1/Q2/Q3
  single_quarter:'Q1',        // used when split=false
  pages_per_day: '',
  start_date:    '',
  frequency:     'biweekly',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function PaceProjectionTable({ peiId, studentId, schoolYear, canEdit = false }) {
  const { toast } = useToast();
  const [paces,      setPaces]      = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  // Auto-proyección
  const [autoOpen,   setAutoOpen]   = useState(false);
  const [autoForm,   setAutoForm]   = useState(EMPTY_AUTO);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoPreview,setAutoPreview]= useState([]);    // [{quarter, pace_number}]

  // ── Carga ────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!peiId) { setLoading(false); return; }
    setLoading(true);
    try {
      const paceRes = await supabase
        .from('pei_pace_projections').select('*').eq('pei_id', peiId)
        .order('subject_name').order('quarter').order('pace_number');
      if (paceRes.error) throw paceRes.error;
      setPaces(paceRes.data || []);

      if (studentId) {
        const q = supabase.from('student_subjects')
          .select('id, subject_name, academic_block, school_year')
          .eq('student_id', studentId).order('subject_name', { ascending: true });
        if (schoolYear) q.eq('school_year', schoolYear);
        const { data, error } = await q;
        if (!error) {
          const seen = new Set();
          setSubjects((data || []).filter((s) => {
            const n = (s.subject_name || '').trim();
            if (!n || seen.has(n)) return false;
            seen.add(n); return true;
          }));
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[PaceProjectionTable]', err);
      toast({ title: 'Error al cargar evaluaciones', description: err?.message || 'Verifica permisos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peiId, studentId, schoolYear]);

  useEffect(() => { load(); }, [load]);

  // ── Matriz agrupada ───────────────────────────────────────────────────────
  const buildMatrix = () => {
    const map = {}, pagesMap = {};
    paces.forEach((p) => {
      if (!map[p.subject_name]) map[p.subject_name] = { Q1: [], Q2: [], Q3: [], lev: [] };
      if (p.pace_type === 'leveling') map[p.subject_name].lev.push(p);
      else if (map[p.subject_name][p.quarter]) map[p.subject_name][p.quarter].push(p);
      if (p.pages_per_day && !pagesMap[p.subject_name]) pagesMap[p.subject_name] = p.pages_per_day;
    });
    subjects.forEach((s) => { if (!map[s.subject_name]) map[s.subject_name] = { Q1: [], Q2: [], Q3: [], lev: [] }; });

    const allSubjects = [...new Set([...subjects.map((s) => s.subject_name), ...Object.keys(map)])];
    const grouped = {};
    SUBJECT_GROUP_ORDER.forEach((g) => { grouped[g] = []; });
    allSubjects.forEach((name) => grouped[getSubjectGroup(name)].push(name));

    const orderedItems = [];
    SUBJECT_GROUP_ORDER.forEach((group) => {
      if (grouped[group]?.length > 0) {
        orderedItems.push({ type: 'header', group });
        grouped[group].forEach((name) => orderedItems.push({ type: 'subject', name }));
      }
    });
    return { map, orderedItems, pagesMap };
  };

  const getAvg = (rows) => {
    const g = rows.filter((p) => p.grade_obtained != null);
    if (!g.length) return '—';
    return (g.reduce((s, p) => s + Number(p.grade_obtained), 0) / g.length).toFixed(0) + '%';
  };

  // ── Abrir modales ─────────────────────────────────────────────────────────
  const openNew = (subjectName = '', quarter = 'Q1', paceType = 'advance') => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, subject_name: subjectName, quarter, pace_type: paceType, school_year: schoolYear || '' });
    setModalOpen(true);
  };
  const openEdit = (pace) => {
    setEditing(pace);
    setForm({
      subject_name: pace.subject_name || '', pace_number: pace.pace_number != null ? String(pace.pace_number) : '',
      quarter: pace.quarter || 'Q1', pace_type: pace.pace_type || 'advance',
      status: pace.status || 'pending', grade_obtained: pace.grade_obtained != null ? String(pace.grade_obtained) : '',
      estimated_start_date: pace.estimated_start_date || '', estimated_delivery_date: pace.estimated_delivery_date || '',
      projected_completion_date: pace.projected_completion_date || '', pages_per_day: pace.pages_per_day || '',
      tutor_notes: pace.tutor_notes || '', coordinator_notes: pace.coordinator_notes || '',
    });
    setModalOpen(true);
  };

  // ── Guardar evaluación individual ─────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!peiId || !studentId) return;
    setSaving(true);
    try {
      const payload = {
        pei_id: peiId, student_id: studentId, subject_name: form.subject_name.trim(),
        pace_number: parseInt(form.pace_number) || 0, quarter: form.quarter, pace_type: form.pace_type,
        school_year: schoolYear || '', status: form.status,
        grade_obtained: form.grade_obtained ? parseFloat(form.grade_obtained) : null,
        estimated_start_date: form.estimated_start_date || null,
        estimated_delivery_date: form.estimated_delivery_date || null,
        projected_completion_date: form.projected_completion_date || null,
        pages_per_day: form.pages_per_day || null,
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
      toast({ title: 'Evaluación guardada' });
      setModalOpen(false);
      await load();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta evaluación?')) return;
    try {
      const { error } = await supabase.from('pei_pace_projections').delete().eq('id', id);
      if (error) throw error;
      await load();
    } catch {
      toast({ title: 'Error', description: 'No se pudo eliminar.', variant: 'destructive' });
    }
  };

  // ── Generar números para auto-proyección ──────────────────────────────────
  const buildAutoNumbers = (af) => {
    if (af.mode === 'gaps') {
      return (af.gaps_list || '').split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);
    }
    const start = parseInt(af.start_num, 10);
    if (!Number.isFinite(start) || start <= 0) return [];
    const end = parseInt(af.end_num, 10);
    const qty = parseInt(af.quantity, 10);
    if (Number.isFinite(end) && end >= start) {
      const nums = [];
      for (let n = start; n <= end; n++) nums.push(n);
      return nums;
    }
    if (Number.isFinite(qty) && qty > 0) {
      const nums = [];
      for (let i = 0; i < qty; i++) nums.push(start + i);
      return nums;
    }
    return [];
  };

  // Regenerar preview cuando cambia el form de auto
  useEffect(() => {
    const numbers = buildAutoNumbers(autoForm);
    if (!numbers.length) { setAutoPreview([]); return; }
    if (autoForm.split) {
      const { q1, q2, q3 } = splitIntoQuarters(numbers.length);
      const items = [];
      numbers.slice(0, q1).forEach((n) => items.push({ quarter: 'Q1', pace_number: n }));
      numbers.slice(q1, q1 + q2).forEach((n) => items.push({ quarter: 'Q2', pace_number: n }));
      numbers.slice(q1 + q2).forEach((n) => items.push({ quarter: 'Q3', pace_number: n }));
      setAutoPreview(items);
    } else {
      setAutoPreview(numbers.map((n) => ({ quarter: autoForm.single_quarter, pace_number: n })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoForm.mode, autoForm.start_num, autoForm.end_num, autoForm.quantity,
      autoForm.gaps_list, autoForm.split, autoForm.single_quarter]);

  // ── Ejecutar auto-proyección ──────────────────────────────────────────────
  const handleAutoProject = async () => {
    if (!peiId || !studentId) return;
    const subjectName = autoForm.subject_name.trim();
    if (!subjectName) { toast({ title: 'Falta la asignatura', variant: 'destructive' }); return; }
    if (!autoPreview.length) { toast({ title: 'Sin evaluaciones para insertar', variant: 'destructive' }); return; }

    setAutoSaving(true);
    try {
      // Obtener proyecciones existentes para esta asignatura
      const { data: existing } = await supabase
        .from('pei_pace_projections').select('quarter, pace_number')
        .eq('pei_id', peiId).eq('student_id', studentId)
        .eq('school_year', schoolYear || '').eq('subject_name', subjectName);

      const existingSet = new Set((existing || []).map((p) => `${p.quarter}-${p.pace_number}`));
      const dates = calcDeliveryDates(
        autoPreview.map((p) => p.pace_number),
        autoForm.start_date,
        autoForm.frequency,
      );

      const toInsert = [];
      let skipped = 0;
      autoPreview.forEach((item, i) => {
        const key = `${item.quarter}-${item.pace_number}`;
        if (existingSet.has(key)) { skipped++; return; }
        toInsert.push({
          pei_id: peiId, student_id: studentId,
          subject_name: subjectName, school_year: schoolYear || '',
          quarter: item.quarter, pace_number: item.pace_number,
          pace_type: 'advance', status: 'pending',
          pages_per_day: autoForm.pages_per_day || null,
          estimated_delivery_date: dates[i] || null,
          updated_at: new Date().toISOString(),
        });
      });

      if (toInsert.length === 0) {
        toast({ title: 'Sin cambios', description: `Todas las evaluaciones ya existían (${skipped} omitidas).` });
        setAutoSaving(false);
        return;
      }

      // Insertar en lotes de 50
      for (let i = 0; i < toInsert.length; i += 50) {
        const batch = toInsert.slice(i, i + 50);
        const { error } = await supabase.from('pei_pace_projections').insert(batch);
        if (error) throw error;
      }

      const msg = skipped > 0
        ? `${toInsert.length} evaluaciones proyectadas. ${skipped} ya existían y se omitieron.`
        : `${toInsert.length} evaluaciones proyectadas correctamente.`;
      toast({ title: '✓ Autoproyección completada', description: msg });
      setAutoOpen(false);
      setAutoForm(EMPTY_AUTO);
      setAutoPreview([]);
      await load();
    } catch (err) {
      toast({ title: 'Error en autoproyección', description: err.message, variant: 'destructive' });
    } finally {
      setAutoSaving(false);
    }
  };

  // ── Render tabla ──────────────────────────────────────────────────────────
  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  const { map, orderedItems, pagesMap } = buildMatrix();
  const subjectCount = orderedItems.filter((it) => it.type === 'subject').length;

  const renderNiv = (levList, idx, subj) => {
    const p = levList[idx];
    if (p) return (
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
    if (canEdit) return <button onClick={() => openNew(subj, 'Q1', 'leveling')} className="text-[9px] text-slate-300 hover:text-amber-500">+ Niv</button>;
    return <span className="text-slate-300 text-[10px]">—</span>;
  };

  // Renderiza 4 slots fijos + 1 slot overflow (P1-P4 + P5 con todos los demás)
  const renderQCells = (list, quarter, subj, colorClass) => {
    const cells = [];
    // P1-P4: fijos
    for (let idx = 0; idx < 4; idx++) {
      const p = list[idx];
      cells.push(
        <td key={`${quarter}-${idx}`} className="px-2 py-2 border border-slate-200 text-center align-top">
          {p ? (
            <div className="flex items-center gap-0.5 group justify-center">
              <span className={`font-bold px-1 rounded ${p.grade_obtained != null ? 'text-emerald-700 bg-emerald-50' : colorClass}`}>{p.pace_number}</span>
              {canEdit && (
                <div className="hidden group-hover:flex gap-0.5">
                  <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-blue-600"><Pencil className="w-2.5 h-2.5" /></button>
                  <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-2.5 h-2.5" /></button>
                </div>
              )}
            </div>
          ) : canEdit && idx === list.length ? (
            <button onClick={() => openNew(subj, quarter)} className="text-slate-300 hover:text-blue-500">+</button>
          ) : (
            <span className="text-slate-200">—</span>
          )}
        </td>
      );
    }
    // P5+: columna de overflow — muestra el 5.º y todos los siguientes apilados
    const overflow = list.slice(4);
    cells.push(
      <td key={`${quarter}-overflow`} className="px-1 py-2 border border-slate-200 text-center align-top min-w-[28px]">
        <div className="flex flex-col gap-0.5 items-center">
          {overflow.map((p) => (
            <div key={p.id} className="flex items-center gap-0.5 group">
              <span className={`font-bold text-[9px] px-1 rounded ${p.grade_obtained != null ? 'text-emerald-700 bg-emerald-50' : colorClass}`}>{p.pace_number}</span>
              {canEdit && (
                <div className="hidden group-hover:flex gap-0.5">
                  <button onClick={() => openEdit(p)} className="p-0.5 text-slate-400 hover:text-blue-600"><Pencil className="w-2 h-2" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 className="w-2 h-2" /></button>
                </div>
              )}
            </div>
          ))}
          {canEdit && list.length < 5 && overflow.length === 0 && (
            <button onClick={() => openNew(subj, quarter)} className="text-slate-300 hover:text-blue-500 text-[9px]">+ Eval.</button>
          )}
          {canEdit && list.length >= 5 && (
            <button onClick={() => openNew(subj, quarter)} className="text-[9px] text-slate-300 hover:text-blue-500 leading-none mt-0.5">+</button>
          )}
        </div>
      </td>
    );
    return cells;
  };

  // Grupos de color por quarter
  const Q_COLORS = { Q1: 'text-blue-700 bg-blue-50', Q2: 'text-teal-700 bg-teal-50', Q3: 'text-blue-700 bg-blue-50' };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-bold text-slate-700 text-sm">Proyección anual de evaluaciones — {schoolYear}</h4>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setAutoForm(EMPTY_AUTO); setAutoPreview([]); setAutoOpen(true); }}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#193D6D] hover:bg-[#142d5a] text-white rounded-lg text-xs font-bold"
            >
              <Wand2 className="w-3 h-3" /> Autoproyectar
            </button>
            <button
              onClick={() => openNew()}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300"
            >
              <Plus className="w-3 h-3" /> Añadir evaluación
            </button>
          </div>
        )}
      </div>

      {subjectCount === 0 ? (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-amber-800">No hay evaluaciones proyectadas. {canEdit ? 'Use "Autoproyectar" para generar una secuencia o "Añadir evaluación" para entrada individual.' : ''}</p>
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
                {['P1','P2','P3','P4','P5+','P1','P2','P3','P4','P5+','P1','P2','P3','P4','P5+'].map((p, i) => (
                  <th key={i} className={`px-2 py-1.5 border border-slate-200 text-center font-bold ${p === 'P5+' ? 'text-slate-400' : ''}`}>{p}</th>
                ))}
                <th className="px-2 py-1.5 border border-slate-200 text-center"></th>
                <th className="px-2 py-1.5 border border-slate-200 text-center"></th>
                <th className="px-2 py-1.5 border border-slate-200 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let subjIdx = 0;
                return orderedItems.map((item) => {
                  if (item.type === 'header') {
                    return (
                      <tr key={`hdr-${item.group}`}>
                        <td colSpan={19} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border border-slate-200 ${SUBJECT_GROUP_COLORS[item.group]}`}>
                          {item.group}
                        </td>
                      </tr>
                    );
                  }
                  const subj = item.name;
                  const d    = map[subj];
                  const rowClass  = subjIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50';
                  const pagesHint = pagesMap[subj];
                  subjIdx++;
                  return (
                    <tr key={subj} className={rowClass}>
                      <td className="px-3 py-2 border border-slate-200 whitespace-nowrap">
                        <span className="font-bold text-[#193D6D] text-[10px]">{subj}</span>
                        {pagesHint && (
                          <span className="block text-[8px] text-slate-400 font-normal mt-0.5">{pagesHint} pág/día</span>
                        )}
                      </td>
                      {renderQCells(d.Q1, 'Q1', subj, Q_COLORS.Q1)}
                      {renderQCells(d.Q2, 'Q2', subj, Q_COLORS.Q2)}
                      {renderQCells(d.Q3, 'Q3', subj, Q_COLORS.Q3)}
                      <td className="px-2 py-2 border border-amber-100 bg-amber-50 text-center align-top">{renderNiv(d.lev, 0, subj)}</td>
                      <td className="px-2 py-2 border border-amber-100 bg-amber-50 text-center align-top">{renderNiv(d.lev, 1, subj)}</td>
                      <td className="px-2 py-2 border border-slate-200 text-center font-bold text-slate-700 bg-slate-50 align-top">
                        {getAvg([...d.Q1, ...d.Q2, ...d.Q3])}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: añadir/editar evaluación individual ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">{editing ? 'Editar evaluación' : 'Nueva evaluación proyectada'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Materia *</label>
                  <input list="subj-list" required type="text" value={form.subject_name}
                    onChange={e => setForm(f => ({...f, subject_name: e.target.value}))}
                    className={INPUT} placeholder="Math, English, Science…" />
                  <datalist id="subj-list">
                    {subjects.map(s => <option key={s.id || s.subject_name} value={s.subject_name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">N.º Evaluación *</label>
                  <input required type="number" min="1" value={form.pace_number}
                    onChange={e => setForm(f => ({...f, pace_number: e.target.value}))}
                    className={INPUT} placeholder="1083" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Trimestre</label>
                  <select value={form.quarter} onChange={e => setForm(f => ({...f, quarter: e.target.value}))} className={INPUT}>
                    <option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo</label>
                  <select value={form.pace_type} onChange={e => setForm(f => ({...f, pace_type: e.target.value}))} className={INPUT}>
                    <option value="advance">Avance</option><option value="leveling">Nivelación</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className={INPUT}>
                    <option value="pending">Pendiente</option><option value="in_progress">En progreso</option>
                    <option value="delivered">Entregado</option><option value="evaluated">Evaluado</option>
                    <option value="delayed">Retrasado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Páginas por día</label>
                  <input type="text" value={form.pages_per_day}
                    onChange={e => setForm(f => ({...f, pages_per_day: e.target.value}))}
                    className={INPUT} placeholder={PAGES_DEFAULTS[getSubjectGroup(form.subject_name)]} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fecha entrega est.</label>
                  <input type="date" value={form.estimated_delivery_date}
                    onChange={e => setForm(f => ({...f, estimated_delivery_date: e.target.value}))} className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Bloque</label>
                  <input readOnly value={getSubjectGroup(form.subject_name)}
                    className={INPUT + ' bg-slate-100 cursor-default text-slate-500'} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Notas</label>
                  <textarea rows={2} value={form.tutor_notes}
                    onChange={e => setForm(f => ({...f, tutor_notes: e.target.value}))}
                    className={INPUT + ' resize-none'} placeholder="Observaciones del tutor…" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-sm">Cancelar</button>
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

      {/* ── Modal: Autoproyectar ── */}
      {autoOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 sticky top-0 bg-white">
              <div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-[#193D6D]" /> Autoproyectar evaluaciones
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Use <strong>Secuencia regular</strong> para avance continuo.
                  Use <strong>Gaps/refuerzo</strong> cuando el diagnóstico indicó números específicos no consecutivos.
                </p>
              </div>
              <button onClick={() => setAutoOpen(false)} className="text-slate-400 hover:text-slate-600 ml-4 shrink-0"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Asignatura */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Asignatura *</label>
                <input list="auto-subj-list" type="text"
                  value={autoForm.subject_name}
                  onChange={e => setAutoForm(f => ({
                    ...f, subject_name: e.target.value,
                    pages_per_day: f.pages_per_day || PAGES_DEFAULTS[getSubjectGroup(e.target.value)] || '',
                  }))}
                  className={INPUT} placeholder="Math, English, Word Building…" />
                <datalist id="auto-subj-list">
                  {subjects.map(s => <option key={s.subject_name} value={s.subject_name} />)}
                </datalist>
                {autoForm.subject_name && (
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Grupo: <strong>{getSubjectGroup(autoForm.subject_name)}</strong>
                  </p>
                )}
              </div>

              {/* Modo */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Modo</label>
                <div className="flex gap-2">
                  {[{v:'sequence', l:'Secuencia regular'},{v:'gaps', l:'Gaps / refuerzo específico'}].map(({v, l}) => (
                    <button key={v} type="button"
                      onClick={() => setAutoForm(f => ({...f, mode: v}))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${autoForm.mode === v ? 'border-[#193D6D] bg-blue-50 text-[#193D6D]' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secuencia regular */}
              {autoForm.mode === 'sequence' && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Número inicial *</label>
                      <input type="number" min="1" value={autoForm.start_num}
                        onChange={e => setAutoForm(f => ({...f, start_num: e.target.value}))}
                        className={INPUT} placeholder="1073" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Número final</label>
                      <input type="number" min="1" value={autoForm.end_num}
                        onChange={e => setAutoForm(f => ({...f, end_num: e.target.value, quantity: ''}))}
                        className={INPUT} placeholder="1087" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">— o —</span>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Cantidad de evaluaciones</label>
                      <input type="number" min="1" value={autoForm.quantity}
                        onChange={e => setAutoForm(f => ({...f, quantity: e.target.value, end_num: ''}))}
                        className={INPUT} placeholder="15" />
                    </div>
                  </div>
                </div>
              )}

              {/* Gaps */}
              {autoForm.mode === 'gaps' && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Números específicos (separados por comas) *
                  </label>
                  <input type="text" value={autoForm.gaps_list}
                    onChange={e => setAutoForm(f => ({...f, gaps_list: e.target.value}))}
                    className={INPUT} placeholder="1036, 1040, 1043" />
                  <p className="text-[9px] text-slate-400 mt-1">
                    Solo se insertarán exactamente esos números, sin generar intermedios.
                  </p>
                </div>
              )}

              {/* División trimestral */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">División trimestral</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setAutoForm(f => ({...f, split: true}))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${autoForm.split ? 'border-[#193D6D] bg-blue-50 text-[#193D6D]' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                    Automática (Q1/Q2/Q3)
                  </button>
                  <button type="button"
                    onClick={() => setAutoForm(f => ({...f, split: false}))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${!autoForm.split ? 'border-[#193D6D] bg-blue-50 text-[#193D6D]' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                    Un trimestre
                  </button>
                </div>
                {!autoForm.split && (
                  <select value={autoForm.single_quarter}
                    onChange={e => setAutoForm(f => ({...f, single_quarter: e.target.value}))}
                    className={INPUT + ' mt-2'}>
                    <option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option>
                  </select>
                )}
              </div>

              {/* Páginas / frecuencia */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Páginas por día</label>
                  <input type="text" value={autoForm.pages_per_day}
                    onChange={e => setAutoForm(f => ({...f, pages_per_day: e.target.value}))}
                    className={INPUT} placeholder={PAGES_DEFAULTS[getSubjectGroup(autoForm.subject_name)] || '3–5'} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Frecuencia estimada</label>
                  <select value={autoForm.frequency}
                    onChange={e => setAutoForm(f => ({...f, frequency: e.target.value}))} className={INPUT}>
                    <option value="weekly">Semanal (cada 7 días)</option>
                    <option value="biweekly">Cada 2 semanas</option>
                    <option value="monthly">Mensual</option>
                    <option value="none">Sin fecha</option>
                  </select>
                </div>
              </div>
              {autoForm.frequency !== 'none' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Fecha de entrega inicial est.</label>
                  <input type="date" value={autoForm.start_date}
                    onChange={e => setAutoForm(f => ({...f, start_date: e.target.value}))} className={INPUT} />
                </div>
              )}

              {/* Preview */}
              {autoPreview.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-xs font-black text-emerald-800 mb-2">
                    Preview — {autoPreview.length} evaluaciones a generar:
                  </p>
                  {['Q1','Q2','Q3'].map((q) => {
                    const qItems = autoPreview.filter((p) => p.quarter === q);
                    if (!qItems.length) return null;
                    return (
                      <p key={q} className="text-[10px] text-emerald-700 font-bold">
                        {q}: {qItems.map((p) => p.pace_number).join(', ')}
                      </p>
                    );
                  })}
                </div>
              )}

              {autoPreview.length === 0 && (autoForm.start_num || autoForm.gaps_list) && (
                <p className="text-xs text-amber-700 font-bold bg-amber-50 p-3 rounded-xl">
                  Sin números para proyectar. Verifica los campos de número inicial/final o la lista de gaps.
                </p>
              )}
            </div>

            <div className="flex gap-3 p-5 pt-0">
              <button type="button" onClick={() => setAutoOpen(false)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="button" disabled={autoSaving || autoPreview.length === 0}
                onClick={handleAutoProject}
                className="flex-1 py-2.5 bg-[#193D6D] hover:bg-[#142d5a] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {autoSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {autoSaving ? 'Proyectando…' : `Generar ${autoPreview.length} evaluaciones`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
