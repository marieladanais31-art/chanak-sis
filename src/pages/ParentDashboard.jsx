
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth, ROLES } from '@/context/AuthContext';
import {
  LogOut,
  Users,
  FileText,
  AlertCircle,
  Download,
  CheckCircle2,
  Loader2,
  BookOpen,
  Activity,
  FileSignature,
  CreditCard,
  X,
  Hourglass,
  Scale,
  ExternalLink,
  FileUp,
  Link2,
  Bell,
  CalendarDays,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Archive,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import GradeEntriesManager from '@/components/GradeEntriesManager';
import ParentEvidencePanel from '@/components/ParentEvidencePanel';
import { ACTIVE_SCHOOL_YEAR, QUARTERS, dedupeAcademicSubjects } from '@/lib/academicUtils';
import { generateTranscriptPDF } from '@/lib/transcriptPdf';
import { preloadImages } from '@/lib/officialDocuments';

/* ── Categorías: colores de badge ──────────────────────────────────────────── */
const CAT_COLORS = {
  LMS:        'bg-blue-50 text-blue-700 border-blue-100',
  Drive:      'bg-amber-50 text-amber-700 border-amber-100',
  ACEConnect: 'bg-purple-50 text-purple-700 border-purple-100',
  Expediente: 'bg-teal-50 text-teal-700 border-teal-100',
  Interno:    'bg-slate-100 text-slate-700 border-slate-200',
  Otro:       'bg-gray-50 text-gray-700 border-gray-100',
};

/* ── Recursos / Enlaces operativos ─────────────────────────────────────────── */
function ParentRecursosPanel({ links }) {
  if (!links || links.length === 0) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
        No hay documentos disponibles todavía.
      </div>
    );
  }

  /* Agrupar por categoría */
  const grouped = links.reduce((acc, link) => {
    const cat = link.category || 'Otro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(link);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-black ${CAT_COLORS[category] || CAT_COLORS.Otro}`}>
              {category}
            </span>
          </div>
          <div className="space-y-2">
            {items.map(link => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div>
                  <p className="font-bold text-slate-800 group-hover:text-blue-700">{link.title}</p>
                  {link.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{link.description}</p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0 ml-4" />
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Calendario escolar ──────────────────────────────────────────────────── */
function ParentCalendarioPanel({ calendar }) {
  if (!calendar) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
        <p className="font-bold text-slate-600 mb-1">Calendario no disponible</p>
        <p className="text-sm">Aún no hay calendario escolar publicado para el año académico {ACTIVE_SCHOOL_YEAR}.</p>
      </div>
    );
  }

  const fmt = (d) => {
    if (!d) return 'N/A';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const periods = [
    { label: 'Q1 — Primer Trimestre',   start: calendar.q1_start_date, end: calendar.q1_end_date },
    { label: 'Q2 — Segundo Trimestre',  start: calendar.q2_start_date, end: calendar.q2_end_date },
    { label: 'Q3 — Tercer Trimestre',   start: calendar.q3_start_date, end: calendar.q3_end_date },
  ].filter(p => p.start || p.end);

  return (
    <div className="space-y-6">
      {/* Resumen del año */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-4">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <h3 className="font-black text-slate-800 text-lg">{calendar.academic_year}</h3>
          <span className="ml-auto px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-black rounded-full border border-green-200">
            Activo
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Inicio del año</p>
            <p className="font-bold text-slate-800">{fmt(calendar.start_date)}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Fin del año</p>
            <p className="font-bold text-slate-800">{fmt(calendar.end_date)}</p>
          </div>
        </div>
      </div>

      {/* Trimestres */}
      {periods.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {periods.map(p => (
            <div key={p.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="font-black text-slate-700 text-sm mb-3">{p.label}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs uppercase font-bold tracking-wide">Inicio</span>
                  <span className="font-bold text-slate-800">{fmt(p.start)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs uppercase font-bold tracking-wide">Fin</span>
                  <span className="font-bold text-slate-800">{fmt(p.end)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notas / recesos */}
      {calendar.break_notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">Notas / Recesos</p>
          <p className="text-sm text-amber-800 whitespace-pre-line">{calendar.break_notes}</p>
        </div>
      )}
    </div>
  );
}

const BOLETIN_QUARTERS = ['Q1', 'Q2', 'Q3'];

function ParentBoletinesPanel({ studentChildren }) {
  const { toast } = useToast();
  const [transcripts, setTranscripts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(null);

  React.useEffect(() => {
    if (!studentChildren || studentChildren.length === 0) { setLoading(false); return; }
    const ids = studentChildren.map(c => c.id);
    supabase
      .from('transcript_records')
      .select('id, student_id, school_year, quarter, language, status, gpa, academic_observations, published_at')
      .in('student_id', ids)
      .eq('status', 'published')
      .order('school_year', { ascending: false })
      .order('quarter')
      .then(({ data }) => { setTranscripts(data || []); setLoading(false); });
  }, [studentChildren]);

  // Descarga boletín trimestral en el idioma seleccionado (ES o EN)
  const handleDownloadQuarter = async (tr, lang) => {
    const key = `${tr.id}-${lang}`;
    setDownloading(key);
    try {
      const child = studentChildren.find(c => c.id === tr.student_id);
      const [coursesRes, settingsRes, creditsRes] = await Promise.all([
        supabase.from('transcript_courses').select('*').eq('transcript_id', tr.id),
        supabase.from('institutional_settings').select('*').limit(1).single(),
        supabase.from('student_credits_summary').select('*').eq('student_id', tr.student_id),
      ]);
      const preparedSettings = await preloadImages(settingsRes.data);
      generateTranscriptPDF({
        transcript: tr,
        courses: coursesRes.data || [],
        student: child || { id: tr.student_id },
        settings: preparedSettings,
        creditsSummary: creditsRes.data || [],
        lang,
      });
    } catch (err) {
      toast({ title: 'Error al descargar', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  // Descarga PDF Histórico Anual con todos los trimestres publicados del año
  const handleDownloadAnnual = async (childId, schoolYear, lang) => {
    const key = `annual-${childId}-${schoolYear}-${lang}`;
    setDownloading(key);
    try {
      const child = studentChildren.find(c => c.id === childId);
      const [trRes, settingsRes] = await Promise.all([
        supabase
          .from('transcript_records')
          .select('id, school_year, quarter, status')
          .eq('student_id', childId)
          .eq('school_year', schoolYear)
          .in('quarter', BOLETIN_QUARTERS)
          .eq('status', 'published')
          .order('quarter'),
        supabase.from('institutional_settings').select('*').limit(1).single(),
      ]);
      if (!trRes.data || trRes.data.length === 0) {
        toast({ title: 'Sin boletines publicados', description: `No hay trimestres publicados para ${schoolYear}.`, variant: 'destructive' });
        return;
      }
      const trIds = trRes.data.map(r => r.id);
      const { data: coursesData } = await supabase
        .from('transcript_courses')
        .select('transcript_id, subject_name, final_grade, credits, subject_category, is_local_subject')
        .in('transcript_id', trIds);

      const courseMap = {};
      (coursesData || []).forEach(c => {
        if (!courseMap[c.transcript_id]) courseMap[c.transcript_id] = [];
        courseMap[c.transcript_id].push(c);
      });

      const yearsForPdf = [{
        school_year:    schoolYear,
        grade_level:    child?.grade_level || null,
        us_grade_level: child?.us_grade_level || child?.grade_level || null,
        records: trRes.data.map(tr => ({
          quarter:  tr.quarter,
          subjects: courseMap[tr.id] || [],
        })),
      }];

      const preparedSettings = await preloadImages(settingsRes.data);
      const { generateAnnualTranscriptPDF } = await import('@/lib/annualTranscriptPdf');
      generateAnnualTranscriptPDF({
        student:     child || { id: childId },
        years:       yearsForPdf,
        settings:    preparedSettings,
        isHighSchool: false,
        lang,
      });
    } catch (err) {
      toast({ title: 'Error al generar PDF Anual', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (transcripts.length === 0) return (
    <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
      Aún no hay boletines publicados.
    </div>
  );

  // Agrupar por estudiante → año escolar
  const grouped = {};
  transcripts.forEach(tr => {
    if (!grouped[tr.student_id]) grouped[tr.student_id] = {};
    if (!grouped[tr.student_id][tr.school_year]) grouped[tr.student_id][tr.school_year] = [];
    grouped[tr.student_id][tr.school_year].push(tr);
  });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([sid, byYear]) => {
        const child = studentChildren.find(c => c.id === sid);
        return (
          <div key={sid} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Cabecera del estudiante */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
              <p className="font-black text-slate-800 text-lg">
                {child ? `${child.first_name} ${child.last_name}` : 'Estudiante'}
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {Object.entries(byYear)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([schoolYear, quarters]) => {
                  const publishedQs = quarters.map(q => q.quarter);
                  const annualKey   = `annual-${sid}-${schoolYear}`;
                  return (
                    <div key={schoolYear} className="p-5">
                      {/* Año escolar + badges + botones PDF Anual */}
                      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                        <div>
                          <p className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-2">{schoolYear}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {BOLETIN_QUARTERS.map(q => (
                              <span key={q} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                publishedQs.includes(q)
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : 'bg-slate-50 text-slate-400 border-slate-200'
                              }`}>
                                {q} {publishedQs.includes(q) ? '✓' : '·'}
                              </span>
                            ))}
                          </div>
                        </div>
                        {/* PDF Histórico Anual (solo si hay al menos 1 trimestre publicado) */}
                        {publishedQs.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {['es', 'en'].map(lang => (
                              <button
                                key={lang}
                                onClick={() => handleDownloadAnnual(sid, schoolYear, lang)}
                                disabled={!!downloading?.startsWith(annualKey)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs disabled:opacity-50 transition-colors"
                              >
                                {downloading === `${annualKey}-${lang}`
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Download className="w-3 h-3" />
                                }
                                PDF Anual {lang.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Tarjetas de boletines trimestrales */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {BOLETIN_QUARTERS.map(q => {
                          const tr = quarters.find(t => t.quarter === q);
                          if (!tr) return (
                            <div key={q} className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center flex flex-col items-center justify-center gap-1 min-h-[90px]">
                              <p className="text-xs font-bold text-slate-400">{q}</p>
                              <p className="text-[10px] text-slate-400">Pendiente de publicación</p>
                            </div>
                          );
                          return (
                            <div key={q} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-slate-700 text-sm">{tr.quarter}</p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-bold border border-green-200">
                                  Publicado
                                </span>
                              </div>
                              {tr.gpa !== null && tr.gpa !== undefined && (
                                <p className="text-xs text-purple-700 font-bold">GPA: {Number(tr.gpa).toFixed(2)}</p>
                              )}
                              <div className="flex gap-1.5 flex-wrap">
                                {['es', 'en'].map(lang => (
                                  <button
                                    key={lang}
                                    onClick={() => handleDownloadQuarter(tr, lang)}
                                    disabled={downloading === `${tr.id}-${lang}`}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] disabled:opacity-50 transition-colors"
                                  >
                                    {downloading === `${tr.id}-${lang}`
                                      ? <Loader2 className="w-3 h-3 animate-spin" />
                                      : null
                                    }
                                    PDF {lang.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function severityClass(severity) {
  if (severity === 'critical') return 'bg-red-50 text-red-700 border-red-200';
  if (severity === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
}

function ParentAlertasPanel({ studentChildren, paceProjection, computedOverdue = [] }) {
  const [alerts, setAlerts] = React.useState([]);
  const [corrections, setCorrections] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadAlerts = async () => {
      if (!studentChildren || studentChildren.length === 0) {
        setAlerts([]);
        setCorrections([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const ids = studentChildren.map((child) => child.id);
      const [alertsRes, correctionsRes] = await Promise.all([
        supabase
          .from('academic_alerts')
          .select('id, student_id, alert_type, message, severity, status, target_role, context_type, created_at, resolved_at')
          .in('student_id', ids)
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('academic_evidence_submissions')
          .select('id, student_id, subject_name, evidence_type, pace_number, review_status, academic_outcome, reviewer_comment, created_at, reviewed_at')
          .in('student_id', ids)
          .in('review_status', ['correction_requested', 'rejected'])
          .order('reviewed_at', { ascending: false, nullsFirst: false }),
      ]);


      setAlerts(alertsRes.error ? [] : (alertsRes.data || []));
      setCorrections(correctionsRes.error ? [] : (correctionsRes.data || []));
      setLoading(false);
    };

    loadAlerts();
  }, [studentChildren]);

  // Usa el pre-calculado del componente padre (quarter-based) en lugar de solo fecha
  const overduePaces = computedOverdue.length > 0
    ? computedOverdue.filter(p => studentChildren?.some(c => c.id === p.student_id))
    : (paceProjection || []).filter((pace) => {
        if (!studentChildren?.some((child) => child.id === pace.student_id)) return false;
        if (['completed', 'approved', 'delivered', 'evaluated'].includes((pace.status || '').toLowerCase())) return false;
        if ((pace.status || '').toLowerCase() === 'overdue') return true;
        const due = pace.projected_completion_date || pace.estimated_delivery_date || pace.due_date;
        if (!due) return false;
        const dueDate = new Date(due);
        if (Number.isNaN(dueDate.getTime())) return false;
        dueDate.setHours(0, 0, 0, 0);
        const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
        return dueDate < todayD;
      });

  const getChildName = (studentId) => {
    const child = studentChildren.find((item) => item.id === studentId);
    return child ? `${child.first_name || ''} ${child.last_name || ''}`.trim() : 'Estudiante';
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#193D6D]" /></div>;

  const isEmpty = alerts.length === 0 && corrections.length === 0 && overduePaces.length === 0;

  if (isEmpty) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
        No hay alertas activas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {alerts.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><Bell className="w-5 h-5 text-amber-500" /> Alertas académicas</h3>
          {alerts.map((alert) => (
            <div key={alert.id} className={`rounded-xl border p-4 ${severityClass(alert.severity)}`}>
              <p className="text-xs font-black uppercase tracking-wider">{getChildName(alert.student_id)} · {alert.alert_type}</p>
              <p className="font-bold mt-1">{alert.message}</p>
            </div>
          ))}
        </section>
      )}

      {corrections.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-orange-500" /> Correcciones solicitadas</h3>
          {corrections.map((item) => (
            <div key={item.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-800">
              <p className="text-xs font-black uppercase tracking-wider">{getChildName(item.student_id)} · {item.subject_name}</p>
              <p className="font-bold mt-1">{item.evidence_type}{item.pace_number ? ` · Evaluación #${item.pace_number}` : ''}</p>
              <p className="text-sm font-medium mt-1">{item.reviewer_comment || 'Chanak solicitó corrección o repetición de esta evidencia.'}</p>
            </div>
          ))}
        </section>
      )}

      {overduePaces.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-black text-slate-800 flex items-center gap-2">
            <Hourglass className="w-5 h-5 text-red-500" /> Evaluaciones vencidas / retrasadas
          </h3>
          {/* Agrupar por estudiante para no mostrar lista individual */}
          {(() => {
            const byChild = {};
            overduePaces.forEach(p => {
              if (!byChild[p.student_id]) byChild[p.student_id] = [];
              byChild[p.student_id].push(p);
            });
            return Object.entries(byChild).map(([studentId, paces]) => {
              const byQ = { Q1: [], Q2: [], Q3: [] };
              paces.forEach(p => { if (byQ[p.quarter]) byQ[p.quarter].push(p); });
              return (
                <div key={studentId} className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 space-y-2">
                  <p className="font-black text-sm">{getChildName(studentId)} — {paces.length} evaluación{paces.length !== 1 ? 'es' : ''} vencida{paces.length !== 1 ? 's' : ''}</p>
                  {['Q1','Q2','Q3'].map(q => {
                    const qPaces = byQ[q];
                    if (!qPaces.length) return null;
                    const subjGroups = {};
                    qPaces.forEach(p => { if (!subjGroups[p.subject_name]) subjGroups[p.subject_name] = []; subjGroups[p.subject_name].push(p); });
                    return (
                      <div key={q} className="text-xs font-bold">
                        <span className="text-red-600 uppercase tracking-wider">{q}: </span>
                        {Object.entries(subjGroups).map(([subj, ps]) => (
                          <span key={subj} className="mr-2">{subj} ({ps.map(p => `#${p.pace_number}`).join(', ')})</span>
                        ))}
                      </div>
                    );
                  })}
                  <p className="text-xs text-red-600 font-medium mt-1">
                    Para reportar avance, usa la pestaña <strong>Evidencias</strong> o haz clic en "Ver Evaluaciones" en la tarjeta del estudiante.
                  </p>
                </div>
              );
            });
          })()}
        </section>
      )}
    </div>
  );
}

/* ── Sección colapsable de documentos históricos ──────────────────────────── */
function HistoricalDocsSection({
  peis, contracts, letters, transcripts, studentChildren, downloading,
  onDownloadPei, onDownloadContract, onDownloadLetter, onDownloadTranscript,
}) {
  const [open, setOpen] = React.useState(false);

  // Agrupar todos los docs históricos por año
  const allDocs = [
    ...peis.map(d => ({ ...d, _type: 'pei' })),
    ...contracts.map(d => ({ ...d, _type: 'contract' })),
    ...letters.map(d => ({ ...d, _type: 'letter' })),
    ...transcripts.map(d => ({ ...d, _type: 'transcript' })),
  ];
  const yearSet = [...new Set(allDocs.map(d => d.school_year).filter(Boolean))].sort().reverse();

  const subtitleFor = (doc) => {
    if (doc._type === 'pei')        return `PEI publicado · ${doc.school_year}`;
    if (doc._type === 'contract')   return `Contrato ${doc.status === 'signed' ? 'firmado' : 'enviado'} · ${doc.school_year}`;
    if (doc._type === 'letter')     return `Carta publicada · ${doc.school_year}${doc.program ? ` · ${doc.program}` : ''}`;
    if (doc._type === 'transcript') return `Boletín · ${doc.school_year} · ${doc.quarter}`;
    return doc.school_year;
  };

  const iconFor = (type) => {
    if (type === 'contract') return <FileSignature className="w-4 h-4" />;
    if (type === 'letter')   return <CheckCircle2 className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const downloadFor = (doc, lang) => {
    if (doc._type === 'pei')        return onDownloadPei(doc, lang);
    if (doc._type === 'contract')   return onDownloadContract(doc, lang);
    if (doc._type === 'letter')     return onDownloadLetter(doc, lang);
    if (doc._type === 'transcript') return onDownloadTranscript(doc, lang);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Archive className="w-5 h-5 text-slate-500" />
          <span className="font-black text-slate-600 text-sm uppercase tracking-wider">
            Historial Académico ({yearSet.join(', ')})
          </span>
          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full text-xs font-bold">
            {allDocs.length} doc{allDocs.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {open && (
        <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4">
          <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2">
            📁 Estos documentos corresponden a años académicos anteriores. Son de solo lectura y están disponibles para consulta y descarga.
          </p>
          {yearSet.map(year => {
            const yearDocs = allDocs.filter(d => d.school_year === year);
            return (
              <div key={year}>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{year}</p>
                <div className="space-y-2">
                  {yearDocs.map(doc => {
                    const child = studentChildren.find(c => c.id === doc.student_id);
                    const dlKey = `hist-${doc._type}-${doc.id}`;
                    return (
                      <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                            {iconFor(doc._type)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-600 text-sm">
                              {child ? `${child.first_name} ${child.last_name}` : 'Estudiante'}
                            </p>
                            <p className="text-xs text-slate-400">{subtitleFor(doc)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {['es', 'en'].map(lang => {
                            const key = `${dlKey}-${lang}`;
                            return (
                              <button
                                key={lang}
                                onClick={() => downloadFor(doc, lang)}
                                disabled={downloading === key}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-xs transition-colors disabled:opacity-50"
                              >
                                {downloading === key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                {lang.toUpperCase()}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ParentDocumentosPanel({ studentChildren }) {
  const [peis, setPeis]           = React.useState([]);
  const [contracts, setContracts] = React.useState([]);
  const [letters, setLetters]     = React.useState([]);
  const [transcripts, setTranscripts] = React.useState([]);
  const [loading, setLoading]     = React.useState(true);
  const [downloading, setDownloading] = React.useState(null);

  React.useEffect(() => {
    if (!studentChildren || studentChildren.length === 0) { setLoading(false); return; }
    const ids = studentChildren.map(c => c.id);
    Promise.all([
      supabase.from('individualized_education_plans')
        .select('*')
        .in('student_id', ids).eq('status', 'published'),
      supabase.from('enrollment_contracts')
        .select('*')
        .in('student_id', ids).in('status', ['sent', 'signed', 'published']),
      supabase.from('enrollment_letters')
        .select('*')
        .in('student_id', ids).in('status', ['sent', 'published']),
      supabase.from('transcript_records')
        .select('id, student_id, school_year, quarter, language, status, gpa, academic_observations')
        .in('student_id', ids).eq('status', 'published'),
    ]).then(([peiRes, conRes, letRes, trRes]) => {
      setPeis(peiRes.data || []);
      setContracts(conRes.data || []);
      setLetters(letRes.data || []);
      setTranscripts(trRes.data || []);
      setLoading(false);
    });
  }, [studentChildren]);

  const handleDownloadPei = async (pei, lang = 'es') => {
    setDownloading(`pei-${pei.id}-${lang}`);
    try {
      const { generatePeiPDF } = await import('@/lib/peiPdf');
      const child = studentChildren.find(c => c.id === pei.student_id);
      const [pacesRes, settingsRes] = await Promise.all([
        supabase.from('pei_pace_projections').select('*').eq('pei_id', pei.id),
        supabase.from('institutional_settings').select('*').limit(1).single(),
      ]);
      const settingsWithImages = await preloadImages(settingsRes.data || null);
      generatePeiPDF({
        pei,
        paces: pacesRes.data || [],
        student: child || { first_name: '', last_name: '' },
        settings: settingsWithImages,
        lang,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadContract = async (contract, lang = 'es') => {
    setDownloading(`con-${contract.id}-${lang}`);
    try {
      const { generateContractPDF } = await import('@/lib/contractPdf');
      const child = studentChildren.find(c => c.id === contract.student_id);
      const { data: rawSettingsCon } = await supabase.from('institutional_settings').select('*').limit(1).single();
      generateContractPDF({
        contract,
        student: child || { first_name: '', last_name: '' },
        settings: await preloadImages(rawSettingsCon),
        lang,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadLetter = async (letter, lang = 'es') => {
    setDownloading(`let-${letter.id}-${lang}`);
    try {
      const { generateEnrollmentLetterPDF } = await import('@/lib/enrollmentLetterPdf');
      const child = studentChildren.find(c => c.id === letter.student_id);
      const { data: rawSettingsLet } = await supabase.from('institutional_settings').select('*').limit(1).single();
      generateEnrollmentLetterPDF({
        letter,
        student: child || { first_name: '', last_name: '' },
        settings: await preloadImages(rawSettingsLet),
        lang,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadTranscript = async (transcript, lang = 'es') => {
    setDownloading(`tr-${transcript.id}-${lang}`);
    try {
      const child = studentChildren.find(c => c.id === transcript.student_id);
      const [coursesRes, rawSettingsRes, creditsRes] = await Promise.all([
        supabase.from('transcript_courses').select('*').eq('transcript_id', transcript.id),
        supabase.from('institutional_settings').select('*').limit(1).single(),
        supabase.from('student_credits_summary').select('*').eq('student_id', transcript.student_id),
      ]);
      // preloadImages: converts logo_url, seal_url, director_signature_url to base64
      const preparedSettings = await preloadImages(rawSettingsRes.data || null);
      generateTranscriptPDF({
        transcript,
        courses: coursesRes.data || [],
        student: child || { id: transcript.student_id },
        settings: preparedSettings,
        creditsSummary: creditsRes.data || [],
        lang,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#193D6D]" /></div>;

  // ── Separar documentos por año activo / histórico ─────────────────────────
  const activePeis        = peis.filter(d => !d.school_year || d.school_year === ACTIVE_SCHOOL_YEAR);
  const activeCons        = contracts.filter(d => !d.school_year || d.school_year === ACTIVE_SCHOOL_YEAR);
  const activeLetters     = letters.filter(d => !d.school_year || d.school_year === ACTIVE_SCHOOL_YEAR);
  const activeTranscripts = transcripts.filter(d => !d.school_year || d.school_year === ACTIVE_SCHOOL_YEAR);

  const histPeis        = peis.filter(d => d.school_year && d.school_year !== ACTIVE_SCHOOL_YEAR);
  const histCons        = contracts.filter(d => d.school_year && d.school_year !== ACTIVE_SCHOOL_YEAR);
  const histLetters     = letters.filter(d => d.school_year && d.school_year !== ACTIVE_SCHOOL_YEAR);
  const histTranscripts = transcripts.filter(d => d.school_year && d.school_year !== ACTIVE_SCHOOL_YEAR);
  const hasHistory      = histPeis.length + histCons.length + histLetters.length + histTranscripts.length > 0;

  const allActiveEmpty = activePeis.length === 0 && activeCons.length === 0 &&
    activeLetters.length === 0 && activeTranscripts.length === 0;
  const allEmpty = allActiveEmpty && !hasHistory;

  const DocRow = ({ icon, title, subtitle, onDownload, dlKey, muted = false }) => (
    <div className={`rounded-xl border shadow-sm p-4 flex items-center justify-between ${muted ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${muted ? 'bg-slate-200 text-slate-500' : 'bg-[#193D6D]/10 text-[#193D6D]'}`}>
          {icon}
        </div>
        <div>
          <p className={`font-bold ${muted ? 'text-slate-600' : 'text-slate-800'}`}>{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {['es', 'en'].map((lang) => {
          const key = `${dlKey}-${lang}`;
          return (
            <button
              key={lang}
              onClick={() => onDownload(lang)}
              disabled={downloading === key}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors ${
                muted
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  : 'bg-[#193D6D] hover:bg-[#142d5a] text-white'
              }`}
            >
              {downloading === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              PDF {lang.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );

  const DocSection = ({ icon, title, docs, muted, renderSubtitle, downloadFn, keyPrefix }) =>
    docs.length > 0 ? (
      <div>
        <h3 className={`font-black mb-3 flex items-center gap-2 ${muted ? 'text-slate-500 text-sm' : 'text-slate-800'}`}>
          {icon} {title}
        </h3>
        <div className="space-y-3">
          {docs.map(doc => {
            const child = studentChildren.find(c => c.id === doc.student_id);
            return (
              <DocRow
                key={doc.id}
                icon={icon}
                muted={muted}
                title={child ? `${child.first_name} ${child.last_name}` : 'Estudiante'}
                subtitle={renderSubtitle(doc)}
                onDownload={(lang) => downloadFn(doc, lang)}
                dlKey={`${keyPrefix}-${doc.id}`}
              />
            );
          })}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      {/* ── Año activo ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-1">
        <span className="px-3 py-1 bg-[#193D6D] text-white rounded-full text-xs font-black uppercase tracking-wider">
          {ACTIVE_SCHOOL_YEAR} — Año activo
        </span>
      </div>

      {allActiveEmpty && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500 space-y-1">
          <p>Aún no hay documentos publicados para el año activo {ACTIVE_SCHOOL_YEAR}.</p>
          <p className="text-xs">Los documentos aparecen aquí cuando el coordinador los publica.</p>
        </div>
      )}

      <DocSection
        icon={<FileText className="w-5 h-5 text-[#193D6D]" />}
        title="Plan Educativo Individualizado (PEI)"
        docs={activePeis}
        renderSubtitle={d => `PEI publicado · ${d.school_year}`}
        downloadFn={handleDownloadPei}
        keyPrefix="pei"
      />
      <DocSection
        icon={<FileSignature className="w-5 h-5 text-blue-600" />}
        title="Contratos de Matrícula"
        docs={activeCons}
        renderSubtitle={d => `Contrato ${d.status === 'signed' ? 'firmado' : 'enviado'} · ${d.school_year}`}
        downloadFn={handleDownloadContract}
        keyPrefix="con"
      />
      <DocSection
        icon={<CheckCircle2 className="w-5 h-5 text-teal-600" />}
        title="Cartas de Confirmación de Matrícula"
        docs={activeLetters}
        renderSubtitle={d => `Carta publicada · ${d.school_year}${d.program ? ` · ${d.program}` : ''}`}
        downloadFn={handleDownloadLetter}
        keyPrefix="let"
      />
      <DocSection
        icon={<FileText className="w-5 h-5 text-blue-600" />}
        title="Boletines / Transcripts publicados"
        docs={activeTranscripts}
        renderSubtitle={d => `Boletín publicado · ${d.school_year} · ${d.quarter}`}
        downloadFn={handleDownloadTranscript}
        keyPrefix="tr"
      />

      {/* ── Historial académico ───────────────────────────────────────────────── */}
      {hasHistory && (
        <HistoricalDocsSection
          peis={histPeis}
          contracts={histCons}
          letters={histLetters}
          transcripts={histTranscripts}
          studentChildren={studentChildren}
          downloading={downloading}
          onDownloadPei={handleDownloadPei}
          onDownloadContract={handleDownloadContract}
          onDownloadLetter={handleDownloadLetter}
          onDownloadTranscript={handleDownloadTranscript}
        />
      )}
    </div>
  );
}

export default function ParentDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);

  const [activeTab, setActiveTab] = useState('children');
  const [children, setChildren] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [pendingLink, setPendingLink] = useState(false);
  const [operationalLinks, setOperationalLinks] = useState([]);
  const [schoolCalendar, setSchoolCalendar] = useState(null);

  const [studentSubjects, setStudentSubjects] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [officialDocuments, setOfficialDocuments] = useState({
    peis: [],
    contracts: [],
    letters: [],
    transcripts: [],
  });
  const [paceProjection, setPaceProjection] = useState([]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [isGradeEntriesModalOpen, setIsGradeEntriesModalOpen] = useState(false);
  const [selectedStudentSubjectForEntries, setSelectedStudentSubjectForEntries] = useState(null);
  const [subjectSelectionStep, setSubjectSelectionStep] = useState(false);
  const [selectedAcademicQuarter, setSelectedAcademicQuarter] = useState('Q1');

  const [selectedChildId, setSelectedChildId] = useState('');

  // ── Modal de evaluaciones proyectadas del PEI ─────────────────────────────
  const [paceProjectionModal, setPaceProjectionModal] = useState(null); // { childId, childName }
  const [evalQFilter, setEvalQFilter]     = useState('all');
  const [evalSubjFilter, setEvalSubjFilter] = useState('all');
  const [evalStatusFilter, setEvalStatusFilter] = useState('all');

  // ── Descarga inline de documentos ES/EN desde tarjeta ────────────────────
  const [downloadingDoc,  setDownloadingDoc]  = useState(null);
  const [docDropdownOpen, setDocDropdownOpen] = useState(null); // 'pei|{childId}' | 'carta|{childId}' | 'contrato|{childId}'

  useEffect(() => {
    if (!profile) return;

    // Aceptar tanto 'parent' como 'family' — son el mismo dashboard
    if (!['parent', 'family'].includes(profile.role)) {
      navigate('/login');
      return;
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, navigate]);

  const hasOfficialPei = (childId) => officialDocuments.peis.some((d) => d.student_id === childId);
  const hasOfficialEnrollmentLetter = (childId) => officialDocuments.letters.some((d) => d.student_id === childId);
  const hasOfficialContract = (childId) => officialDocuments.contracts.some((d) => d.student_id === childId);
  const hasOfficialTranscript = (childId) => officialDocuments.transcripts.some((d) => d.student_id === childId);

  const getChildById = (childId) => {
    return children.find((c) => c.id === childId);
  };

  const getChildSubjects = (childId, quarter = selectedAcademicQuarter, onlyApproved = false) => {
    const raw = studentSubjects.filter(
      (s) =>
        s.student_id === childId &&
        s.school_year === ACTIVE_SCHOOL_YEAR &&
        s.quarter === quarter &&
        (!onlyApproved || s.grade_submission_status === 'approved')
    );

    const unique = dedupeAcademicSubjects(raw);
    return unique.sort((a, b) => {
      const aOrder = a.subject_order ?? 999;
      const bOrder = b.subject_order ?? 999;
      return aOrder - bOrder;
    });
  };

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return Number.isNaN(d.getTime())
      ? 'N/A'
      : d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // ── Trimestre actual desde academic_calendars o fallback por mes ──────────
  const getCurrentQuarter = () => {
    const cal = schoolCalendar;
    const today = new Date().toISOString().slice(0, 10);
    if (cal) {
      if (cal.q1_start_date && cal.q1_end_date && today >= cal.q1_start_date && today <= cal.q1_end_date) return 'Q1';
      if (cal.q2_start_date && cal.q2_end_date && today >= cal.q2_start_date && today <= cal.q2_end_date) return 'Q2';
      if (cal.q3_start_date && cal.q3_end_date && today >= cal.q3_start_date && today <= cal.q3_end_date) return 'Q3';
      if (cal.q2_end_date && today > cal.q2_end_date) return 'Q3';
      if (cal.q1_end_date && today > cal.q1_end_date) return 'Q2';
      return 'Q1';
    }
    // Fallback: mes del año (España: sep–dic Q1, ene–mar Q2, abr–jun Q3)
    const m = new Date().getMonth() + 1;
    if (m >= 9) return 'Q1';
    if (m <= 3) return 'Q2';
    return 'Q3';
  };
  const QUARTER_ORDER = { Q1: 1, Q2: 2, Q3: 3 };

  const isPaceOverdue = (p) => {
    const DONE = ['evaluated', 'cancelled', 'approved'];
    if (DONE.includes(p.status) || p.grade_obtained != null) return false;
    const today = new Date().toISOString().slice(0, 10);
    if (p.due_date && p.due_date < today) return true;
    const curQ = getCurrentQuarter();
    if ((QUARTER_ORDER[p.quarter] || 0) < (QUARTER_ORDER[curQ] || 0)) return true;
    return false;
  };

  const isPaceCompleted = (p) => {
    return ['evaluated', 'cancelled', 'approved'].includes(p.status) || p.grade_obtained != null;
  };

  // Evaluaciones vencidas calculadas con lógica quarter-based.
  // DEBE ir DESPUÉS de isPaceCompleted e isPaceOverdue para evitar ReferenceError.
  const computedOverduePaces = paceProjection.filter(
    (p) => (children || []).some((c) => c.id === p.student_id) && !isPaceCompleted(p) && isPaceOverdue(p)
  );

  const getStudentStats = (childId) => {
    const childPaces = paceProjection.filter((p) => p.student_id === childId);
    const completed  = childPaces.filter(isPaceCompleted).length;
    const overdue    = childPaces.filter((p) => !isPaceCompleted(p) && isPaceOverdue(p)).length;
    return { completed, planned: childPaces.length, overdue, isOnTrack: overdue === 0 };
  };

  const getChildPaymentsStatus = (childId) => {
    const childPayments = paymentStatus.filter((p) => p.student_id === childId);
    // Solo pending/overdue cuentan como saldo adeudado
    const pendingPayments = childPayments.filter(
      (p) => ['pending', 'overdue'].includes((p.status || '').toLowerCase())
    );
    const saldoPendiente = pendingPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const hasPendingBalance = pendingPayments.length > 0;

    return {
      saldoPendiente,
      hasPendingBalance,
      pendingPayments,
      childPayments,
    };
  };

  // ── Descarga inline ES/EN desde tarjeta ──────────────────────────────────
  const handleCardDownloadDoc = async (child, docType, lang) => {
    const key = `${docType}-${child.id}-${lang}`;
    setDownloadingDoc(key);
    setDocDropdownOpen(null);
    try {
      const { data: rawSettings } = await supabase.from('institutional_settings').select('*').limit(1).single();
      const settingsWithImages = await preloadImages(rawSettings);
      if (docType === 'pei') {
        const pei = officialDocuments.peis.find((d) => d.student_id === child.id);
        if (!pei) { toast({ title: 'PEI no publicado', variant: 'destructive' }); return; }
        const { generatePeiPDF } = await import('@/lib/peiPdf');
        const { data: paces } = await supabase.from('pei_pace_projections').select('*').eq('pei_id', pei.id);
        generatePeiPDF({ pei, paces: paces || [], student: child, settings: settingsWithImages, lang });
      } else if (docType === 'carta') {
        const letter = officialDocuments.letters.find((d) => d.student_id === child.id);
        if (!letter) { toast({ title: 'Carta no publicada', variant: 'destructive' }); return; }
        const { generateEnrollmentLetterPDF } = await import('@/lib/enrollmentLetterPdf');
        generateEnrollmentLetterPDF({ letter, student: child, settings: settingsWithImages, lang });
      } else if (docType === 'contrato') {
        const contract = officialDocuments.contracts.find((d) => d.student_id === child.id);
        if (!contract) { toast({ title: 'Contrato no publicado', variant: 'destructive' }); return; }
        const { generateContractPDF } = await import('@/lib/contractPdf');
        generateContractPDF({ contract, student: child, settings: settingsWithImages, lang });
      }
    } catch (err) {
      console.error('[CardDocDownload]', err);
      toast({ title: 'Error al generar documento', description: err.message, variant: 'destructive' });
    } finally {
      setDownloadingDoc(null);
    }
  };

  const loadData = async () => {
    if (!profile?.id) return;

    setIsLoading(true);
    setPendingLink(false);

    try {
      // ── Relación familia→hijos ────────────────────────────────────────────────
      // Intento 1: family_id = profile.id (UUID de la fila profiles)
      // Intento 2: family_id = profile.user_id (auth.uid — perfiles modernos)
      // Intento 3: parent_id = profile.id o profile.user_id (esquema alternativo)
      // Esto cubre perfiles legacy donde profiles.id ≠ auth.uid().
      let studentIds = [];
      {
        const primaryId  = profile.id;
        const secondaryId = profile.user_id;

        const { data: fd1, error: e1 } = await supabase
          .from('family_students')
          .select('student_id')
          .eq('family_id', primaryId);

        if (!e1 && fd1 && fd1.length > 0) {
          studentIds = fd1.map((r) => r.student_id);
        } else if (secondaryId && secondaryId !== primaryId) {
          const { data: fd2, error: e2 } = await supabase
            .from('family_students')
            .select('student_id')
            .eq('family_id', secondaryId);

          if (!e2 && fd2 && fd2.length > 0) {
            studentIds = fd2.map((r) => r.student_id);
          } else {
            // Intentar con parent_id si existe la columna
            const { data: fd3 } = await supabase
              .from('family_students')
              .select('student_id')
              .eq('parent_id', primaryId);
            if (fd3 && fd3.length > 0) {
              studentIds = fd3.map((r) => r.student_id);
            } else {
              if (e1) console.error('[ParentDashboard] family_students error:', e1.message);
            }
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      // ── Enlaces operativos y calendario (no fatales; tablas pueden no existir aún) ──
      const orFilter = studentIds.length > 0
        ? `student_id.is.null,student_id.in.(${studentIds.join(',')})`
        : 'student_id.is.null';

      const [linksRes, calRes] = await Promise.all([
        supabase
          .from('operational_links')
          .select('id, title, description, category, url, visible_roles, student_id')
          .eq('is_active', true)
          .contains('visible_roles', ['parent'])
          .or(orFilter)
          .order('display_order', { ascending: true }),
        supabase
          .from('academic_calendars')
          .select('academic_year, start_date, end_date, q1_start_date, q1_end_date, q2_start_date, q2_end_date, q3_start_date, q3_end_date, break_notes, status')
          .eq('academic_year', ACTIVE_SCHOOL_YEAR)
          .maybeSingle(),
      ]);

      setOperationalLinks(linksRes.error ? [] : (linksRes.data || []));
      setSchoolCalendar(calRes.error ? null : (calRes.data || null));

      // ────────────────────────────────────────────────────────────────────────

      if (studentIds.length === 0) {
        setPendingLink(true);
        setChildren([]);
        setStudentSubjects([]);
        setPaymentStatus([]);
        setOfficialDocuments({ peis: [], contracts: [], letters: [], transcripts: [] });
        setPaceProjection([]);
        setIsLoading(false);
        return;
      }

      const [studentsRes, hubsRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, first_name, last_name, grade_level, us_grade_level, school_stage, modality, academic_year, hub_id, created_at, drive_folder_url, expediente_visible_parent')
          .in('id', studentIds)
          .order('last_name', { ascending: true }),
        supabase
          .from('organizations')
          .select('id, name'),
      ]);

      if (studentsRes.error) throw studentsRes.error;

      const loadedChildren = studentsRes.data || [];
      setChildren(loadedChildren);
      setHubs(hubsRes.data || []);


      // student_subjects — tabla real, lanzar error si falla
      const studentSubjectsRes = await supabase
        .from('student_subjects')
        .select(
          'id, student_id, subject_id, subject_name, category, academic_block, pillar_type, grade, quarter, school_year, submitted_at, approval_status, convalidation_status, credit_value, credits, subject_order, comments, convalidation_required, grade_submission_status, grade_review_comment'
        )
        .in('student_id', studentIds)
        .eq('school_year', ACTIVE_SCHOOL_YEAR)
        .in('quarter', QUARTERS.map((quarter) => quarter.id));

      if (studentSubjectsRes.error) throw studentSubjectsRes.error;
      setStudentSubjects(studentSubjectsRes.data || []);

      // Tablas complementarias — errores no fatales. Documentos oficiales vienen de módulos Admin.
      const [paymentStatusRes, paceProjectionRes, officialPeisRes, officialContractsRes, officialLettersRes, officialTranscriptsRes] = await Promise.all([
        supabase.from('student_payments').select('id, student_id, school_year, concept, payment_type, amount, currency, status, balance_status, due_date, paid_at, stripe_payment_link_url, notes').in('student_id', studentIds),
        supabase.from('pei_pace_projections').select('id, student_id, school_year, subject_name, pace_number, quarter, status, projected_completion_date, estimated_delivery_date, pages_per_day').in('student_id', studentIds),
        supabase.from('individualized_education_plans').select('id, student_id, school_year, status').in('student_id', studentIds).eq('status', 'published'),
        supabase.from('enrollment_contracts').select('id, student_id, school_year, status').in('student_id', studentIds).in('status', ['sent', 'signed', 'published']),
        supabase.from('enrollment_letters').select('id, student_id, school_year, status').in('student_id', studentIds).in('status', ['sent', 'published']),
        supabase.from('transcript_records').select('id, student_id, school_year, quarter, status').in('student_id', studentIds).eq('status', 'published'),
      ]);

      setPaymentStatus(paymentStatusRes.error ? [] : (paymentStatusRes.data || []));
      setOfficialDocuments({
        peis: officialPeisRes.error ? [] : (officialPeisRes.data || []),
        contracts: officialContractsRes.error ? [] : (officialContractsRes.data || []),
        letters: officialLettersRes.error ? [] : (officialLettersRes.data || []),
        transcripts: officialTranscriptsRes.error ? [] : (officialTranscriptsRes.data || []),
      });
      // pei_pace_projections — map due_date para compatibilidad legacy
      setPaceProjection(
        paceProjectionRes.error ? [] : (paceProjectionRes.data || []).map(p => ({
          ...p,
          due_date: p.estimated_delivery_date || p.projected_completion_date || null,
          completion_date: p.projected_completion_date || null,
          pillar_type: p.pillar_type || '',
        }))
      );
    } catch (err) {
      console.error('ParentDashboard loadData error:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del portal de padres.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEntriesChanged = async (updatedSubject) => {
    await loadData();

    if (!updatedSubject?.id) return;

    setSelectedStudentSubjectForEntries((current) => {
      if (!current || current.id !== updatedSubject.id) return current;
      return { ...current, grade: updatedSubject.grade };
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[rgb(25,61,109)]" />
        <span className="font-bold text-slate-600 text-lg">Cargando...</span>
      </div>
    );
  }

  const parentName = profile?.first_name || profile?.full_name || 'Tutor';
  const localLogo = localStorage.getItem('app_logo');
  const defaultLogo =
    'https://horizons-cdn.hostinger.com/fecf9528-708e-4a5b-9228-805062d89fe9/d9778ccb909ddc8597ac3c64740796e6.png';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!logoError ? (
              <img
                src={localLogo || defaultLogo}
                alt="CA"
                onError={() => setLogoError(true)}
                className="w-12 h-12 object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-[rgb(25,61,109)] rounded-lg flex items-center justify-center text-white font-bold text-lg">
                CA
              </div>
            )}
            <div>
              <h1 className="text-slate-800 font-bold text-sm leading-tight uppercase tracking-wide">
                Portal de Padres
              </h1>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Año académico <span className="text-[#193D6D] font-black">{ACTIVE_SCHOOL_YEAR}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-800 hidden sm:block">{parentName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-sm font-semibold transition-all border border-red-100 hover:border-red-600 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: 'children',      label: '👥 Mis Hijos',         Icon: Users        },
              { id: 'documentos',    label: '📋 Documentos',         Icon: Scale        },
              { id: 'evaluaciones',  label: '📊 Evaluaciones',       Icon: BookOpen     },
              { id: 'boletines',     label: '📄 Boletines',          Icon: null         },
              { id: 'evidencias',    label: 'Evidencias',            Icon: FileUp       },
              { id: 'recursos',      label: 'Recursos',              Icon: Link2        },
              { id: 'alertas',       label: 'Alertas',               Icon: Bell         },
              { id: 'calendario',    label: 'Calendario',            Icon: CalendarDays },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`py-4 px-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === id
                    ? 'border-[rgb(25,61,109)] text-[rgb(25,61,109)]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children.length === 0 && !['recursos', 'alertas', 'calendario'].includes(activeTab) ? (
          profile?.role === ROLES.PARENT ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Hourglass className="w-10 h-10 animate-pulse" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">⏳ Pendiente de vinculación por Admin</h3>
              <p className="text-slate-500 mt-4 text-lg leading-relaxed">
                Su cuenta ha sido creada exitosamente, pero el administrador aún necesita vincular a sus hijos a este perfil.
                Por favor, contacte a administración o espere a que se complete el proceso.
              </p>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center shadow-sm max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-slate-800">No hay hijos registrados</h3>
              <p className="text-slate-500 mt-4 text-lg leading-relaxed">
                No se encontraron estudiantes vinculados a este perfil.
              </p>
            </div>
          )
        ) : children.length === 0 ? (
          /* Secciones globales accesibles aunque no haya hijos vinculados aún */
          <div className="space-y-4">
            {activeTab === 'recursos' && <ParentRecursosPanel links={operationalLinks} />}
            {activeTab === 'alertas' && <ParentAlertasPanel studentChildren={children} paceProjection={paceProjection} computedOverdue={computedOverduePaces} />}
            {activeTab === 'calendario' && <ParentCalendarioPanel calendar={schoolCalendar} />}
          </div>
        ) : (
          <>
            {activeTab === 'children' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {children.map((child) => {
                  const stats = getStudentStats(child.id);
                  const childPaces = paceProjection.filter((p) => p.student_id === child.id);
                  const currentPaceRecord = childPaces[0] || null;

                  const { hasPendingBalance, saldoPendiente } = getChildPaymentsStatus(child.id);

                  const hasPeiPublished = hasOfficialPei(child.id);
                  const hasEnrollmentPublished = hasOfficialEnrollmentLetter(child.id);
                  const hasContractOfficial = hasOfficialContract(child.id);
                  const hasBulletinPublished = hasOfficialTranscript(child.id);

                  return (
                    <div
                      key={child.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                    >
                      <div className="p-6 border-b flex-1 bg-white border-slate-100">
                        <h3 className="font-black text-2xl mb-1" style={{ color: '#193D6D' }}>
                          {child.first_name} {child.last_name}
                        </h3>

                        {/* Ficha académica rápida */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {child.academic_year && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">
                              {child.academic_year}
                            </span>
                          )}
                          {child.modality && (
                            <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-md text-xs font-bold border border-teal-100">
                              {child.modality}
                            </span>
                          )}
                          {child.hub_id && hubs.find(h => h.id === child.hub_id) && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-xs font-bold">
                              {hubs.find(h => h.id === child.hub_id).name}
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-bold text-slate-500 uppercase mb-3 tracking-wider">
                          {child.grade_level ? `${child.grade_level}` : ''}
                          {child.grade_level && child.us_grade_level ? ' · ' : ''}
                          {child.us_grade_level || (!child.grade_level ? 'Sin grado asignado' : '')}
                        </p>

                        {/* Expediente digital */}
                        {child.drive_folder_url && child.expediente_visible_parent && (
                          <a
                            href={child.drive_folder_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm font-bold text-blue-700 hover:bg-blue-100 transition-colors mb-3"
                          >
                            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z"/>
                            </svg>
                            Ver Expediente Digital en Drive ↗
                          </a>
                        )}

                        <div className="space-y-3">
                          {currentPaceRecord ? (
                            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
                              <Activity className="w-8 h-8 shrink-0" style={{ color: '#193D6D' }} />
                              <div>
                                <p className="text-sm font-black uppercase tracking-wider" style={{ color: '#193D6D' }}>
                                  Progreso de Evaluaciones
                                </p>
                                <p className="text-xs font-bold mt-0.5" style={{ color: '#20B2AA' }}>
                                  Evaluación actual: #{currentPaceRecord.pace_number || 'N/A'} | Estado:{' '}
                                  {currentPaceRecord.status || 'N/A'}
                                  <br />
                                  Proyección: {formatDate(currentPaceRecord.due_date || currentPaceRecord.completion_date)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-sm">
                              <CheckCircle2 className="w-8 h-8 text-slate-400 shrink-0" />
                              <div>
                                <p className="text-sm font-black text-slate-600 uppercase tracking-wider">
                                  Estado Académico
                                </p>
                                <p className="text-xs font-bold text-slate-500 mt-0.5">
                                  {stats.planned > 0
                                    ? `${stats.completed}/${stats.planned} evaluaciones proyectadas`
                                    : 'Sin evaluaciones proyectadas'}
                                </p>
                              </div>
                            </div>
                          )}

                          {hasPendingBalance && (
                            <div className="flex items-center gap-3 p-4 bg-red-100 border border-red-200 rounded-xl shadow-sm">
                              <AlertCircle className="w-8 h-8 text-red-600 shrink-0" />
                              <div>
                                <p className="text-sm font-black text-red-800 uppercase tracking-wider">
                                  🚨 Pagos Pendientes
                                </p>
                                <p className="text-xs font-bold text-red-600 mt-0.5">
                                  Saldo pendiente: {saldoPendiente.toFixed(2)} €
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Tira de progreso compacta (sin lista) ── */}
                      {stats.planned > 0 && stats.overdue > 0 && (
                        <div className="mx-6 mb-3 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <p className="text-xs font-bold text-red-700">
                            {stats.overdue} evaluación{stats.overdue !== 1 ? 'es' : ''} vencida{stats.overdue !== 1 ? 's' : ''} — pulse "Ver Evaluaciones"
                          </p>
                        </div>
                      )}

                      <div className="p-4 bg-slate-50 grid grid-cols-2 lg:grid-cols-3 gap-2 shrink-0">
                        <button
                          onClick={() => setActiveTab('boletines')}
                          title={hasBulletinPublished ? 'Ver boletines oficiales publicados' : 'Aún no hay boletines publicados.'}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all group ${
                            hasBulletinPublished
                              ? 'bg-white border-slate-200 hover:shadow-md'
                              : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <FileText className={`w-5 h-5 transition-transform ${hasBulletinPublished ? 'group-hover:scale-110 text-[#193D6D]' : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold text-center ${hasBulletinPublished ? 'text-slate-700' : 'text-slate-500'}`}>
                            {hasBulletinPublished ? 'Boletines oficiales' : 'Aún no hay boletines publicados.'}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedChildId(child.id);
                            setEvalQFilter('all');
                            setEvalSubjFilter('all');
                            setEvalStatusFilter('all');
                            setPaceProjectionModal({ childId: child.id, childName: `${child.first_name} ${child.last_name}` });
                          }}
                          className="p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group relative"
                        >
                          <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform text-[#20B2AA]" />
                          <span className="text-xs font-bold text-slate-700">Ver Evaluaciones</span>
                          {stats.overdue > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                              {stats.overdue > 9 ? '9+' : stats.overdue}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedChildId(child.id);
                            setIsPaymentModalOpen(true);
                          }}
                          className={`p-3 bg-white rounded-xl border transition-all group hover:shadow-md flex flex-col items-center gap-2 ${
                            hasPendingBalance ? 'border-red-300 hover:border-red-500' : 'border-slate-200'
                          }`}
                        >
                          <CreditCard
                            className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                              hasPendingBalance ? 'text-red-600' : 'text-slate-600'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-700">Pagos</span>
                        </button>

                        {/* ── PEI oficial ES/EN ── */}
                        <div className="relative">
                          {hasPeiPublished ? (
                            <button
                              onClick={() => setDocDropdownOpen(docDropdownOpen === `pei|${child.id}` ? null : `pei|${child.id}`)}
                              className="w-full p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                            >
                              {downloadingDoc?.startsWith(`pei-${child.id}`)
                                ? <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                                : <Download className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />}
                              <span className="text-xs font-bold text-slate-700">PEI oficial</span>
                            </button>
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 opacity-60 flex flex-col items-center gap-2">
                              <Hourglass className="w-5 h-5 text-slate-400" />
                              <span className="text-xs font-bold text-center text-slate-500">PEI pendiente</span>
                            </div>
                          )}
                          {docDropdownOpen === `pei|${child.id}` && (
                            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                              <button onClick={() => handleCardDownloadDoc(child, 'pei', 'es')} className="w-full px-3 py-2 text-xs font-bold text-left hover:bg-slate-50 text-slate-700">🇪🇸 Español</button>
                              <button onClick={() => handleCardDownloadDoc(child, 'pei', 'en')} className="w-full px-3 py-2 text-xs font-bold text-left hover:bg-slate-50 text-slate-700">🇬🇧 English</button>
                            </div>
                          )}
                        </div>

                        {/* ── Carta de matrícula ES/EN ── */}
                        <div className="relative">
                          {hasEnrollmentPublished ? (
                            <button
                              onClick={() => setDocDropdownOpen(docDropdownOpen === `carta|${child.id}` ? null : `carta|${child.id}`)}
                              className="w-full p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                            >
                              {downloadingDoc?.startsWith(`carta-${child.id}`)
                                ? <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                : <FileSignature className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />}
                              <span className="text-xs font-bold text-slate-700">Carta matrícula</span>
                            </button>
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 opacity-60 flex flex-col items-center gap-2">
                              <Hourglass className="w-5 h-5 text-slate-400" />
                              <span className="text-xs font-bold text-center text-slate-500">Carta pendiente</span>
                            </div>
                          )}
                          {docDropdownOpen === `carta|${child.id}` && (
                            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                              <button onClick={() => handleCardDownloadDoc(child, 'carta', 'es')} className="w-full px-3 py-2 text-xs font-bold text-left hover:bg-slate-50 text-slate-700">🇪🇸 Español</button>
                              <button onClick={() => handleCardDownloadDoc(child, 'carta', 'en')} className="w-full px-3 py-2 text-xs font-bold text-left hover:bg-slate-50 text-slate-700">🇬🇧 English</button>
                            </div>
                          )}
                        </div>

                        {/* ── Contrato oficial ES/EN ── */}
                        <div className="relative">
                          {hasContractOfficial ? (
                            <button
                              onClick={() => setDocDropdownOpen(docDropdownOpen === `contrato|${child.id}` ? null : `contrato|${child.id}`)}
                              className="w-full p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                            >
                              {downloadingDoc?.startsWith(`contrato-${child.id}`)
                                ? <Loader2 className="w-5 h-5 animate-spin text-[#193D6D]" />
                                : <Scale className="w-5 h-5 text-[#193D6D] group-hover:scale-110 transition-transform" />}
                              <span className="text-xs font-bold text-slate-700">Contrato</span>
                            </button>
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 opacity-60 flex flex-col items-center gap-2">
                              <Hourglass className="w-5 h-5 text-slate-400" />
                              <span className="text-xs font-bold text-center text-slate-500">Contrato pendiente</span>
                            </div>
                          )}
                          {docDropdownOpen === `contrato|${child.id}` && (
                            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 overflow-hidden">
                              <button onClick={() => handleCardDownloadDoc(child, 'contrato', 'es')} className="w-full px-3 py-2 text-xs font-bold text-left hover:bg-slate-50 text-slate-700">🇪🇸 Español</button>
                              <button onClick={() => handleCardDownloadDoc(child, 'contrato', 'en')} className="w-full px-3 py-2 text-xs font-bold text-left hover:bg-slate-50 text-slate-700">🇬🇧 English</button>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setSelectedChildId(child.id);
                            setActiveTab('evidencias');
                          }}
                          title="Reportar evidencias académicas para revisión Chanak"
                          className="p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                        >
                          <FileUp className="w-5 h-5 text-[#193D6D] group-hover:scale-110 transition-transform" />
                          <span className="text-xs font-bold text-slate-700 text-center leading-tight">Evidencias</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'legal' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
                <h2 className="font-black text-lg mb-2">Módulo legacy desactivado</h2>
                <p className="text-sm font-medium">
                  Los documentos oficiales ahora se gestionan desde Administración y se consultan en la pestaña Documentos Oficiales.
                </p>
                <button
                  onClick={() => setActiveTab('documentos')}
                  className="mt-4 px-4 py-2 bg-[#193D6D] hover:bg-[#142d5a] text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Ir a Documentos Oficiales
                </button>
              </div>
            )}

            {activeTab === 'evaluaciones' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-blue-900">
                  <div className="flex items-start gap-3">
                    <BookOpen className="w-5 h-5 mt-0.5 shrink-0 text-blue-600" />
                    <div>
                      <h2 className="font-black text-lg">Evaluaciones por trimestre</h2>
                      <p className="text-sm font-medium mt-1">
                        Aquí puedes consultar las notas parciales de las materias de tu hijo/a.
                        Las calificaciones son registradas por los tutores y validadas por la coordinación de Chanak Academy.
                        Este registro es un proceso interno de seguimiento académico; el boletín oficial lo emite Chanak al cierre de cada trimestre.
                      </p>
                    </div>
                  </div>
                </div>
                {children.map((child) => {
                  const childSubjects = getChildSubjects(child.id, selectedAcademicQuarter);
                  return (
                    <div key={child.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-black text-slate-800 text-lg">{child.first_name} {child.last_name}</h3>
                          <p className="text-xs text-slate-500 font-bold mt-0.5">{child.grade_level || ''}{child.grade_level && child.us_grade_level ? ' · ' : ''}{child.us_grade_level || ''}</p>
                        </div>
                        <select
                          value={selectedAcademicQuarter}
                          onChange={(e) => setSelectedAcademicQuarter(e.target.value)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-700"
                        >
                          {QUARTERS.map((q) => <option key={q.id} value={q.id}>{q.id}</option>)}
                        </select>
                      </div>
                      {childSubjects.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 text-sm italic">
                          Sin materias registradas para {selectedAcademicQuarter}.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {childSubjects.map((subject) => {
                            const statusMap = {
                              approved:           { label: 'Aprobado',          cls: 'bg-emerald-100 text-emerald-700' },
                              submitted:          { label: 'En revisión',       cls: 'bg-amber-100 text-amber-700' },
                              rejected:           { label: 'Observado',         cls: 'bg-red-100 text-red-700' },
                              revision_requested: { label: 'Corrección solicit.', cls: 'bg-orange-100 text-orange-700' },
                              draft:              { label: 'Pendiente',         cls: 'bg-slate-100 text-slate-500' },
                            };
                            const st = statusMap[subject.grade_submission_status || 'draft'];
                            return (
                              <button
                                key={subject.id}
                                onClick={() => {
                                  setSelectedStudentSubjectForEntries(subject);
                                  setSelectedChildId(child.id);
                                  setIsGradeEntriesModalOpen(true);
                                }}
                                className="w-full p-4 text-left hover:bg-slate-50 transition-colors group"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="font-bold text-slate-800 group-hover:text-[#193D6D]">{subject.subject_name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {subject.academic_block || subject.category || 'General'}
                                      {subject.grade != null ? ` · Promedio: ${Number(subject.grade).toFixed(1)}` : ''}
                                    </p>
                                  </div>
                                  <span className={`shrink-0 text-xs font-black px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'boletines' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-slate-700">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 mt-0.5 shrink-0 text-slate-500" />
                    <div>
                      <h2 className="font-black text-lg text-slate-800">Boletines oficiales</h2>
                      <p className="text-sm font-medium mt-1">
                        Los boletines académicos son documentos oficiales emitidos por Chanak Academy una vez cerrado el trimestre.
                        Solo la coordinación puede publicarlos. Cuando estén disponibles podrás descargarlos en formato PDF.
                      </p>
                    </div>
                  </div>
                </div>
                <ParentBoletinesPanel studentChildren={children} />
              </div>
            )}

            {activeTab === 'documentos' && (
              <ParentDocumentosPanel studentChildren={children} />
            )}

            {activeTab === 'evidencias' && (
              <div className="space-y-4">
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 text-teal-900">
                  <div className="flex items-start gap-3">
                    <FileUp className="w-5 h-5 mt-0.5 shrink-0 text-teal-600" />
                    <div>
                      <h2 className="font-black text-lg">Reporte de evidencias académicas</h2>
                      <p className="text-sm font-medium mt-1">
                        La familia actúa como supervisor primario de aprendizaje. Aquí puedes reportar las evidencias de las
                        evaluaciones completadas por tu hijo/a. Chanak Academy revisa y valida cada evidencia antes de registrarla
                        oficialmente. Este formulario no crea notas finales directamente.
                      </p>
                    </div>
                  </div>
                </div>
                <ParentEvidencePanel
                  studentChildren={children}
                  studentSubjects={studentSubjects}
                  initialStudentId={selectedChildId}
                />
              </div>
            )}

            {activeTab === 'recursos' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-5 h-5 text-blue-600" />
                  <h2 className="font-black text-xl text-slate-800">Recursos y accesos</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Enlaces y plataformas habilitados por administración para tu familia.
                </p>
                <ParentRecursosPanel links={operationalLinks} />
              </div>
            )}

            {activeTab === 'alertas' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  <h2 className="font-black text-xl text-slate-800">Alertas del portal</h2>
                </div>
                <ParentAlertasPanel studentChildren={children} paceProjection={paceProjection} computedOverdue={computedOverduePaces} />
              </div>
            )}

            {activeTab === 'calendario' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  <h2 className="font-black text-xl text-slate-800">Calendario escolar</h2>
                </div>
                <ParentCalendarioPanel calendar={schoolCalendar} />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-6 flex justify-center">
        <Link
          to="/ayuda"
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:border-slate-300 bg-white transition-colors"
        >
          ? Ayuda
        </Link>
      </footer>

      {/* ── Modal Evaluaciones proyectadas PEI ── */}
      {paceProjectionModal && (() => {
        const { childId, childName } = paceProjectionModal;
        const childPaces = paceProjection.filter((p) => p.student_id === childId);

        // Materias únicas para filtro
        const subjectOptions = [...new Set(childPaces.map((p) => p.subject_name))].sort();

        // Filtrado
        const filtered = childPaces.filter((p) => {
          if (evalQFilter !== 'all' && p.quarter !== evalQFilter) return false;
          if (evalSubjFilter !== 'all' && p.subject_name !== evalSubjFilter) return false;
          if (evalStatusFilter === 'completed' && !isPaceCompleted(p)) return false;
          if (evalStatusFilter === 'overdue'   && (isPaceCompleted(p) || !isPaceOverdue(p))) return false;
          if (evalStatusFilter === 'pending'   && (isPaceCompleted(p) || isPaceOverdue(p)))  return false;
          return true;
        });

        // Agrupar por Quarter → por Materia
        const byQ = { Q1: {}, Q2: {}, Q3: {} };
        filtered.forEach((p) => {
          const q = p.quarter;
          if (!byQ[q]) return;
          if (!byQ[q][p.subject_name]) byQ[q][p.subject_name] = [];
          byQ[q][p.subject_name].push(p);
        });

        const DONE_STATUSES = ['evaluated', 'approved', 'cancelled'];
        const statusBadge = (p) => {
          if (isPaceCompleted(p)) return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">✓ Completada</span>;
          if (isPaceOverdue(p))   return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">⚠ Vencida</span>;
          return <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500">Pendiente</span>;
        };

        const totalCompleted = childPaces.filter(isPaceCompleted).length;
        const totalOverdue   = childPaces.filter((p) => !isPaceCompleted(p) && isPaceOverdue(p)).length;
        const totalPending   = childPaces.length - totalCompleted - totalOverdue;

        return (
          <div className="fixed inset-0 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-[#193D6D] shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-lg text-white">Evaluaciones proyectadas</h3>
                    <p className="text-xs text-blue-200 mt-0.5">{childName}</p>
                  </div>
                  <button onClick={() => setPaceProjectionModal(null)} className="text-blue-200 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Stats strip */}
                <div className="flex gap-4 mt-3">
                  {[
                    { label: 'Total', val: childPaces.length, cls: 'text-blue-200' },
                    { label: 'Completadas', val: totalCompleted, cls: 'text-emerald-300' },
                    { label: 'Vencidas', val: totalOverdue, cls: totalOverdue > 0 ? 'text-red-300' : 'text-blue-200' },
                    { label: 'Pendientes', val: totalPending, cls: 'text-slate-300' },
                  ].map(({ label, val, cls }) => (
                    <div key={label} className="text-center">
                      <p className={`text-lg font-black leading-none ${cls}`}>{val}</p>
                      <p className="text-[9px] text-blue-300 font-bold uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filtros */}
              <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-2 shrink-0">
                {/* Quarter */}
                <div className="flex gap-1">
                  {['all','Q1','Q2','Q3'].map((q) => (
                    <button key={q} onClick={() => setEvalQFilter(q)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${evalQFilter === q ? 'bg-[#193D6D] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'}`}>
                      {q === 'all' ? 'Todos' : q}
                    </button>
                  ))}
                </div>
                {/* Estado */}
                <div className="flex gap-1">
                  {[['all','Todos'],['completed','Completadas'],['overdue','Vencidas'],['pending','Pendientes']].map(([v, l]) => (
                    <button key={v} onClick={() => setEvalStatusFilter(v)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${evalStatusFilter === v ? 'bg-[#193D6D] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
                {/* Materia */}
                <select value={evalSubjFilter} onChange={(e) => setEvalSubjFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700">
                  <option value="all">Todas las materias</option>
                  {subjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Contenido scrolleable */}
              <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                    <p className="font-bold">Sin evaluaciones para este filtro.</p>
                  </div>
                ) : (
                  ['Q1','Q2','Q3'].map((q) => {
                    const subjMap = byQ[q];
                    const subjNames = Object.keys(subjMap);
                    if (!subjNames.length) return null;
                    return (
                      <div key={q}>
                        <h4 className="font-black text-slate-700 text-sm mb-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-[#193D6D] text-white rounded-lg text-xs">{q}</span>
                          Trimestre {q.replace('Q','')}
                        </h4>
                        <div className="space-y-3">
                          {subjNames.sort().map((subj) => (
                            <div key={subj} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{subj}</span>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {subjMap[subj].map((p) => (
                                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2">
                                    <span className="font-bold text-sm text-slate-800">
                                      #{p.pace_number}
                                    </span>
                                    {p.pages_per_day && (
                                      <span className="text-[10px] text-slate-400 font-medium">{p.pages_per_day} pág/día</span>
                                    )}
                                    {p.due_date && (
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        Est. {new Date(p.due_date).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}
                                      </span>
                                    )}
                                    {statusBadge(p)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500 font-medium">
                  Para enviar evidencias de una evaluación, use la pestaña <strong>Evidencias</strong>.
                  Las materias de <strong>Extensión Local</strong> se reportan con tareas mensuales.
                  Las de <strong>Life Skills</strong> con proyectos trimestrales.
                  Las notas finales son validadas por Chanak.
                </p>
                <button onClick={() => setPaceProjectionModal(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-xl font-bold text-sm hover:bg-slate-300">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Payment Details Modal */}
      {isPaymentModalOpen && (() => {
        const child = children.find((c) => c.id === selectedChildId);
        const { hasPendingBalance, saldoPendiente, childPayments } = getChildPaymentsStatus(selectedChildId);

        const CONCEPT_LABELS_MODAL = {
          matricula:              'Matrícula',
          paquete_curricular:     'Paquete curricular',
          mensualidad:            'Mensualidad',
          materiales_adicionales: 'Materiales adicionales',
          evaluacion:             'Evaluación',
          otro:                   'Otro',
        };
        const STATUS_BADGE = {
          pending:     'bg-amber-100 text-amber-700',
          overdue:     'bg-red-100 text-red-700',
          paid:        'bg-emerald-100 text-emerald-700',
          scholarship: 'bg-blue-100 text-blue-700',
          waived:      'bg-purple-100 text-purple-700',
          cancelled:   'bg-slate-100 text-slate-500',
          refunded:    'bg-orange-100 text-orange-700',
        };
        const STATUS_LABEL = {
          pending:     'Pendiente',
          overdue:     'Vencido',
          paid:        'Pagado',
          scholarship: 'Beca',
          waived:      'Exonerado',
          cancelled:   'Cancelado',
          refunded:    'Reembolsado',
        };

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <h3 className="font-black text-lg flex items-center gap-2 text-slate-800">
                  <CreditCard className="w-5 h-5 text-emerald-600" /> Pagos — {child?.first_name} {child?.last_name}
                </h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-3">
                {/* Saldo pendiente total */}
                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-700 font-bold text-sm">Saldo pendiente total:</span>
                  <span className={`text-xl font-black ${hasPendingBalance ? 'text-red-600' : 'text-emerald-600'}`}>
                    {saldoPendiente.toFixed(2)} €
                  </span>
                </div>

                {/* Lista de pagos */}
                {childPayments.length === 0 ? (
                  <p className="text-slate-400 text-sm italic text-center py-4">
                    No hay pagos registrados para este estudiante.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {childPayments.map((p) => {
                      const status       = (p.status || 'pending').toLowerCase();
                      const isPending    = ['pending', 'overdue'].includes(status);
                      const isExempt     = ['scholarship', 'waived'].includes(status);
                      const concept      = p.concept || p.payment_type || 'otro';
                      const conceptLabel = CONCEPT_LABELS_MODAL[concept] || concept;
                      const amount       = Number(p.amount || 0);
                      const currency     = p.currency || 'EUR';
                      const currencySymbol = currency === 'EUR' ? '€' : '$';

                      return (
                        <div key={p.id} className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-800 text-sm">{conceptLabel}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[status] || 'bg-slate-100 text-slate-600'}`}>
                              {STATUS_LABEL[status] || status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span className="font-black text-slate-800">{amount.toFixed(2)} {currencySymbol}</span>
                            {p.due_date && (
                              <span className="text-xs text-slate-400">
                                Vence: {new Date(p.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>

                          {/* Acciones según estado */}
                          {isPending && p.stripe_payment_link_url ? (
                            <a
                              href={p.stripe_payment_link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" /> Pagar ahora
                            </a>
                          ) : isPending ? (
                            <p className="text-xs text-slate-500 italic bg-slate-50 rounded-lg p-2 text-center">
                              Pago pendiente. Contacte con administración para recibir el enlace de pago.
                            </p>
                          ) : isExempt ? (
                            <p className="text-xs font-bold text-blue-600 bg-blue-50 rounded-lg p-2 text-center">
                              Beca / Exonerado
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-full py-2.5 bg-slate-200 text-slate-800 rounded-lg font-bold hover:bg-slate-300 transition-colors shadow-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Subject Selection Modal */}
      {subjectSelectionStep && (() => {
        const availableSubjects = getChildSubjects(selectedChildId, selectedAcademicQuarter);
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2" style={{ color: '#193D6D' }}>
                  <BookOpen className="w-5 h-5" style={{ color: '#20B2AA' }} /> Seleccionar Materia
                </h3>
              </div>
              
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">
                    Quarter académico
                  </label>
                  <select
                    value={selectedAcademicQuarter}
                    onChange={(e) => setSelectedAcademicQuarter(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800"
                  >
                    {QUARTERS.map((quarter) => (
                      <option key={quarter.id} value={quarter.id}>
                        {quarter.id}
                      </option>
                    ))}
                  </select>
                </div>

                {availableSubjects.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">
                    Aún no hay calificaciones aprobadas para {selectedAcademicQuarter}.
                  </p>
                ) : (
                  availableSubjects.map((subject) => {
                    const statusMap = {
                      approved:  { label: 'Aprobado',    cls: 'bg-emerald-100 text-emerald-700' },
                      submitted: { label: 'En revisión', cls: 'bg-amber-100 text-amber-700' },
                      rejected:  { label: 'Observado',   cls: 'bg-red-100 text-red-700' },
                      draft:     { label: 'Pendiente',   cls: 'bg-slate-100 text-slate-500' },
                    };
                    const st = statusMap[subject.grade_submission_status || 'draft'];
                    return (
                      <button
                        key={subject.id}
                        onClick={() => {
                          setSelectedStudentSubjectForEntries(subject);
                          setSubjectSelectionStep(false);
                          setIsGradeEntriesModalOpen(true);
                        }}
                        className="w-full p-4 text-left border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-[#20B2AA] transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-slate-800 group-hover:text-[#20B2AA]">{subject.subject_name}</p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{subject.category || 'General'}</p>
                      </button>
                    );
                  })
                )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSubjectSelectionStep(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-bold hover:bg-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Grade Entries Manager Modal */}
      {isGradeEntriesModalOpen && selectedStudentSubjectForEntries && (() => {
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-black text-lg text-slate-800">
                  Evaluaciones y Reporte Familiar — {selectedStudentSubjectForEntries.subject_name} · {selectedStudentSubjectForEntries.quarter}
                </h3>
                <button
                  onClick={() => setIsGradeEntriesModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                {/* canEdit={true}: GradeEntriesManager bloquea edición internamente
                    cuando grade_submission_status es 'submitted' o 'approved'.
                    El padre puede ingresar notas (draft) y enviarlas a revisión (submitted).
                    El coordinador/tutor luego aprueba o rechaza desde su panel. */}
                <GradeEntriesManager
                  studentSubject={selectedStudentSubjectForEntries}
                  canEdit={true}
                  enteredByRole={profile?.role || 'parent'}
                  onEntriesChanged={handleEntriesChanged}
                />
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setIsGradeEntriesModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-bold hover:bg-slate-300"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
