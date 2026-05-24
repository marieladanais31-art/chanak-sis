import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  DollarSign, CheckCircle2, AlertCircle, Clock,
  Plus, X, Save, Search, ExternalLink, Edit2,
  Loader2, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// ── Constantes ───────────────────────────────────────────────────────────────

const CURRENT_YEAR = '2025-2026';

const CONCEPT_LABELS = {
  matricula:             'Matrícula',
  paquete_curricular:    'Paquete curricular',
  mensualidad:           'Mensualidad',
  materiales_adicionales:'Materiales adicionales',
  evaluacion:            'Evaluación',
  otro:                  'Otro',
};

const STATUS_META = {
  pending:     { label: 'Pendiente',    cls: 'bg-amber-100 text-amber-700' },
  overdue:     { label: 'Vencido',      cls: 'bg-red-100 text-red-700' },
  paid:        { label: 'Pagado',       cls: 'bg-emerald-100 text-emerald-700' },
  scholarship: { label: 'Beca',         cls: 'bg-blue-100 text-blue-700' },
  waived:      { label: 'Exonerado',    cls: 'bg-purple-100 text-purple-700' },
  cancelled:   { label: 'Cancelado',    cls: 'bg-slate-100 text-slate-600' },
  refunded:    { label: 'Reembolsado',  cls: 'bg-orange-100 text-orange-700' },
};

const PRESET_AMOUNTS = {
  matricula:              250,
  paquete_curricular:     450,
  mensualidad:            150,
  materiales_adicionales:  80,
  evaluacion:              50,
  otro:                     0,
};

const EMPTY_FORM = {
  student_id:              '',
  school_year:             CURRENT_YEAR,
  concept:                 'mensualidad',
  amount:                  '',
  currency:                'EUR',
  status:                  'pending',
  due_date:                '',
  paid_at:                 '',
  stripe_payment_link_url: '',
  payment_method:          '',
  notes:                   '',
};

// ── Helpers de columnas legacy ────────────────────────────────────────────────

function deriveAmount(p) {
  if (p.amount != null && Number(p.amount) > 0)       return Number(p.amount);
  if (p.amount_cents != null && p.amount_cents > 0)   return p.amount_cents / 100;
  if (p.final_amount != null && Number(p.final_amount) > 0) return Number(p.final_amount);
  if (p.total_due    != null && Number(p.total_due)    > 0) return Number(p.total_due);
  return 0;
}

function deriveConcept(p) {
  if (p.concept && p.concept !== '') return p.concept;
  if (p.payment_type && p.payment_type !== '') return p.payment_type;
  return 'otro';
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function AdminPayments() {
  const { toast } = useToast();
  const { authUser } = useAuth();

  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // Filtros
  const [yearFilter,   setYearFilter]   = useState(CURRENT_YEAR);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchText,   setSearchText]   = useState('');

  // Modal
  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null); // null = crear
  const [form,        setForm]        = useState(EMPTY_FORM);

  // ── Carga de datos ──────────────────────────────────────────────────────────

  const loadStudents = useCallback(async () => {
    const { data } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .order('last_name');
    setStudents(data || []);
  }, []);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('student_payments')
        .select(`
          id, student_id, school_year,
          concept, payment_type,
          amount, amount_cents, final_amount, total_due,
          currency, status,
          due_date, paid_at,
          stripe_payment_link_url, payment_method, notes,
          created_at,
          students(id, first_name, last_name)
        `)
        .order('due_date', { ascending: false, nullsFirst: false });

      if (yearFilter)   q = q.eq('school_year', yearFilter);
      if (statusFilter) q = q.eq('status', statusFilter);

      const { data, error } = await q;
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('AdminPayments load error:', err);
      toast({ title: 'Error', description: 'No se pudo cargar la tabla de pagos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [yearFilter, statusFilter, toast]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { loadPayments(); }, [loadPayments]);

  // ── Stats de la vista actual ─────────────────────────────────────────────────

  const stats = payments.reduce(
    (acc, p) => {
      const amt = deriveAmount(p);
      if (p.status === 'paid' || p.status === 'scholarship' || p.status === 'waived') {
        acc.cobrado += amt;
      } else if (p.status === 'overdue') {
        acc.vencido += amt;
      } else {
        acc.pendiente += amt;
      }
      return acc;
    },
    { pendiente: 0, vencido: 0, cobrado: 0 }
  );

  // ── Filtro de texto (client-side) ────────────────────────────────────────────

  const visible = payments.filter((p) => {
    if (!searchText.trim()) return true;
    const name = p.students
      ? `${p.students.first_name} ${p.students.last_name}`.toLowerCase()
      : '';
    return name.includes(searchText.toLowerCase());
  });

  // ── Apertura de modal ────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditTarget(p.id);
    setForm({
      student_id:              p.student_id || '',
      school_year:             p.school_year || CURRENT_YEAR,
      concept:                 deriveConcept(p),
      amount:                  String(deriveAmount(p) || ''),
      currency:                p.currency || 'EUR',
      status:                  p.status || 'pending',
      due_date:                p.due_date || '',
      paid_at:                 p.paid_at ? p.paid_at.slice(0, 10) : '',
      stripe_payment_link_url: p.stripe_payment_link_url || '',
      payment_method:          p.payment_method || '',
      notes:                   p.notes || '',
    });
    setShowModal(true);
  };

  // ── Helpers de formulario ─────────────────────────────────────────────────

  const handleConceptChange = (concept) => {
    setForm((f) => ({
      ...f,
      concept,
      amount: f.amount === '' || Number(f.amount) === 0
        ? String(PRESET_AMOUNTS[concept] ?? '')
        : f.amount,
    }));
  };

  const handleStatusChange = (status) => {
    setForm((f) => ({
      ...f,
      status,
      paid_at: status === 'paid' && !f.paid_at
        ? new Date().toISOString().slice(0, 10)
        : f.paid_at,
    }));
  };

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // ── Guardar ───────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.amount) return;

    setSaving(true);
    try {
      // Normalizar campos nuevos y legacy para evitar NOT NULL constraint errors
      const normalizedConcept = form.concept || 'mensualidad';
      const normalizedAmount  = parseFloat(form.amount) || 0;
      const isPaidStatus      = ['paid', 'scholarship', 'waived'].includes(form.status);

      const payload = {
        // ── Campos nuevos ──
        student_id:              form.student_id,
        school_year:             form.school_year,
        concept:                 normalizedConcept,
        amount:                  normalizedAmount,
        currency:                form.currency || 'EUR',
        status:                  form.status,
        due_date:                form.due_date || null,
        paid_at:                 isPaidStatus
                                   ? (form.paid_at ? new Date(form.paid_at).toISOString() : null)
                                   : null,
        stripe_payment_link_url: form.stripe_payment_link_url || null,
        payment_method:          form.payment_method || null,
        notes:                   form.notes || null,
        updated_by:              authUser?.id || null,
        // ── Columnas legacy NOT NULL ──
        payment_type:            normalizedConcept,
        program_type:            'off_campus',
        amount_cents:            Math.round(normalizedAmount * 100),
        balance_status:          form.status || 'pending',
        final_amount:            normalizedAmount,
        total_due:               normalizedAmount,
      };

      if (editTarget) {
        const { error } = await supabase
          .from('student_payments')
          .update(payload)
          .eq('id', editTarget);
        if (error) throw error;
        toast({ title: 'Pago actualizado', description: 'Los cambios fueron guardados.' });
      } else {
        payload.created_by = authUser?.id || null;
        const { error } = await supabase
          .from('student_payments')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Pago registrado', description: 'El pago fue creado correctamente.' });
      }

      setShowModal(false);
      loadPayments();
    } catch (err) {
      console.error('AdminPayments save error:', err);
      toast({ title: 'Error al guardar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Acciones rápidas ──────────────────────────────────────────────────────

  const quickUpdate = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('student_payments')
        .update({ ...updates, updated_by: authUser?.id || null })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Estado actualizado' });
      loadPayments();
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  // ── Formato ───────────────────────────────────────────────────────────────

  const fmt = (n) => `€${Number(n).toFixed(2)}`;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-2xl font-bold text-slate-800">Registro de Pagos por Alumno</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadPayments} className="gap-2">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Nuevo Pago
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Pendiente', val: stats.pendiente, Icon: Clock,         color: 'amber'   },
          { label: 'Vencido',   val: stats.vencido,   Icon: AlertCircle,   color: 'red'     },
          { label: 'Cobrado',   val: stats.cobrado,   Icon: CheckCircle2,  color: 'emerald' },
        ].map(({ label, val, Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full bg-${color}-100 flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
              <p className={`text-xl font-black text-${color}-700`}>{fmt(val)}</p>
            </div>
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
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos los años</option>
          <option value="2024-2025">2024–2025</option>
          <option value="2025-2026">2025–2026</option>
          <option value="2026-2027">2026–2027</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-3" />
            <span className="text-slate-600">Cargando pagos...</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No hay pagos que coincidan con los filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Alumno</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Año</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Concepto</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Monto</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Estado</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Vence</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => {
                  const meta        = STATUS_META[p.status] || STATUS_META.pending;
                  const concept     = deriveConcept(p);
                  const amount      = deriveAmount(p);
                  const studentName = p.students
                    ? `${p.students.first_name} ${p.students.last_name}`
                    : '—';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{studentName}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{p.school_year || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{CONCEPT_LABELS[concept] || concept}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{fmt(amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${meta.cls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {p.due_date ? new Date(p.due_date).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {p.stripe_payment_link_url && (
                            <a
                              href={p.stripe_payment_link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50"
                              title="Abrir enlace de pago Stripe"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {p.status !== 'paid' && p.status !== 'scholarship' && (
                            <button
                              onClick={() => quickUpdate(p.id, {
                                status: 'paid',
                                paid_at: new Date().toISOString(),
                              })}
                              className="px-2 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              title="Marcar como pagado"
                            >
                              ✓ Pagar
                            </button>
                          )}
                          {p.status !== 'scholarship' && (
                            <button
                              onClick={() => quickUpdate(p.id, { status: 'scholarship' })}
                              className="px-2 py-1 rounded text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100"
                              title="Marcar como beca"
                            >
                              Beca
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded text-slate-500 hover:bg-slate-100"
                            title="Editar pago"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                {editTarget ? 'Editar Pago' : 'Registrar Pago'}
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
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
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
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="2024-2025">2024–2025</option>
                    <option value="2025-2026">2025–2026</option>
                    <option value="2026-2027">2026–2027</option>
                  </select>
                </div>

                {/* Concepto */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Concepto *</label>
                  <select
                    required
                    value={form.concept}
                    onChange={(e) => handleConceptChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(CONCEPT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Monto */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monto (€) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={setField('amount')}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(STATUS_META).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                {/* Fecha de vencimiento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={setField('due_date')}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Fecha de pago */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de pago</label>
                  <input
                    type="date"
                    value={form.paid_at}
                    onChange={setField('paid_at')}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Método de pago</label>
                <select
                  value={form.payment_method}
                  onChange={setField('payment_method')}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="bank_transfer">Transferencia bancaria</option>
                  <option value="stripe">Stripe (link)</option>
                  <option value="cash">Efectivo</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              {/* Stripe Payment Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stripe Payment Link <span className="font-normal text-slate-400">(pegar URL manual)</span>
                </label>
                <input
                  type="url"
                  value={form.stripe_payment_link_url}
                  onChange={setField('stripe_payment_link_url')}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="https://buy.stripe.com/..."
                />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas internas</label>
                <textarea
                  value={form.notes}
                  onChange={setField('notes')}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Ej: beca parcial aprobada por dirección"
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
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {saving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {editTarget ? 'Guardar cambios' : 'Registrar pago'}
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
