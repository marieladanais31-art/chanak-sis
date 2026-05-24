import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  FileCheck, Plus, X, Save, Search, Edit2,
  Loader2, RefreshCw, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// ── Constantes ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = '2025-2026';

const ENROLLMENT_STATUS_META = {
  lead:                { label: 'Lead',                cls: 'bg-slate-100 text-slate-600' },
  application_started: { label: 'Solicitud iniciada', cls: 'bg-yellow-100 text-yellow-700' },
  documents_pending:   { label: 'Docs. pendientes',   cls: 'bg-orange-100 text-orange-700' },
  contract_sent:       { label: 'Contrato enviado',   cls: 'bg-blue-100 text-blue-700' },
  contract_signed:     { label: 'Contrato firmado',   cls: 'bg-indigo-100 text-indigo-700' },
  payment_pending:     { label: 'Pago pendiente',     cls: 'bg-amber-100 text-amber-700' },
  enrolled:            { label: 'Matriculado',        cls: 'bg-emerald-100 text-emerald-700' },
  active:              { label: 'Activo',             cls: 'bg-green-100 text-green-700' },
  paused:              { label: 'En pausa',           cls: 'bg-purple-100 text-purple-700' },
  withdrawn:           { label: 'Retirado',           cls: 'bg-red-100 text-red-700' },
};

const PAYMENT_STATUS_META = {
  pending:     { label: 'Pendiente',   cls: 'bg-amber-100 text-amber-700' },
  paid:        { label: 'Pagado',      cls: 'bg-emerald-100 text-emerald-700' },
  partial:     { label: 'Parcial',     cls: 'bg-yellow-100 text-yellow-700' },
  waived:      { label: 'Exonerado',   cls: 'bg-purple-100 text-purple-700' },
  scholarship: { label: 'Beca',        cls: 'bg-blue-100 text-blue-700' },
};

const STATUS_ORDER = [
  'lead','application_started','documents_pending',
  'contract_sent','contract_signed','payment_pending',
  'enrolled','active','paused','withdrawn',
];

const EMPTY_FORM = {
  student_id:        '',
  school_year:       CURRENT_YEAR,
  program:           'Off-Campus',
  grade_level:       '',
  enrollment_status: 'lead',
  payment_status:    'pending',
  notes:             '',
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function AdminEnrollmentRecords() {
  const { toast } = useToast();
  const { authUser } = useAuth();

  const [records,  setRecords]  = useState([]);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  // Filtros
  const [yearFilter,   setYearFilter]   = useState(CURRENT_YEAR);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText,   setSearchText]   = useState('');

  // Modal
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);

  // ── Carga ─────────────────────────────────────────────────────────────────

  const loadStudents = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .order('last_name');
    setStudents(data || []);
  }, []);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('enrollment_records')
        .select(`
          id, student_id, school_year, program, grade_level,
          enrollment_status, payment_status,
          matricula_paid_at, activated_at, notes,
          created_at, updated_at,
          students(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (yearFilter)   q = q.eq('school_year', yearFilter);
      if (statusFilter) q = q.eq('enrollment_status', statusFilter);

      const { data, error } = await q;
      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('AdminEnrollmentRecords load error:', err);
      toast({ title: 'Error', description: 'No se pudo cargar los registros de matrícula.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [yearFilter, statusFilter, toast]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { loadRecords();  }, [loadRecords]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const counts = records.reduce((acc, r) => {
    acc[r.enrollment_status] = (acc[r.enrollment_status] || 0) + 1;
    return acc;
  }, {});

  const activeCount   = (counts.enrolled || 0) + (counts.active || 0);
  const pendingCount  = (counts.payment_pending || 0) + (counts.contract_signed || 0);
  const leadCount     = (counts.lead || 0) + (counts.application_started || 0);

  // ── Filtro client-side ────────────────────────────────────────────────────

  const visible = records.filter((r) => {
    if (!searchText.trim()) return true;
    const name = r.students
      ? `${r.students.first_name} ${r.students.last_name}`.toLowerCase()
      : '';
    return name.includes(searchText.toLowerCase());
  });

  // ── Modal ─────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditTarget(r.id);
    setForm({
      student_id:        r.student_id || '',
      school_year:       r.school_year || CURRENT_YEAR,
      program:           r.program || 'Off-Campus',
      grade_level:       r.grade_level || '',
      enrollment_status: r.enrollment_status || 'lead',
      payment_status:    r.payment_status || 'pending',
      notes:             r.notes || '',
    });
    setShowModal(true);
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // ── Guardar ───────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.student_id) return;

    setSaving(true);
    try {
      const payload = {
        student_id:        form.student_id,
        school_year:       form.school_year,
        program:           form.program || null,
        grade_level:       form.grade_level || null,
        enrollment_status: form.enrollment_status,
        payment_status:    form.payment_status,
        notes:             form.notes || null,
        // Auto-completar activated_at si pasa a active/enrolled
        ...(
          (form.enrollment_status === 'active' || form.enrollment_status === 'enrolled')
            ? { activated_at: new Date().toISOString() }
            : {}
        ),
        ...(
          form.payment_status === 'paid'
            ? { matricula_paid_at: new Date().toISOString() }
            : {}
        ),
      };

      if (editTarget) {
        const { error } = await supabase
          .from('enrollment_records')
          .update(payload)
          .eq('id', editTarget);
        if (error) throw error;
        toast({ title: 'Matrícula actualizada', description: 'Los cambios fueron guardados.' });
      } else {
        const { error } = await supabase
          .from('enrollment_records')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Registro creado', description: 'El registro de matrícula fue creado.' });
      }

      setShowModal(false);
      loadRecords();
    } catch (err) {
      console.error('AdminEnrollmentRecords save error:', err);
      // Manejo del UNIQUE constraint (un registro por alumno/año)
      const msg = err.message?.includes('unique')
        ? 'Ya existe un registro de matrícula para este alumno en ese año escolar.'
        : err.message;
      toast({ title: 'Error al guardar', description: msg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Avanzar estado rápidamente ────────────────────────────────────────────

  const quickAdvance = async (r) => {
    const currentIdx = STATUS_ORDER.indexOf(r.enrollment_status);
    if (currentIdx < 0 || currentIdx >= STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[currentIdx + 1];
    try {
      const updates = { enrollment_status: nextStatus };
      if (nextStatus === 'active' || nextStatus === 'enrolled') {
        updates.activated_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('enrollment_records')
        .update(updates)
        .eq('id', r.id);
      if (error) throw error;
      toast({ title: 'Estado avanzado', description: `→ ${ENROLLMENT_STATUS_META[nextStatus]?.label}` });
      loadRecords();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Estado de Matrícula</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadRecords}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo registro
          </Button>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Activos / Matriculados', val: activeCount,  color: 'emerald' },
          { label: 'Pendientes de pago',     val: pendingCount, color: 'amber'   },
          { label: 'Leads / Prospecto',      val: leadCount,    color: 'slate'   },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-3xl font-black text-${color}-600`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar alumno..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los años</option>
          <option value="2024-2025">2024–2025</option>
          <option value="2025-2026">2025–2026</option>
          <option value="2026-2027">2026–2027</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ENROLLMENT_STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-3" />
            <span className="text-slate-600">Cargando registros...</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No hay registros de matrícula que coincidan con los filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Alumno</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Año</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Programa</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Estado matrícula</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Estado pago</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((r) => {
                  const enrollMeta  = ENROLLMENT_STATUS_META[r.enrollment_status] || ENROLLMENT_STATUS_META.lead;
                  const payMeta     = PAYMENT_STATUS_META[r.payment_status] || PAYMENT_STATUS_META.pending;
                  const studentName = r.students
                    ? `${r.students.first_name} ${r.students.last_name}`
                    : '—';
                  const canAdvance  = STATUS_ORDER.indexOf(r.enrollment_status) < STATUS_ORDER.length - 1;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{studentName}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{r.school_year}</td>
                      <td className="px-4 py-3 text-slate-600">{r.program || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${enrollMeta.cls}`}>
                          {enrollMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${payMeta.cls}`}>
                          {payMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {canAdvance && (
                            <button
                              onClick={() => quickAdvance(r)}
                              className="px-2 py-1 rounded text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-1"
                              title={`Avanzar a: ${ENROLLMENT_STATUS_META[STATUS_ORDER[STATUS_ORDER.indexOf(r.enrollment_status) + 1]]?.label}`}
                            >
                              <ChevronDown className="w-3 h-3 rotate-[-90deg]" /> Avanzar
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(r)}
                            className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
                            title="Editar registro"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                {editTarget ? 'Editar Matrícula' : 'Nuevo Registro de Matrícula'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">

              {/* Alumno */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alumno *</label>
                <select
                  required
                  value={form.student_id}
                  onChange={setField('student_id')}
                  disabled={!!editTarget}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                >
                  <option value="">Seleccionar alumno...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Año escolar */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Año escolar</label>
                  <select
                    value={form.school_year}
                    onChange={setField('school_year')}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="2024-2025">2024–2025</option>
                    <option value="2025-2026">2025–2026</option>
                    <option value="2026-2027">2026–2027</option>
                  </select>
                </div>

                {/* Programa */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Programa</label>
                  <select
                    value={form.program}
                    onChange={setField('program')}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Off-Campus">Off-Campus</option>
                    <option value="Dual Diploma">Dual Diploma</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                {/* Nivel */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nivel / Grado</label>
                  <input
                    type="text"
                    value={form.grade_level}
                    onChange={setField('grade_level')}
                    placeholder="Ej: 9th Grade"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Estado matrícula */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado de matrícula</label>
                  <select
                    value={form.enrollment_status}
                    onChange={setField('enrollment_status')}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(ENROLLMENT_STATUS_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                {/* Estado pago */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado de pago (matrícula)</label>
                  <select
                    value={form.payment_status}
                    onChange={setField('payment_status')}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(PAYMENT_STATUS_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={setField('notes')}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Observaciones del proceso de matrícula..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1 font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {saving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editTarget ? 'Guardar cambios' : 'Crear registro'}
                      </>
                    )
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
