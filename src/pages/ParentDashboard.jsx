
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
  Printer,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import LegalDocuments from '@/pages/LegalDocuments';
import GradeEntriesManager from '@/components/GradeEntriesManager';
import { ACTIVE_SCHOOL_YEAR, BLOCK_ORDER, QUARTERS, dedupeAcademicSubjects, normalizeBlock } from '@/lib/academicUtils';

export default function ParentDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);

  const [activeTab, setActiveTab] = useState('children');
  const [children, setChildren] = useState([]);
  const [pendingLink, setPendingLink] = useState(false);

  const [studentSubjects, setStudentSubjects] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState([]);
  const [documentRecords, setDocumentRecords] = useState([]);
  const [paceProjection, setPaceProjection] = useState([]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isBulletinModalOpen, setIsBulletinModalOpen] = useState(false);
  const [isPeiModalOpen, setIsPeiModalOpen] = useState(false);
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);

  const [isGradeEntriesModalOpen, setIsGradeEntriesModalOpen] = useState(false);
  const [selectedStudentSubjectForEntries, setSelectedStudentSubjectForEntries] = useState(null);
  const [subjectSelectionStep, setSubjectSelectionStep] = useState(false);
  const [selectedAcademicQuarter, setSelectedAcademicQuarter] = useState('Q1');

  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedDocumentChildId, setSelectedDocumentChildId] = useState('');
  const [legalSelectedChildId, setLegalSelectedChildId] = useState('');

  useEffect(() => {
    if (!profile) return;

    if (profile.role !== ROLES.PARENT) {
      navigate('/login');
      return;
    }

    loadData();
  }, [profile, navigate]);

  const hasDocument = (childId, type) => {
    return documentRecords.some(
      (d) => d.student_id === childId && d.document_type?.toLowerCase() === type.toLowerCase()
    );
  };

  const getPeiDocument = (childId) => {
    return documentRecords.find(
      (d) => d.student_id === childId && d.document_type === 'pei'
    );
  };

  const getChildById = (childId) => {
    return children.find((c) => c.id === childId);
  };

  const getChildSubjects = (childId, quarter = selectedAcademicQuarter) => {
    const raw = studentSubjects.filter(
      (s) =>
        s.student_id === childId &&
        s.school_year === ACTIVE_SCHOOL_YEAR &&
        s.quarter === quarter
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
      const { data: familyData, error: familyError } = await supabase
        .from('family_students')
        .select('student_id')
        .eq('family_id', profile.id);

      if (familyError) throw familyError;

      const studentIds = familyData?.map((fd) => fd.student_id) || [];

      if (studentIds.length === 0) {
        setPendingLink(true);
        setChildren([]);
        setStudentSubjects([]);
        setPaymentStatus([]);
        setDocumentRecords([]);
        setPaceProjection([]);
        setIsLoading(false);
        return;
      }

      const { data: validStudents, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, us_grade_level, created_at, family_id')
        .in('id', studentIds)
        .order('last_name', { ascending: true });

      if (studentsError) throw studentsError;

      const loadedChildren = validStudents || [];
      setChildren(loadedChildren);

      if (loadedChildren.length > 0) {
        setLegalSelectedChildId(loadedChildren[0].id);
      }

      const [
        studentSubjectsRes,
        paymentStatusRes,
        documentRecordsRes,
        paceProjectionRes
      ] = await Promise.all([
        supabase
          .from('student_subjects')
          .select(
            'id, student_id, subject_id, subject_name, category, academic_block, pillar_type, grade, quarter, school_year, submitted_at, approval_status, convalidation_status, credit_value, credits, subject_order, comments, convalidation_required'
          )
          .in('student_id', studentIds)
          .eq('school_year', ACTIVE_SCHOOL_YEAR)
          .in('quarter', QUARTERS.map((quarter) => quarter.id)),
        supabase
          .from('payment_status')
          .select('id, student_id, family_id, billing_month, due_date, due_amount, paid_amount, status, restriction_flag, warning_message')
          .in('student_id', studentIds),
        supabase
          .from('document_records')
          .select('id, student_id, family_id, document_type, title, file_url, created_at, school_year, quarter')
          .in('student_id', studentIds),
        supabase
          .from('student_pace_projection')
          .select('id, student_id, school_year, pillar_type, subject_name, pace_number, quarter, status, due_date, completion_date')
          .in('student_id', studentIds)
      ]);

      if (studentSubjectsRes.error) throw studentSubjectsRes.error;
      if (paymentStatusRes.error) throw paymentStatusRes.error;
      if (documentRecordsRes.error) throw documentRecordsRes.error;
      if (paceProjectionRes.error) throw paceProjectionRes.error;

      setStudentSubjects(studentSubjectsRes.data || []);
      setPaymentStatus(paymentStatusRes.data || []);
      setDocumentRecords(documentRecordsRes.data || []);
      setPaceProjection(paceProjectionRes.data || []);
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
              onClick={() => setActiveTab('legal')}
              className={`py-4 px-2 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'legal'
                  ? 'border-[rgb(25,61,109)] text-[rgb(25,61,109)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Scale className="w-5 h-5" /> 📋 Documentos Legales
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {children.length === 0 ? (
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
        ) : (
          <>
            {activeTab === 'children' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {children.map((child) => {
                  const stats = getStudentStats(child.id);
                  const childPaces = paceProjection.filter((p) => p.student_id === child.id);
                  const currentPaceRecord = childPaces[0] || null;

                  const { hasPendingBalance, saldoPendiente } = getChildPaymentsStatus(child.id);

                  const peiDoc = getPeiDocument(child.id);
                  const hasEnrollment = documentRecords.some(
                    (d) => d.student_id === child.id && d.document_type?.toLowerCase() === 'enrollment_confirmation'
                  );
                  const hasContract = documentRecords.some(
                    (d) => d.student_id === child.id && d.document_type?.toLowerCase() === 'contract'
                  );

                  return (
                    <div
                      key={child.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                    >
                      <div className="p-6 border-b flex-1 bg-white border-slate-100">
                        <h3 className="font-black text-2xl mb-2" style={{ color: '#193D6D' }}>
                          {child.first_name} {child.last_name}
                        </h3>

                        <p className="text-sm font-bold text-slate-500 uppercase mb-4 tracking-wider">
                          Nivel (US): {child.us_grade_level || 'N/A'}
                        </p>

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
                          onClick={() => {
                            setSelectedChildId(child.id);
                            setIsBulletinModalOpen(true);
                          }}
                          className="p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                        >
                          <FileText className="w-5 h-5 group-hover:scale-110 transition-transform text-[#193D6D]" />
                          <span className="text-xs font-bold text-slate-700">Boletín</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedChildId(child.id);
                            setSubjectSelectionStep(true);
                          }}
                          className="p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                        >
                          <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform text-[#20B2AA]" />
                          <span className="text-xs font-bold text-slate-700">Registrar Evaluaciones</span>
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

                        {peiDoc?.file_url ? (
                          <button
                            onClick={() => {
                              setSelectedDocumentChildId(child.id);
                              setIsPeiModalOpen(true);
                            }}
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                          >
                            <Download className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-slate-700">Ver PEI</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 opacity-60 flex flex-col items-center gap-2 cursor-not-allowed"
                          >
                            <Hourglass className="w-5 h-5 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500">PEI Pendiente</span>
                          </button>
                        )}

                        {hasEnrollment && (
                          <button
                            onClick={() => {
                              setSelectedDocumentChildId(child.id);
                              setIsEnrollmentModalOpen(true);
                            }}
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                          >
                            <FileSignature className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-slate-700">Matrícula</span>
                          </button>
                        )}

                        {hasContract && (
                          <button
                            onClick={() => {
                              setLegalSelectedChildId(child.id);
                              setActiveTab('legal');
                            }}
                            className="p-3 bg-white rounded-xl border border-slate-200 hover:shadow-md flex flex-col items-center gap-2 transition-all group"
                          >
                            <Scale className="w-5 h-5 text-[#193D6D] group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-bold text-slate-700">Contrato</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'legal' && (
              <div className="space-y-6">
                {children.length > 1 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <label className="font-bold text-slate-700">Seleccionar Estudiante:</label>
                    <select
                      value={legalSelectedChildId}
                      onChange={(e) => setLegalSelectedChildId(e.target.value)}
                      className="p-2 border border-slate-300 rounded-lg text-slate-800 font-medium outline-none transition-all"
                    >
                      {children.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {legalSelectedChildId && (
                  <LegalDocuments
                    studentId={legalSelectedChildId}
                    parentId={profile.id}
                    parentName={profile.first_name}
                  />
                )}
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

      {/* Bulletin Modal */}
      {isBulletinModalOpen && (() => {
        const child = getChildById(selectedChildId);
        const sortedSubjects = getChildSubjects(selectedChildId, 'Q1');

        const grouped = {};
        BLOCK_ORDER.forEach((block) => {
          grouped[block] = [];
        });

        sortedSubjects.forEach((s) => {
          const block = normalizeBlock(s.academic_block);
          if (!grouped[block]) grouped[block] = [];
          grouped[block].push(s);
        });

        const coreGrades = grouped['Core A.C.E.']
          .map((s) => parseFloat(s.grade))
          .filter((g) => !isNaN(g) && g > 0);

        const gpa =
          coreGrades.length > 0
            ? (coreGrades.reduce((a, b) => a + b, 0) / coreGrades.length).toFixed(2)
            : 'N/A';

        const totalCreditsEarned = sortedSubjects
          .filter((s) => {
            const status = (s.convalidation_status || s.approval_status || '').toLowerCase();
            return status === 'approved' || status === 'convalidado';
          })
          .reduce((sum, s) => sum + (parseFloat(s.credit_value || s.credits) || 0), 0);

        const totalCreditsInProgress = sortedSubjects
          .filter((s) => {
            const status = (s.convalidation_status || s.approval_status || '').toLowerCase();
            return status === 'pending' || status === 'en proceso' || status === 'submitted' || !status;
          })
          .reduce((sum, s) => sum + (parseFloat(s.credit_value || s.credits) || 0), 0);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <style type="text/css" media="print">
              {`
                body * { visibility: hidden; }
                #printable-bulletin, #printable-bulletin * { visibility: visible; }
                #printable-bulletin { position: absolute; left: 0; top: 0; width: 100%; height: 100%; box-shadow: none; border: none; }
                .print-hide { display: none !important; }
                @page { margin: 10mm; }
              `}
            </style>

            <div id="printable-bulletin" className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative print:bg-white print:max-h-none print:w-full">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print-hide">
                <h3 className="font-black text-lg text-[#193D6D]">Vista Previa del Boletín (Q1)</h3>
                <button onClick={() => setIsBulletinModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible">
                <div className="max-w-3xl mx-auto flex flex-col min-h-full">
                  <div className="flex-1">
                    <div className="text-center mb-8">
                      <img src={localLogo || defaultLogo} alt="Logo" className="h-20 mx-auto mb-4 object-contain" />
                      <h1 className="text-2xl font-black uppercase tracking-wider" style={{ color: '#193D6D' }}>
                        BOLETÍN ACADÉMICO - Q1
                      </h1>
                      <p className="text-slate-600 font-bold mt-1">Chanak International Academy</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-slate-50 border border-slate-200 rounded-xl print:bg-transparent print:border-none print:p-0">
                      <div>
                        <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Estudiante</p>
                        <p className="font-black text-lg text-slate-800">
                          {child?.first_name} {child?.last_name}
                        </p>
                      </div>
                      <div className="text-right print:text-left">
                        <p className="text-sm text-slate-500 uppercase font-bold tracking-wider mb-1">Nivel (US) / Año</p>
                        <p className="font-black text-lg text-slate-800">
                          {child?.us_grade_level || 'N/A'} • {ACTIVE_SCHOOL_YEAR}
                        </p>
                      </div>
                    </div>

                    {sortedSubjects.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-bold text-lg">No academic records yet</p>
                        <p className="text-sm text-slate-400 mt-1">
                          No hay materias registradas para Q1 del periodo {ACTIVE_SCHOOL_YEAR}.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {BLOCK_ORDER.map((blockName) => {
                          const blockSubjects = grouped[blockName];
                          if (!blockSubjects || blockSubjects.length === 0) return null;

                          return (
                            <div key={blockName} className="rounded-xl border border-slate-200 overflow-hidden">
                              <div className="bg-[#193D6D] px-4 py-2">
                                <h4 className="font-bold text-white tracking-wider uppercase text-sm">{blockName}</h4>
                              </div>
                              <table className="w-full text-left border-collapse bg-white">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                                  <tr>
                                    <th className="p-3 font-bold">Materia</th>
                                    <th className="p-3 font-bold text-center w-32">Grade</th>
                                    <th className="p-3 font-bold text-right w-40">Detalles</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {blockSubjects.map((sub, idx) => {
                                    const isApproved =
                                      (sub.convalidation_status || '').toLowerCase() === 'convalidado' ||
                                      (sub.convalidation_status || '').toLowerCase() === 'approved';

                                    const isLocalExt =
                                      blockName === 'Extensión Local' ||
                                      blockName === 'Local Validation / Foreign Language';

                                    return (
                                      <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-slate-800">{sub.subject_name}</td>
                                        <td className="p-3 text-center font-bold text-[#193D6D]">
                                          {sub.grade !== null && sub.grade !== undefined
                                            ? `${sub.grade}${blockName === 'Core A.C.E.' || blockName === 'Core Credits' ? '%' : ''}`
                                            : blockName === 'Life Skills' || blockName === 'Life Skills & Leadership'
                                            ? 'In Progress'
                                            : '-'}
                                        </td>
                                        <td className="p-3 text-right">
                                          {isLocalExt ? (
                                            <span className={`text-xs font-bold ${isApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
                                              {isApproved ? '🟢 Convalidado' : '🟡 Pendiente'}
                                            </span>
                                          ) : blockName === 'Electives' ? (
                                            <span className="text-xs font-bold text-slate-600">
                                              {sub.credit_value || sub.credits || 0} Créditos
                                            </span>
                                          ) : (
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                              sub.approval_status === 'approved'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-slate-100 text-slate-600'
                                            }`}>
                                              {sub.approval_status === 'approved' ? 'Aprobado' : 'Pendiente'}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })}

                        <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="text-center md:text-left">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">GPA (Core)</p>
                            <p className="text-3xl font-black text-[#193D6D] mt-1">{gpa}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Credits Earned</p>
                            <p className="text-3xl font-black text-emerald-600 mt-1">{totalCreditsEarned}</p>
                          </div>
                          <div className="text-center md:text-right">
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Credits In Progress</p>
                            <p className="text-3xl font-black text-amber-500 mt-1">{totalCreditsInProgress}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-20 pt-8 flex flex-col items-center pb-8">
                    <div className="w-64 border-t-2 border-slate-800 mb-3"></div>
                    <p className="font-serif text-xl font-bold text-slate-900 tracking-wide">Mariela Andrade</p>
                    <p className="font-serif text-md italic text-slate-600 mb-1">Head of School</p>
                    <p className="font-sans text-sm font-bold text-[#193D6D] uppercase tracking-widest">
                      Chanak International Academy
                    </p>
                  </div>

                  <div className="mt-auto border-t border-slate-200 text-center text-sm text-slate-500 pt-4">
                    <p>Documento generado el {new Date().toLocaleDateString('es-ES')}</p>
                    <p className="mt-1">Este boletín es un documento informativo parcial y no reemplaza el transcript oficial.</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 print-hide">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-[#193D6D] hover:bg-[#122e54] text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer className="w-5 h-5" /> Imprimir / Guardar PDF
                </button>
                <button
                  onClick={() => setIsBulletinModalOpen(false)}
                  className="flex-1 py-3 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-xl font-bold shadow-sm transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PEI Modal */}
      {isPeiModalOpen && (() => {
        const child = getChildById(selectedDocumentChildId);
        const peiDoc = getPeiDocument(selectedDocumentChildId);

        const isStorage = peiDoc?.file_url?.includes('storage');
        const signatureName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Mariela Andrade';
        const signatureRole = profile?.role === 'coordinator' ? 'Coordinador Académico' : 'Academic Staff';

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <style type="text/css" media="print">
              {`
                body * { visibility: hidden; }
                #printable-pei, #printable-pei * { visibility: visible; }
                #printable-pei { position: absolute; left: 0; top: 0; width: 100%; height: 100%; box-shadow: none; border: none; }
                .print-hide { display: none !important; }
              `}
            </style>

            <div id="printable-pei" className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative print:bg-white print:max-h-none print:w-full">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print-hide">
                <h3 className="font-black text-lg text-purple-700">Verificación PEI</h3>
                <button onClick={() => setIsPeiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible">
                <div className="max-w-2xl mx-auto flex flex-col min-h-full">
                  <div className="flex-1 space-y-8">
                    <div className="text-center">
                      <img src={localLogo || defaultLogo} alt="Logo" className="h-24 mx-auto mb-4 object-contain" />
                      <h1 className="text-3xl font-black uppercase tracking-wider text-[#193D6D]">Chanak International Academy</h1>
                      <h2 className="text-xl font-bold text-slate-600 mt-2">Plan Educativo Individualizado (PEI)</h2>
                    </div>

                    <div className="h-1 w-full bg-[#20B2AA] rounded-full print:bg-[#20B2AA] !important" style={{ printColorAdjust: 'exact' }}></div>

                    <div className="text-justify space-y-6 text-lg text-slate-800 leading-relaxed font-serif">
                      <p>
                        Por medio de la presente, la dirección académica de Chanak International Academy certifica que:
                      </p>

                      <p className="text-xl text-center font-black text-[#193D6D] p-6 bg-slate-50 border border-slate-200 rounded-xl print:bg-transparent print:border-none">
                        {child?.first_name} {child?.last_name}
                      </p>

                      <p>
                        Cursando actualmente el nivel académico <strong>{child?.us_grade_level || 'N/A'} (US)</strong>, se encuentra amparado bajo un Plan Educativo Individualizado (PEI) activo y validado por nuestra institución para el año escolar lectivo <strong>2025-2026</strong>.
                      </p>

                      <p>
                        El estudiante cumple con las normativas internacionales de educación en casa con currículo estructurado y adaptaciones pertinentes según su perfil vocacional y objetivos a largo plazo.
                      </p>
                    </div>

                    <div className="mt-8 p-6 bg-slate-50 border border-slate-200 rounded-xl print-hide">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" /> Documento Oficial
                      </h4>
                      {peiDoc?.file_url ? (
                        <div className="flex items-center justify-between p-4 bg-white border border-emerald-200 rounded-lg shadow-sm">
                          <div>
                            <p className="font-bold text-emerald-700">PEI Oficial Disponible</p>
                            <p className="text-sm text-slate-500">El documento ha sido cargado y está listo para descarga o visualización.</p>
                          </div>
                          <a
                            href={peiDoc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-colors"
                          >
                            {isStorage ? (
                              <>
                                <Download className="w-5 h-5" /> Descargar PDF
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-5 h-5" /> Abrir Enlace
                              </>
                            )}
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg shadow-sm">
                          <Hourglass className="w-6 h-6 text-amber-600 shrink-0" />
                          <div>
                            <p className="font-bold text-amber-800">Documento oficial en proceso</p>
                            <p className="text-sm text-amber-700">El PEI certificado está siendo generado o validado por coordinación académica.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-24 pt-8 flex flex-col items-center pb-8">
                    <div className="w-64 border-t-2 border-slate-800 mb-3"></div>
                    <p className="font-serif text-xl font-bold text-slate-900 tracking-wide">{signatureName || 'Mariela Andrade'}</p>
                    <p className="font-serif text-md italic text-slate-600 mb-1">{signatureRole}</p>
                    <p className="font-sans text-sm font-bold text-[#193D6D] uppercase tracking-widest">Chanak International Academy</p>
                  </div>

                  <div className="mt-auto border-t border-slate-200 text-center text-sm text-slate-500 pt-4">
                    <p>Documento emitido el {formatDate(new Date())}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 print-hide">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer className="w-5 h-5" /> Imprimir PEI
                </button>
                <button
                  onClick={() => setIsPeiModalOpen(false)}
                  className="flex-1 py-3 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-xl font-bold shadow-sm transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Enrollment Confirmation Modal */}
      {isEnrollmentModalOpen && (() => {
        const child = getChildById(selectedDocumentChildId);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <style type="text/css" media="print">
              {`
                body * { visibility: hidden; }
                #printable-enrollment, #printable-enrollment * { visibility: visible; }
                #printable-enrollment { position: absolute; left: 0; top: 0; width: 100%; height: 100%; box-shadow: none; border: none; }
                .print-hide { display: none !important; }
              `}
            </style>

            <div id="printable-enrollment" className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col relative print:bg-white print:max-h-none print:w-full">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center print-hide">
                <h3 className="font-black text-lg text-emerald-700">Documento de Matrícula</h3>
                <button onClick={() => setIsEnrollmentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible">
                <div className="max-w-3xl mx-auto flex flex-col min-h-full">
                  <div className="flex-1 space-y-8">
                    <div className="text-center">
                      <img src={localLogo || defaultLogo} alt="Logo" className="h-24 mx-auto mb-4 object-contain" />
                      <h1 className="text-3xl font-black uppercase tracking-wider text-[#193D6D]">Chanak International Academy</h1>
                      <p className="text-sm font-bold text-[#20B2AA] tracking-widest uppercase mt-1">FLDOE #134620</p>
                      <h2 className="text-2xl font-bold text-slate-800 mt-6 border-b-2 border-slate-200 inline-block pb-2">
                        CONFIRMACIÓN OFICIAL DE MATRÍCULA
                      </h2>
                    </div>

                    <div className="text-justify space-y-6 text-lg text-slate-800 leading-relaxed font-serif mt-10">
                      <p>A quien corresponda:</p>
                      <p>
                        Por medio de la presente, la dirección académica de <strong>Chanak International Academy</strong> certifica formal y oficialmente que el estudiante mencionado a continuación se encuentra debidamente registrado y matriculado en nuestra institución para el año escolar lectivo <strong>2025-2026</strong>.
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mt-8 mb-8 print:bg-transparent print:border-none print:p-0">
                      <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                        <div>
                          <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Nombre del Estudiante</p>
                          <p className="font-black text-xl text-[#193D6D]">{child?.first_name} {child?.last_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Nivel Académico (US)</p>
                          <p className="font-black text-xl text-slate-800">{child?.us_grade_level || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Año Escolar</p>
                          <p className="font-black text-xl text-slate-800">2025-2026</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 uppercase font-bold tracking-wider">Fecha de Emisión</p>
                          <p className="font-black text-xl text-slate-800">{formatDate(new Date())}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-justify space-y-6 text-lg text-slate-800 leading-relaxed font-serif">
                      <p>
                        Esta certificación acredita el registro formal bajo la normativa internacional correspondiente. El estudiante cursa su plan de estudios mediante nuestro programa oficial, cumpliendo con los estándares académicos requeridos.
                      </p>
                      <p>
                        Se expide la presente confirmación para los fines legales e institucionales que los interesados consideren pertinentes.
                      </p>
                    </div>
                  </div>

                  <div className="mt-24 pt-8 flex flex-col items-center pb-8">
                    <div className="w-64 border-t-2 border-slate-800 mb-3"></div>
                    <p className="font-serif text-xl font-bold text-slate-900 tracking-wide">Mariela Andrade</p>
                    <p className="font-serif text-md italic text-slate-600 mb-1">Directora Académica</p>
                    <p className="font-sans text-sm font-bold text-[#193D6D] uppercase tracking-widest">Chanak International Academy</p>
                  </div>

                  <div className="mt-auto border-t border-slate-200 text-center text-sm text-slate-500 pt-4">
                    <p>Chanak International Academy - EIN 36-5154011</p>
                    <p>Documento generado el {new Date().toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3 print-hide">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer className="w-5 h-5" /> Imprimir Matrícula
                </button>
                <button
                  onClick={() => setIsEnrollmentModalOpen(false)}
                  className="flex-1 py-3 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-xl font-bold shadow-sm transition-colors"
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
                  availableSubjects.map((subject) => (
                    <button
                      key={subject.id}
                      onClick={() => {
                        setSelectedStudentSubjectForEntries(subject);
                        setSubjectSelectionStep(false);
                        setIsGradeEntriesModalOpen(true);
                      }}
                      className="w-full p-4 text-left border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-[#20B2AA] transition-colors group"
                    >
                      <p className="font-bold text-slate-800 group-hover:text-[#20B2AA]">{subject.subject_name}</p>
                      <p className="text-xs text-slate-500 mt-1">{subject.category || 'General'}</p>
                    </button>
                  ))
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
                <GradeEntriesManager
                  studentSubject={selectedStudentSubjectForEntries}
                  canEdit={true}
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
