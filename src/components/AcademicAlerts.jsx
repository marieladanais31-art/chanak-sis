import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { AlertTriangle, Clock, FileText, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';

const SEVERITY_META = {
  high:   { color: 'bg-red-100 text-red-800 border-red-200',    dot: 'bg-red-500',    label: 'Alta' },
  medium: { color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'Media' },
  low:    { color: 'bg-blue-100 text-blue-800 border-blue-200',  dot: 'bg-blue-400',   label: 'Baja' },
};

const TYPE_ICON = {
  overdue_pace:     Clock,
  pending_pei:      FileText,
  pending_boletin:  FileText,
  failing_grade:    AlertTriangle,
  general:          AlertTriangle,
};

/**
 * Derives live academic alerts without a cron job:
 *  1. Overdue PACEs (estimated_delivery_date < today, status not in evaluated/cancelled)
 *  2. PEIs stuck in_review for >7 days
 *  3. Transcripts in_review with no action
 *
 * Props:
 *  - studentId?: filter to one student (tutor/parent view)
 *  - targetRole?: filter by who the alert is for ('coordinator','tutor','admin')
 *  - compact?: boolean — hide detail labels
 */
export default function AcademicAlerts({ studentId, targetRole, compact = false }) {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  const buildAlerts = useCallback(async () => {
    setLoading(true);
    const derived = [];
    try {
      // 1. Overdue PACEs
      let paceQuery = supabase
        .from('pei_pace_projections')
        .select('id, subject_name, estimated_delivery_date, status, pei_id, individualized_education_plans(student_id, school_year, students(first_name, last_name))')
        .lt('estimated_delivery_date', today)
        .not('status', 'in', '("evaluated","cancelled")');

      if (studentId) {
        paceQuery = paceQuery.eq('individualized_education_plans.student_id', studentId);
      }

      const { data: overduePaces } = await paceQuery;
      (overduePaces || []).forEach(p => {
        const iep = p.individualized_education_plans;
        if (!iep) return;
        const student = iep?.students;
        const daysOverdue = Math.floor((new Date(today) - new Date(p.estimated_delivery_date)) / 86400000);
        derived.push({
          id:         `pace-${p.id}`,
          type:       'overdue_pace',
          severity:   daysOverdue > 14 ? 'high' : daysOverdue > 7 ? 'medium' : 'low',
          title:      `PACE vencido: ${p.subject_name || 'Materia'}`,
          description:`${student ? `${student.first_name} ${student.last_name} — ` : ''}Entrega estimada: ${p.estimated_delivery_date} (${daysOverdue} día${daysOverdue !== 1 ? 's' : ''} de retraso)`,
          context:    { pei_id: p.pei_id, student_id: iep.student_id },
        });
      });

      // 2. PEIs in_review for >7 days
      const reviewCutoff = new Date(Date.now() - 7 * 86400000).toISOString();
      let peiQuery = supabase
        .from('individualized_education_plans')
        .select('id, school_year, quarter, student_id, updated_at, students(first_name, last_name)')
        .eq('status', 'in_review')
        .lt('updated_at', reviewCutoff);

      if (studentId) peiQuery = peiQuery.eq('student_id', studentId);
      const { data: pendingPeis } = await peiQuery;
      (pendingPeis || []).forEach(p => {
        const student = p.students;
        derived.push({
          id:         `pei-${p.id}`,
          type:       'pending_pei',
          severity:   'medium',
          title:      `PEI pendiente de revisión`,
          description:`${student ? `${student.first_name} ${student.last_name} — ` : ''}${p.school_year} ${p.quarter || ''} lleva más de 7 días en revisión.`,
          context:    { pei_id: p.id, student_id: p.student_id },
        });
      });

      // 3. Transcripts in_review for >7 days
      let tQuery = supabase
        .from('transcript_records')
        .select('id, school_year, quarter, student_id, updated_at, students(first_name, last_name)')
        .eq('status', 'in_review')
        .lt('updated_at', reviewCutoff);

      if (studentId) tQuery = tQuery.eq('student_id', studentId);
      const { data: pendingTranscripts } = await tQuery;
      (pendingTranscripts || []).forEach(t => {
        const student = t.students;
        derived.push({
          id:         `transcript-${t.id}`,
          type:       'pending_boletin',
          severity:   'low',
          title:      `Boletín pendiente de aprobación`,
          description:`${student ? `${student.first_name} ${student.last_name} — ` : ''}${t.school_year} ${t.quarter} lleva más de 7 días esperando aprobación.`,
          context:    { transcript_id: t.id, student_id: t.student_id },
        });
      });

    } catch (err) {
      console.error('[AcademicAlerts] error:', err);
    } finally {
      setAlerts(derived);
      setLoading(false);
    }
  }, [studentId, today]);

  useEffect(() => { buildAlerts(); }, [buildAlerts]);

  if (loading) return (
    <div className="flex items-center gap-2 p-4 text-slate-400 text-sm">
      <Loader2 className="w-4 h-4 animate-spin" /> Verificando alertas…
    </div>
  );

  if (alerts.length === 0) return (
    <div className="flex items-center gap-2 p-4 text-green-700 text-sm bg-green-50 rounded-xl border border-green-200">
      <CheckCircle className="w-4 h-4 shrink-0" />
      <span>Sin alertas académicas activas.</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Alertas Académicas ({alerts.length})
          </h3>
          <button onClick={buildAlerts} className="text-slate-400 hover:text-slate-600">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {alerts.map(alert => {
        const sev  = SEVERITY_META[alert.severity] || SEVERITY_META.low;
        const Icon = TYPE_ICON[alert.type] || AlertTriangle;
        return (
          <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${sev.color}`}>
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sev.dot}`} />
            <div className="min-w-0">
              <p className="font-bold leading-tight">{alert.title}</p>
              {!compact && <p className="text-xs mt-0.5 opacity-80 leading-snug">{alert.description}</p>}
            </div>
            <Icon className="w-4 h-4 shrink-0 mt-0.5 opacity-60" />
          </div>
        );
      })}
    </div>
  );
}
