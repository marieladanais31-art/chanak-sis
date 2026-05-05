import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, Plus, Save, Loader2, CheckCircle, Archive, FileEdit } from 'lucide-react';
import { ACADEMIC_YEARS } from '@/lib/academicUtils';

const INPUT = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const LABEL = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const DEFAULT_CALENDAR = {
  academic_year: '2025-2026',
  start_date: '2025-09-01',
  end_date: '2026-07-17',
  q1_start_date: '2025-09-01',
  q1_end_date: '2025-12-19',
  q2_start_date: '2026-01-12',
  q2_end_date: '2026-04-03',
  q3_start_date: '2026-04-20',
  q3_end_date: '2026-07-17',
  break_notes: '',
  status: 'draft',
};

const STATUS_LABELS = {
  draft:    { label: 'Borrador',  color: 'bg-slate-100 text-slate-600' },
  active:   { label: 'Activo',    color: 'bg-green-100 text-green-700' },
  archived: { label: 'Archivado', color: 'bg-amber-100 text-amber-700' },
};

/** Formatea fecha ISO → DD/MM/YYYY para mostrar en la lista */
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function AcademicCalendarManager() {
  const { toast } = useToast();
  const [calendars, setCalendars]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [editing, setEditing]       = useState(null); // id UUID when editing existing row
  const [form, setForm]             = useState(DEFAULT_CALENDAR);
  const [showForm, setShowForm]     = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('academic_calendars')
      .select('*')
      .order('academic_year', { ascending: false });
    if (error) {
      toast({ title: 'Error cargando calendarios', description: error.message, variant: 'destructive' });
      setCalendars([]);
    } else {
      setCalendars(data || []);
    }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...DEFAULT_CALENDAR, status: 'draft' });
    setShowForm(true);
  };

  const openEdit = (cal) => {
    setEditing(cal.id);
    setForm({
      academic_year:  cal.academic_year  || '',
      start_date:     cal.start_date     || '',
      end_date:       cal.end_date       || '',
      q1_start_date:  cal.q1_start_date  || '',
      q1_end_date:    cal.q1_end_date    || '',
      q2_start_date:  cal.q2_start_date  || '',
      q2_end_date:    cal.q2_end_date    || '',
      q3_start_date:  cal.q3_start_date  || '',
      q3_end_date:    cal.q3_end_date    || '',
      break_notes:    cal.break_notes    || '',
      status:         cal.status         || 'draft',
    });
    setShowForm(true);
  };

  // ── Save (upsert por academic_year para nuevos; update por id para edición) ──
  const handleSave = async () => {
    if (!form.academic_year) {
      toast({ title: 'Año académico requerido', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const payload = {
      academic_year:  form.academic_year,
      start_date:     form.start_date     || null,
      end_date:       form.end_date       || null,
      q1_start_date:  form.q1_start_date  || null,
      q1_end_date:    form.q1_end_date    || null,
      q2_start_date:  form.q2_start_date  || null,
      q2_end_date:    form.q2_end_date    || null,
      q3_start_date:  form.q3_start_date  || null,
      q3_end_date:    form.q3_end_date    || null,
      break_notes:    form.break_notes    || null,
      status:         form.status,
      updated_at:     new Date().toISOString(),
    };

    let error;

    if (editing) {
      // Editar fila existente por id
      ({ error } = await supabase
        .from('academic_calendars')
        .update(payload)
        .eq('id', editing));
    } else {
      // Crear o actualizar si academic_year ya existe (upsert)
      ({ error } = await supabase
        .from('academic_calendars')
        .upsert(payload, { onConflict: 'academic_year', ignoreDuplicates: false }));
    }

    setSaving(false);

    if (error) {
      toast({
        title: 'Error al guardar',
        description: `${error.message}${error.code ? ` (${error.code})` : ''}`,
        variant: 'destructive',
      });
    } else {
      toast({ title: editing ? 'Calendario actualizado ✓' : 'Calendario guardado ✓' });
      setShowForm(false);
      setEditing(null);
      load();
    }
  };

  // ── Cambio rápido de estado (Activar / Archivar) ──────────────────────────
  const setStatus = async (id, status) => {
    const { error } = await supabase
      .from('academic_calendars')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      load();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-black text-slate-800">Calendario Escolar</h2>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Año Académico
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6 space-y-5">
          <h3 className="font-black text-slate-800 text-base">
            {editing ? 'Editar Calendario' : 'Nuevo Calendario'}
          </h3>

          {/* Año + rango global */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={LABEL}>Año académico</label>
              <select
                className={INPUT}
                value={form.academic_year}
                onChange={set('academic_year')}
                disabled={!!editing} // al editar no cambiar el año (es la PK)
              >
                {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {!editing && (
                <p className="text-xs text-slate-400 mt-1">
                  Si el año ya existe, se actualizará.
                </p>
              )}
            </div>
            <div>
              <label className={LABEL}>Inicio del año</label>
              <input type="date" className={INPUT} value={form.start_date} onChange={set('start_date')} />
            </div>
            <div>
              <label className={LABEL}>Fin del año</label>
              <input type="date" className={INPUT} value={form.end_date} onChange={set('end_date')} />
            </div>
          </div>

          {/* Quarters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="col-span-full text-xs font-black text-slate-500 uppercase tracking-wider">
              Períodos académicos (Quarters)
            </p>
            {[
              { q: 'Q1', sf: 'q1_start_date', ef: 'q1_end_date' },
              { q: 'Q2', sf: 'q2_start_date', ef: 'q2_end_date' },
              { q: 'Q3', sf: 'q3_start_date', ef: 'q3_end_date' },
            ].map(({ q, sf, ef }) => (
              <div key={q} className="space-y-2">
                <p className="text-xs font-black text-blue-700 uppercase">{q}</p>
                <div>
                  <label className={LABEL}>Inicio {q}</label>
                  <input type="date" className={INPUT} value={form[sf]} onChange={set(sf)} />
                </div>
                <div>
                  <label className={LABEL}>Fin {q}</label>
                  <input type="date" className={INPUT} value={form[ef]} onChange={set(ef)} />
                </div>
              </div>
            ))}
          </div>

          {/* Estado + notas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Estado</label>
              <select className={INPUT} value={form.status} onChange={set('status')}>
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>Notas / Vacaciones</label>
              <input
                className={INPUT}
                placeholder="Semana Santa, Navidad, festivos…"
                value={form.break_notes}
                onChange={set('break_notes')}
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-60"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de calendarios */}
      {loading ? (
        <div className="flex justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : calendars.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-bold">Sin calendarios configurados</p>
          <p className="text-sm mt-1">Pulsa "Nuevo Año Académico" para crear el primero.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {calendars.map(cal => {
            const st = STATUS_LABELS[cal.status] || STATUS_LABELS.draft;
            return (
              <div key={cal.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                {/* Cabecera fila */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    <h3 className="font-black text-slate-800 text-lg">{cal.academic_year}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(cal)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      <FileEdit className="w-3.5 h-3.5" /> Editar
                    </button>
                    {cal.status !== 'active' && (
                      <button
                        onClick={() => setStatus(cal.id, 'active')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-bold text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Activar
                      </button>
                    )}
                    {cal.status === 'active' && (
                      <button
                        onClick={() => setStatus(cal.id, 'archived')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-100"
                      >
                        <Archive className="w-3.5 h-3.5" /> Archivar
                      </button>
                    )}
                  </div>
                </div>

                {/* Fechas en grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">Año escolar</p>
                    <p className="text-slate-700">{fmtDate(cal.start_date)} → {fmtDate(cal.end_date)}</p>
                  </div>
                  {[
                    { label: 'Q1', start: cal.q1_start_date, end: cal.q1_end_date },
                    { label: 'Q2', start: cal.q2_start_date, end: cal.q2_end_date },
                    { label: 'Q3', start: cal.q3_start_date, end: cal.q3_end_date },
                  ].map(({ label, start, end }) => (
                    <div key={label} className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-bold text-blue-600 uppercase tracking-wider mb-1">{label}</p>
                      <p className="text-slate-700">{fmtDate(start)} → {fmtDate(end)}</p>
                    </div>
                  ))}
                </div>

                {cal.break_notes && (
                  <p className="mt-3 text-xs text-slate-500 italic">
                    <span className="font-bold not-italic text-slate-600">Vacaciones / Festivos: </span>
                    {cal.break_notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
