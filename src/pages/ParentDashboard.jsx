
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
  Link2,
  Bell,
  CalendarDays,
} from 'lucide-react';
import SisAlertsDashboard from '@/components/SisAlertsDashboard';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import GradeEntriesManager from '@/components/GradeEntriesManager';
import { ACTIVE_SCHOOL_YEAR, QUARTERS, dedupeAcademicSubjects } from '@/lib/academicUtils';
import { generateTranscriptPDF } from '@/lib/transcriptPdf';

/* ── Categorías: colores de badge ──────────────────────────────────────────── */
const CAT_COLORS = {
  LMS:        'bg-blue-50 text-blue-700 border-blue-100',
  Drive:      'bg-amber-50 text-amber-700 border-amber-100',
  ACEConnect: 'bg-purple-50 text-purple-700 border-purple-100',
  Expediente: 'bg-teal-50 text-teal-700 border-teal-100',
  Interno:    'bg-slate-100 text-slate-700 border-slate-200',
  Otro:       'bg-gray-50 text-gray-700 border-gray-100',
};

/* ── Recursos / Links operativos ─────────────────────────────────────────── */
function ParentRecursosPanel({ links }) {
  if (!links || links.length === 0) {
    return (
      <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
        No hay recursos disponibles todavía.
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
        Calendario escolar pendiente de configuración.
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

function ParentBoletinesPanel({ studentChildren }) {
  const [transcripts, setTranscripts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(null);

  React.useEffect(() => {
    if (!studentChildren || studentChildren.length === 0) { setLoading(false); return; }
    const ids = studentChildren.map(c => c.id);
    supabase
      .from('transcript_records')
      .select('id, student_id, school_year, quarter, language, status, gpa, academic_observations')
      .in('student_id', ids)
      .eq('status', 'published')
      .order('school_year', { ascending: false })
      .then(({ data }) => { setTranscripts(data || []); setLoading(false); });
  }, [studentChildren]);

  const handleDownload = async (tr) => {
    setDownloading(tr.id);
    try {
      const child = studentChildren.find(c => c.id === tr.student_id);
      const [coursesRes, settingsRes, creditsRes] = await Promise.all([
        supabase.from('transcript_courses').select('*').eq('transcript_id', tr.id),
        supabase.from('institutional_settings').select('*').limit(1).single(),
        supabase.from('student_credits_summary').select('*').eq('student_id', tr.student_id),
      ]);
      generateTranscriptPDF({
        transcript: tr,
        courses: coursesRes.data || [],
        student: child || { id: tr.student_id },
        settings: settingsRes.data || null,
        creditsSummary: creditsRes.data || [],
        lang: tr.language || 'es',
      });
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (transcripts.length === 0) return (
    <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
      No hay boletines publicados todavía.
    </div>
  );

  return (
    <div className="space-y-4">
      {transcripts.map(tr => {
        const child = studentChildren.find(c => c.id === tr.student_id);
        return (
          <div key={tr.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">{child ? `${child.first_name} ${child.last_name}` : 'Estudiante'}</p>
              <p className="text-sm text-slate-500">{tr.school_year} · {tr.quarter} · {tr.language?.toUpperCase() || 'ES'}</p>
            </div>
            <button
              onClick={() => handleDownload(tr)}
              disabled={downloading === tr.id}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
            >
              {downloading === tr.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Descargar PDF
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ParentDocumentosPanel({ studentChildren }) {
  const [peis, setPeis]           = React.useState([]);
  const [contracts, setContracts] = React.useState([]);
  const [letters, setLetters]     = React.useState([]);
  const [loading, setLoading]     = React.useState(true);
  const [downloading, setDownloading] = React.useState(null);

  React.useEffect(() => {
    if (!studentChildren || studentChildren.length === 0) { setLoading(false); return; }
    const ids = studentChildren.map(c => c.id);
    Promise.all([
      supabase.from('individualized_education_plans')
        .select('id, student_id, school_year, quarter, status, issue_date')
        .in('student_id', ids).eq('status', 'published'),
      supabase.from('enrollment_contracts')
        .select('id, student_id, school_year, status, program')
        .in('student_id', ids).in('status', ['sent', 'signed']),
      supabase.from('enrollment_letters')
        .select('id, student_id, school_year, status, program, modality')
        .in('student_id', ids).eq('status', 'published'),
    ]).then(([peiRes, conRes, letRes]) => {
      setPeis(peiRes.data || []);
      setContracts(conRes.data || []);
      setLetters(letRes.data || []);
      setLoading(false);
    });
  }, [studentChildren]);

  const handleDownloadPei = async (pei) => {
    setDownloading(`pei-${pei.id}`);
    try {
      const { generatePeiPDF } = await import('@/lib/peiPdf');
      const child = studentChildren.find(c => c.id === pei.student_id);
      const [pacesRes, settingsRes] = await Promise.all([
        supabase.from('pei_pace_projections').select('*').eq('pei_id', pei.id),
        supabase.from('institutional_settings').select('*').limit(1).single(),
      ]);
      generatePeiPDF({
        pei,
        paces: pacesRes.data || [],
        student: child || { first_name: '', last_name: '' },
        settings: settingsRes.data || null,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadContract = async (contract) => {
    setDownloading(`con-${contract.id}`);
    try {
      const { generateContractPDF } = await import('@/lib/contractPdf');
      const child = studentChildren.find(c => c.id === contract.student_id);
      const { data: settings } = await supabase.from('institutional_settings').select('*').limit(1).single();
      generateContractPDF({
        contract,
        student: child || { first_name: '', last_name: '' },
        settings: settings || null,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadLetter = async (letter) => {
    setDownloading(`let-${letter.id}`);
    try {
      const { generateEnrollmentLetterPDF } = await import('@/lib/enrollmentLetterPdf');
      const child = studentChildren.find(c => c.id === letter.student_id);
      const { data: settings } = await supabase.from('institutional_settings').select('*').limit(1).single();
      generateEnrollmentLetterPDF({
        letter,
        student: child || { first_name: '', last_name: '' },
        settings: settings || null,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#193D6D]" /></div>;

  const allEmpty = peis.length === 0 && contracts.length === 0 && letters.length === 0;

  if (allEmpty) return (
    <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
      No hay documentos oficiales publicados todavía.
    </div>
  );

  const DocRow = ({ icon, title, subtitle, onDownload, dlKey }) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#193D6D]/10 flex items-center justify-center text-[#193D6D] shrink-0">
          {icon}
        </div>
        <div>
          <p className="font-bold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onDownload}
        disabled={downloading === dlKey}
        className="flex items-center gap-2 px-4 py-2 bg-[#193D6D] hover:bg-[#142d5a] text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
      >
        {downloading === dlKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Descargar
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {peis.length > 0 && (
        <div>
          <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#193D6D]" /> Plan Educativo Individualizado (PEI)
          </h3>
          <div className="space-y-3">
            {peis.map(pei => {
              const child = studentChildren.find(c => c.id === pei.student_id);
              return (
                <DocRow key={pei.id}
                  icon={<FileText className="w-5 h-5" />}
                  title={child ? `${child.first_name} ${child.last_name}` : 'Estudiante'}
                  subtitle={`PEI publicado · ${pei.school_year}`}
                  onDownload={() => handleDownloadPei(pei)}
                  dlKey={`pei-${pei.id}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {contracts.length > 0 && (
        <div>
          <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
            <FileSignature className="w-5 h-5 text-blue-600" /> Contratos de Matrícula
          </h3>
          <div className="space-y-3">
            {contracts.map(con => {
              const child = studentChildren.find(c => c.id === con.student_id);
              return (
                <DocRow key={con.id}
                  icon={<FileSignature className="w-5 h-5" />}
                  title={child ? `${child.first_name} ${child.last_name}` : 'Estudiante'}
                  subtitle={`Contrato ${con.status === 'signed' ? 'firmado' : 'enviado'} · ${con.school_year}`}
                  onDownload={() => handleDownloadContract(con)}
                  dlKey={`con-${con.id}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {letters.length > 0 && (
        <div>
          <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-teal-600" /> Cartas de Confirmación de Matrícula
          </h3>
          <div className="space-y-3">
            {letters.map(letter => {
              const child = studentChildren.find(c => c.id === letter.student_id);
              return (
                <DocRow key={letter.id}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  title={child ? `${child.first_name} ${child.last_name}` : 'Estudiante'}
                  subtitle={`Carta publicada · ${letter.school_year}${letter.program ? ` · ${letter.program}` : ''}`}
                  onDownload={() => handleDownloadLetter(letter)}
                  dlKey={`let-${letter.id}`}
                />
              );
            })}
          </div>
        </div>
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

  useEffect(() => {
    if (!profile) return;

    // Aceptar tanto 'parent' como 'family' — son el mismo dashboard
    if (!['parent', 'family'].includes(profile.role)) {
      navigate('/login');
      return;
    }

    loadData();
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

  const getStudentStats = (childId) => {
    const childPaces = paceProjection.filter((p) => p.student_id === childId);
    const completed = childPaces.filter((p) => p.status === 'completed').length;
    const planned = childPaces.length;
    const overdue = childPaces.filter((p) => p.status === 'overdue').length;

    return {
      completed,
      planned,
      overdue,
      isOnTrack: overdue === 0
    };
  };

  const getChildPaymentsStatus = (childId) => {
    const childPayments = paymentStatus.filter((p) => p.student_id === childId);
    const totalDue = childPayments.reduce((sum, p) => sum + Number(p.due_amount || 0), 0);
    const totalPaid = childPayments.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
    const saldoPendiente = Math.max(0, totalDue - totalPaid);
    const hasPendingBalance = childPayments.some(
      (p) =>
        ['pending', 'overdue'].includes((p.status || '').toLowerCase()) ||
        Number(p.due_amount || 0) > Number(p.paid_amount || 0)
    );

    return {
      totalDue,
      totalPaid,
      saldoPendiente,
      hasPendingBalance
    };
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
          console.log('[ParentDashboard] hijos por profile.id:', studentIds.length);
        } else if (secondaryId && secondaryId !== primaryId) {
          const { data: fd2, error: e2 } = await supabase
            .from('family_students')
            .select('student_id')
            .eq('family_id', secondaryId);

          if (!e2 && fd2 && fd2.length > 0) {
            studentIds = fd2.map((r) => r.student_id);
            console.log('[ParentDashboard] hijos por profile.user_id:', studentIds.length);
          } else {
            // Intentar con parent_id si existe la columna
            const { data: fd3 } = await supabase
              .from('family_students')
              .select('student_id')
              .eq('parent_id', primaryId);
            if (fd3 && fd3.length > 0) {
              studentIds = fd3.map((r) => r.student_id);
              console.log('[ParentDashboard] hijos por parent_id:', studentIds.length);
            } else {
              console.warn('[ParentDashboard] No se encontraron hijos. profile.id:', primaryId, 'user_id:', secondaryId);
              if (e1) console.error('[ParentDashboard] family_students error:', e1.message);
            }
          }
        }
      }
      // ────────────────────────────────────────────────────────────────────────

      // ── Links operativos y calendario (no fatales; tablas pueden no existir aún) ──
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
          .eq('status', 'active')
          .maybeSingle(),
      ]);

      setOperationalLinks(linksRes.error ? [] : (linksRes.data || []));
      setSchoolCalendar(calRes.error ? null : (calRes.data || null));

      if (linksRes.error) console.warn('[ParentDashboard] operational_links no disponible:', linksRes.error.message);
      if (calRes.error)   console.warn('[ParentDashboard] academic_calendars no disponible:', calRes.error.message);
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
        supabase.from('payment_status').select('id, student_id, billing_month, due_date, due_amount, paid_amount, status').in('student_id', studentIds),
        supabase.from('pei_pace_projections').select('id, student_id, school_year, subject_name, pace_number, quarter, status, projected_completion_date').in('student_id', studentIds),
        supabase.from('individualized_education_plans').select('id, student_id, school_year, status').in('student_id', studentIds).eq('status', 'published'),
        supabase.from('enrollment_contracts').select('id, student_id, school_year, status').in('student_id', studentIds).in('status', ['sent', 'signed']),
        supabase.from('enrollment_letters').select('id, student_id, school_year, status').in('student_id', studentIds).eq('status', 'published'),
        supabase.from('transcript_records').select('id, student_id, school_year, quarter, status').in('student_id', studentIds).eq('status', 'published'),
      ]);

      setPaymentStatus(paymentStatusRes.error ? [] : (paymentStatusRes.data || []));
      setOfficialDocuments({
        peis: officialPeisRes.error ? [] : (officialPeisRes.data || []),
        contracts: officialContractsRes.error ? [] : (officialContractsRes.data || []),
        letters: officialLettersRes.error ? [] : (officialLettersRes.data || []),
        transcripts: officialTranscriptsRes.error ? [] : (officialTranscriptsRes.data || []),
      });
      // pei_pace_projections no tiene due_date — map para compatibilidad
      setPaceProjection(
        paceProjectionRes.error ? [] : (paceProjectionRes.data || []).map(p => ({
          ...p,
          due_date: p.projected_completion_date || null,
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
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-800 hidden sm:block">{parentName}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-sm font-semibold transition-all border border-red-100 hover:border-red-600 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('children')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'children'
                  ? 'border-[rgb(25,61,109)] text-[rgb(25,61,109)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-5 h-5" /> 👥 Mis Hijos
            </button>
            <button
              onClick={() => setActiveTab('documentos')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'documentos'
                  ? 'border-[rgb(25,61,109)] text-[rgb(25,61,109)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Scale className="w-5 h-5" /> 📋 Documentos Oficiales
            </button>
            <button
              onClick={() => setActiveTab('boletines')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'boletines'
                  ? 'border-[rgb(25,61,109)] text-[rgb(25,61,109)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📄 Boletines
            </button>
            <button
              onClick={() => setActiveTab('documentos')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'documentos'
                  ? 'border-[rgb(25,61,109)] text-[rgb(25,61,109)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              📁 Documentos
            </button>
            <button
              onClick={() => setActiveTab('recursos')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'recursos'
                  ? 'border-[rgb(25,61,109)] text-[rgb(25,61,109)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Link2 className="w-4 h-4" /> Recursos
            </button>
            <button
              onClick={() => setActiveTab('alertas')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'alertas'
                  ? 'border-[rgb(25,61,109)] text-[rgb(25,61,109)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Bell className="w-4 h-4" /> Alertas
            </button>
            <button
              onClick={() => setActiveTab('calendario')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'calendario'
                  ? 'border-[rgb(25,61,109)] text-[rgb(25,61,109)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <CalendarDays className="w-4 h-4" /> Calendario
            </button>
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
            {activeTab === 'alertas' && <SisAlertsDashboard compact={false} />}
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
                                  Progreso PACE
                                </p>
                                <p className="text-xs font-bold mt-0.5" style={{ color: '#20B2AA' }}>
                                  PACE Actual: {currentPaceRecord.pace_number || 'N/A'} | Estado:{' '}
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
                                    ? `${stats.completed}/${stats.planned} PACEs proyectados`
                                    : 'Sin datos de PACE proyectados'}
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
                                  Saldo total adeudado: ${saldoPendiente.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 grid grid-cols-2 lg:grid-cols-3 gap-2 shrink-0">
                        <button
                          onClick={() => hasBulletinPublished && setActiveTab('boletines')}
                          disabled={!hasBulletinPublished}
                          title={hasBulletinPublished ? 'Ver boletines oficiales publicados' : 'No hay boletines publicados todavía.'}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all group ${
                            hasBulletinPublished
                              ? 'bg-white border-slate-200 hover:shadow-md'
                              : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <FileText className={`w-5 h-5 transition-transform ${hasBulletinPublished ? 'group-hover:scale-110 text-[#193D6D]' : 'text-slate-400'}`} />
                          <span className={`text-xs font-bold text-center ${hasBulletinPublished ? 'text-slate-700' : 'text-slate-500'}`}>
                            {hasBulletinPublished ? 'Boletines oficiales' : 'No hay boletines publicados todavía'}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedChildId(child.id);
                            setSubjectSelectionStep(true);
                          }}
                          className="p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                        >
                          <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform text-[#20B2AA]" />
                          <span className="text-xs font-bold text-slate-700">Ver Evaluaciones</span>
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

                        <button
                          onClick={() => hasPeiPublished && setActiveTab('documentos')}
                          disabled={!hasPeiPublished}
                          title={hasPeiPublished ? 'Ver PEI oficial publicado' : 'PEI pendiente'}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all group ${
                            hasPeiPublished
                              ? 'bg-white border-slate-200 hover:shadow-md'
                              : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {hasPeiPublished ? (
                            <Download className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                          ) : (
                            <Hourglass className="w-5 h-5 text-slate-400" />
                          )}
                          <span className={`text-xs font-bold text-center ${hasPeiPublished ? 'text-slate-700' : 'text-slate-500'}`}>
                            {hasPeiPublished ? 'PEI oficial' : 'PEI pendiente'}
                          </span>
                        </button>

                        <button
                          onClick={() => hasEnrollmentPublished && setActiveTab('documentos')}
                          disabled={!hasEnrollmentPublished}
                          title={hasEnrollmentPublished ? 'Ver carta oficial publicada' : 'Confirmación de matrícula pendiente'}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all group ${
                            hasEnrollmentPublished
                              ? 'bg-white border-slate-200 hover:shadow-md'
                              : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {hasEnrollmentPublished ? (
                            <FileSignature className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                          ) : (
                            <Hourglass className="w-5 h-5 text-slate-400" />
                          )}
                          <span className={`text-xs font-bold text-center ${hasEnrollmentPublished ? 'text-slate-700' : 'text-slate-500'}`}>
                            {hasEnrollmentPublished ? 'Carta de matrícula' : 'Confirmación de matrícula pendiente'}
                          </span>
                        </button>

                        <button
                          onClick={() => hasContractOfficial && setActiveTab('documentos')}
                          disabled={!hasContractOfficial}
                          title={hasContractOfficial ? 'Ver contrato oficial enviado o firmado' : 'Contrato pendiente'}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all group ${
                            hasContractOfficial
                              ? 'bg-white border-slate-200 hover:shadow-md'
                              : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          {hasContractOfficial ? (
                            <Scale className="w-5 h-5 text-[#193D6D] group-hover:scale-110 transition-transform" />
                          ) : (
                            <Hourglass className="w-5 h-5 text-slate-400" />
                          )}
                          <span className={`text-xs font-bold text-center ${hasContractOfficial ? 'text-slate-700' : 'text-slate-500'}`}>
                            {hasContractOfficial ? 'Contrato oficial' : 'Contrato pendiente'}
                          </span>
                        </button>

                        {/* Placeholder — subida de evidencias (próximamente) */}
                        <button
                          disabled
                          title="Próximamente: subida de evidencias académicas"
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200 opacity-50 flex flex-col items-center gap-2 cursor-not-allowed"
                        >
                          <ExternalLink className="w-5 h-5 text-slate-400" />
                          <span className="text-xs font-bold text-slate-400 text-center leading-tight">Evidencias<br/>Próx.</span>
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

            {activeTab === 'boletines' && (
              <ParentBoletinesPanel studentChildren={children} />
            )}

            {activeTab === 'documentos' && (
              <ParentDocumentosPanel studentChildren={children} />
            )}

            {activeTab === 'recursos' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 className="w-5 h-5 text-blue-600" />
                  <h2 className="font-black text-xl text-slate-800">Recursos y accesos</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Links y plataformas habilitados por administración para tu familia.
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
                <SisAlertsDashboard compact={false} />
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

      {/* Payment Details Modal */}
      {isPaymentModalOpen && (() => {
        const child = children.find((c) => c.id === selectedChildId);
        const { hasPendingBalance, saldoPendiente } = getChildPaymentsStatus(selectedChildId);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-black text-lg flex items-center gap-2 text-slate-800">
                  <CreditCard className="w-5 h-5 text-emerald-600" /> Detalles Financieros
                </h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="font-bold text-slate-800 text-center mb-4">
                  {child?.first_name} {child?.last_name}
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-800 font-black">Saldo Pendiente:</span>
                    <span className={`text-2xl font-black ${hasPendingBalance ? 'text-red-600' : 'text-emerald-600'}`}>
                      ${saldoPendiente.toFixed(2)}
                    </span>
                  </div>
                </div>

                {hasPendingBalance ? (
                  <div className="flex items-center justify-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 font-bold text-sm rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    🚨 ACCIÓN REQUERIDA: Realizar Pago
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                    Pagos al día. ¡Gracias!
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
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
                    No hay materias disponibles para {selectedAcademicQuarter}.
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
                  Notas Parciales: {selectedStudentSubjectForEntries.subject_name} · {selectedStudentSubjectForEntries.quarter}
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
