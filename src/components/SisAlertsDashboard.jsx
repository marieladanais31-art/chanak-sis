import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  AlertTriangle, Clock, FileText, CheckCircle, RefreshCw,
  Loader2, Bell, ClipboardList, ScrollText, User, PlusCircle,
} from 'lucide-react';

/* ── severity meta ────────────────────────────────────────────── */
const SEV = {
  high:   { color: 'bg-red-50 text-red-800 border-red-200',       dot: 'bg-red-500',    label: 'Alta', db: 'critical' },
  medium: { color: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500',  label: 'Media', db: 'warning' },
  low:    { color: 'bg-blue-50 text-blue-800 border-blue-200',    dot: 'bg-blue-400',   label: 'Baja', db: 'info' },
};

const TYPE_ICON = {
  overdue_pace:        Clock,
  pending_pei:         FileText,
  pending_boletin:     ScrollText,
  pending_grades:      ClipboardList,
  revision_requested:  ClipboardList,
  no_tutor:            User,
  failing_grade:       AlertTriangle,
  general:             Bell,
};

const ROLE_FILTER_OPTIONS = [
  { key: 'all',         label: 'Todas' },
  { key: 'high',        label: 'Alta' },
  { key: 'medium',      label: 'Media' },
  { key: 'low',         label: 'Baja' },
];

/* ── helpers ──────────────────────────────────────────────────── */
function daysAgo(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

/**
 * SisAlertsDashboard
 * Props:
 *   - studentId?   : restrict to one student (tutor / parent view)
 *   - maxItems?    : cap on displayed alerts (default unlimited)
 *   - compact?     : hides description text
 */
export default function SisAlertsDashboard({ studentId, maxItems, compact = false }) {
  const { profile } = useAuth();
  const role = profile?.role || 'admin';

  const [alerts, setAlerts]       = useState([]);
  const [students, setStudents]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [savingAlert, setSavingAlert] = useState(false);
  const [severityFilter, setSev]  = useState('all');
  const [alertForm, setAlertForm] = useState({ student_id: '', message: '', severity: 'medium', target_role: 'parent' });

  const today        = new Date().toISOString().split('T')[0];
  const reviewCutoff = new Date(Date.now() - 7 * 86400000).toISOString();


  const canCreateAlert = ['admin', 'super_admin', 'coordinator', 'tutor', 'mentor'].includes(role);

  const loadScopedStudents = useCallback(async () => {
    if (!canCreateAlert) return;

    let q = supabase
      .from('students')
      .select('id, first_name, last_name, hub_id, tutor_id')
      .order('first_name', { ascending: true });

    if (studentId) q = q.eq('id', studentId);
    if (role === 'tutor' || role === 'mentor') q = q.eq('tutor_id', profile?.id);
    if (role === 'coordinator' && profile?.hub_id) q = q.eq('hub_id', profile.hub_id);
    if (role === 'coordinator' && !profile?.hub_id) {
      setStudents([]);
      return;
    }

    const { data, error } = await q;
    if (!error) setStudents(data || []);
  }, [canCreateAlert, profile?.hub_id, profile?.id, role, studentId]);

  const createManualAlert = async (event) => {
    event.preventDefault();
    const message = alertForm.message.trim();
    if (!alertForm.student_id || !message) return;

    setSavingAlert(true);
    try {
      const { error } = await supabase.from('academic_alerts').insert([{
        student_id: alertForm.student_id,
        alert_type: 'grade_missing',
        message,
        severity: SEV[alertForm.severity]?.db || 'warning',
        status: 'active',
        target_role: alertForm.target_role,
        context_type: 'grade',
      }]);
      if (error) throw error;

      setAlertForm((prev) => ({ ...prev, message: '' }));
      await buildAlerts();
    } catch (err) {
      console.error('[SisAlertsDashboard] create alert error:', err);
    } finally {
      setSavingAlert(false);
    }
  };

  const buildAlerts = useCallback(async () => {
    setLoading(true);
    const derived = [];

    try {
      /* ── 1. Overdue PACEs (all admin/coord/tutor/parent roles) ── */
      if (['admin', 'super_admin', 'coordinator', 'tutor', 'mentor', 'parent', 'family'].includes(role)) {
        let q = supabase
          .from('pei_pace_projections')
          .select('id, subject_name, estimated_delivery_date, status, pei_id, individualized_education_plans(student_id, school_year, students(first_name, last_name))')
          .lt('estimated_delivery_date', today)
          .not('status', 'in', '("evaluated","cancelled")');
        if (studentId) q = q.eq('individualized_education_plans.student_id', studentId);

        const { data } = await q;
        (data || []).forEach(p => {
          const iep = p.individualized_education_plans;
          if (!iep) return;
          const s = iep.students;
          const d = daysAgo(p.estimated_delivery_date);
          derived.push({
            id:          `pace-${p.id}`,
            type:        'overdue_pace',
            severity:    d > 14 ? 'high' : d > 7 ? 'medium' : 'low',
            title:       `PACE vencido: ${p.subject_name || 'Materia'}`,
            description: `${s ? `${s.first_name} ${s.last_name} — ` : ''}Est. entrega: ${p.estimated_delivery_date} (${d} día${d !== 1 ? 's' : ''} de retraso)`,
            roles: ['admin', 'super_admin', 'coordinator', 'tutor', 'mentor', 'parent', 'family'],
          });
        });
      }

      /* ── 2. PEIs in_review > 7 días (admin / coordinator) ── */
      if (['admin', 'super_admin', 'coordinator'].includes(role)) {
        let q = supabase
          .from('individualized_education_plans')
          .select('id, school_year, quarter, student_id, updated_at, students(first_name, last_name)')
          .eq('status', 'in_review')
          .lt('updated_at', reviewCutoff);
        if (studentId) q = q.eq('student_id', studentId);

        const { data } = await q;
        (data || []).forEach(p => {
          const s = p.students;
          const d = daysAgo(p.updated_at);
          derived.push({
            id:          `pei-${p.id}`,
            type:        'pending_pei',
            severity:    'medium',
            title:       `PEI en revisión sin acción (${d} días)`,
            description: `${s ? `${s.first_name} ${s.last_name} — ` : ''}${p.school_year} ${p.quarter || ''}`,
            roles: ['admin', 'super_admin', 'coordinator'],
          });
        });
      }

      /* ── 3. Boletines in_review > 7 días (admin / coordinator) ── */
      if (['admin', 'super_admin', 'coordinator'].includes(role)) {
        let q = supabase
          .from('transcript_records')
          .select('id, school_year, quarter, student_id, updated_at, students(first_name, last_name)')
          .eq('status', 'in_review')
          .lt('updated_at', reviewCutoff);
        if (studentId) q = q.eq('student_id', studentId);

        const { data } = await q;
        (data || []).forEach(t => {
          const s = t.students;
          const d = daysAgo(t.updated_at);
          derived.push({
            id:          `boletin-${t.id}`,
            type:        'pending_boletin',
            severity:    'low',
            title:       `Boletín pendiente de aprobación (${d} días)`,
            description: `${s ? `${s.first_name} ${s.last_name} — ` : ''}${t.school_year} ${t.quarter}`,
            roles: ['admin', 'super_admin', 'coordinator'],
          });
        });
      }

      /* ── 4. Notas pendientes de revisión — submitted (coordinator/admin) ── */
      if (['admin', 'super_admin', 'coordinator'].includes(role)) {
        let q = supabase
          .from('student_subjects')
          .select('id, subject_name, grade_submitted_at, student_id, students(first_name, last_name)')
          .eq('grade_submission_status', 'submitted');
        if (studentId) q = q.eq('student_id', studentId);

        const { data } = await q;
        (data || []).forEach(ss => {
          const s = ss.students;
          const d = ss.grade_submitted_at ? daysAgo(ss.grade_submitted_at) : 0;
          derived.push({
            id:          `grades-${ss.id}`,
            type:        'pending_grades',
            severity:    d > 5 ? 'high' : 'medium',
            title:       `Notas enviadas pendientes: ${ss.subject_name || 'Materia'}`,
            description: `${s ? `${s.first_name} ${s.last_name} — ` : ''}Enviadas hace ${d} día${d !== 1 ? 's' : ''}`,
            roles: ['admin', 'super_admin', 'coordinator'],
          });
        });
      }

      /* ── 5. Notas con corrección solicitada — revision_requested (tutor/parent) ── */
      if (['tutor', 'mentor', 'parent', 'family'].includes(role)) {
        let q = supabase
          .from('student_subjects')
          .select('id, subject_name, grade_review_comment, grade_reviewed_at, student_id, students(first_name, last_name)')
          .eq('grade_submission_status', 'revision_requested');
        if (studentId) q = q.eq('student_id', studentId);

        const { data } = await q;
        (data || []).forEach(ss => {
          const s = ss.students;
          derived.push({
            id:          `rev-${ss.id}`,
            type:        'revision_requested',
            severity:    'high',
            title:       `Corrección solicitada: ${ss.subject_name || 'Materia'}`,
            description: `${s ? `${s.first_name} ${s.last_name} — ` : ''}${ss.grade_review_comment || 'Sin comentario del revisor'}`,
            roles: ['tutor', 'mentor', 'parent', 'family'],
          });
        });
      }

      /* ── 6. Alertas manuales activas creadas por staff académico ── */
      if (['admin', 'super_admin', 'coordinator', 'tutor', 'mentor', 'parent', 'family'].includes(role)) {
        let q = supabase
          .from('academic_alerts')
          .select('id, student_id, alert_type, message, severity, target_role, created_at, students(first_name, last_name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);
        if (studentId) q = q.eq('student_id', studentId);

        const { data } = await q;
        (data || []).forEach(a => {
          const s = a.students;
          const severityMap = { critical: 'high', warning: 'medium', info: 'low' };
          derived.push({
            id:          `manual-${a.id}`,
            type:        a.alert_type || 'general',
            severity:    severityMap[a.severity] || 'low',
            title:       'Alerta académica',
            description: `${s ? `${s.first_name} ${s.last_name} — ` : ''}${a.message}`,
            roles: [a.target_role || 'admin'],
          });
        });
      }

      /* ── 7. Estudiantes sin tutor asignado (admin / coordinator) ── */
      if (['admin', 'super_admin', 'coordinator'].includes(role) && !studentId) {
        let q = supabase
          .from('students')
          .select('id, first_name, last_name, student_status, hub_id')
          .eq('student_status', 'active')
          .is('tutor_id', null)
          .limit(20);
        if (role === 'coordinator' && profile?.hub_id) q = q.eq('hub_id', profile.hub_id);
        if (role === 'coordinator' && !profile?.hub_id) q = q.is('hub_id', null).limit(0);

        const { data } = await q;
        (data || []).forEach(s => {
          derived.push({
            id:          `no-tutor-${s.id}`,
            type:        'no_tutor',
            severity:    'medium',
            title:       `Estudiante activo sin tutor: ${s.first_name} ${s.last_name}`,
            description: 'Asignar tutor en la ficha del estudiante.',
            roles: ['admin', 'super_admin', 'coordinator'],
          });
        });
      }

    } catch (err) {
      console.error('[SisAlertsDashboard] error:', err);
    } finally {
      // Sort: high first, then medium, then low
      const order = { high: 0, medium: 1, low: 2 };
      derived.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
      setAlerts(derived);
      setLoading(false);
    }
  }, [profile?.hub_id, role, studentId, today, reviewCutoff]);

  useEffect(() => { buildAlerts(); }, [buildAlerts]);
  useEffect(() => { loadScopedStudents(); }, [loadScopedStudents]);

  /* ── filter ── */
  const filtered = alerts.filter(a => severityFilter === 'all' || a.severity === severityFilter);
  const displayed = maxItems ? filtered.slice(0, maxItems) : filtered;

  /* ── render ── */
  if (loading) return (
    <div className="flex items-center gap-2 p-4 text-slate-400 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Verificando alertas del sistema…
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Alertas del Sistema
            {alerts.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-black rounded-full">
                {alerts.length}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {/* Severity filter pills */}
            <div className="flex gap-1">
              {ROLE_FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSev(opt.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border ${
                    severityFilter === opt.key
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button onClick={buildAlerts} className="text-slate-400 hover:text-slate-600 p-1" title="Actualizar">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {canCreateAlert && !compact && (
        <form onSubmit={createManualAlert} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black text-slate-800">
            <PlusCircle className="w-4 h-4 text-blue-600" /> Crear alerta académica
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_2fr_.8fr_.9fr_auto] gap-3">
            <select
              value={alertForm.student_id}
              onChange={(event) => setAlertForm((prev) => ({ ...prev, student_id: event.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              required
            >
              <option value="">Estudiante…</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>
              ))}
            </select>
            <input
              type="text"
              value={alertForm.message}
              onChange={(event) => setAlertForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="Comentario / motivo de la alerta…"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              required
            />
            <select
              value={alertForm.severity}
              onChange={(event) => setAlertForm((prev) => ({ ...prev, severity: event.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="low">Baja</option>
            </select>
            <select
              value={alertForm.target_role}
              onChange={(event) => setAlertForm((prev) => ({ ...prev, target_role: event.target.value }))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="parent">Padre</option>
              <option value="tutor">Tutor</option>
              <option value="coordinator">Coordinador</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={savingAlert || students.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {savingAlert ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              Crear
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {displayed.length === 0 && (
        <div className="flex items-center gap-3 p-5 text-green-700 bg-green-50 rounded-xl border border-green-200">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">Sin alertas activas</p>
            {!compact && <p className="text-xs mt-0.5 opacity-80">Todo al día en los registros revisados.</p>}
          </div>
        </div>
      )}

      {/* Alert list */}
      <div className="space-y-2">
        {displayed.map(alert => {
          const sev  = SEV[alert.severity] || SEV.low;
          const Icon = TYPE_ICON[alert.type] || Bell;
          return (
            <div key={alert.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${sev.color}`}>
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sev.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">{alert.title}</p>
                {!compact && (
                  <p className="text-xs mt-0.5 opacity-80 leading-snug">{alert.description}</p>
                )}
              </div>
              <Icon className="w-4 h-4 shrink-0 mt-0.5 opacity-50" />
            </div>
          );
        })}
      </div>

      {/* Truncation note */}
      {maxItems && filtered.length > maxItems && (
        <p className="text-xs text-slate-400 text-center pt-1">
          Mostrando {maxItems} de {filtered.length} alertas.
        </p>
      )}
    </div>
  );
}
