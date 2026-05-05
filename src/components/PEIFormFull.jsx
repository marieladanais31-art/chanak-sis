import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { ACTIVE_SCHOOL_YEAR } from '@/lib/academicUtils';
import PaceProjectionTable from './PaceProjectionTable';
import { generatePeiPDF } from '@/lib/peiPdf';
import {
  Save, Loader2, X, ChevronRight,
  FileText, AlertCircle, CheckCircle, ClipboardList,
  BookOpen, Target, Users, MessageSquare, Send, Eye,
  Download, Home, Heart, BarChart3, Award, Briefcase
} from 'lucide-react';

const INPUT    = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const TEXTAREA = INPUT + ' resize-none';
const LABEL    = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const TABS = [
  { id: 'portada',    label: 'Portada',           icon: Home },
  { id: 'perfil',     label: 'Perfil',            icon: Target },
  { id: 'vocacional', label: 'Vocacional',         icon: Briefcase },
  { id: 'diagnostico',label: 'Diagnóstico',       icon: ClipboardList },
  { id: 'plan',       label: 'Plan de Estudios',  icon: BookOpen },
  { id: 'metodologia',label: 'Metodología',       icon: BarChart3 },
  { id: 'paces',      label: 'PACEs',             icon: ChevronRight },
  { id: 'familia',    label: 'Familia',           icon: Heart },
  { id: 'firmas',     label: 'Firmas',            icon: Award },
];

const STATUS_META = {
  draft:     { label: 'Borrador',    color: 'bg-slate-100 text-slate-700',  next: 'in_review',  nextLabel: 'Enviar a revisión', icon: FileText },
  in_review: { label: 'En revisión', color: 'bg-amber-100 text-amber-800',  next: 'approved',   nextLabel: 'Aprobar',          icon: Eye },
  approved:  { label: 'Aprobado',    color: 'bg-blue-100 text-blue-800',    next: 'published',  nextLabel: 'Publicar',         icon: CheckCircle },
  published: { label: 'Publicado',   color: 'bg-green-100 text-green-800',  next: null,         nextLabel: null,               icon: Send },
};

const DEFAULT_FORM = {
  school_year:                ACTIVE_SCHOOL_YEAR,
  quarter:                    'Annual',
  issue_date:                 new Date().toISOString().split('T')[0],
  student_code:               '',
  grade_level:                '',
  coordinator_name:           '',
  // Portada
  student_age:                '',
  student_dob:                '',
  enrollment_date:            '',
  last_grade_completed:       '',
  modality:                   'Off-Campus',
  curriculum_base:            'A.C.E. (Accelerated Christian Education)',
  institutional_intro:        '',
  // Perfil
  strength_areas:             '',
  improvement_areas:          '',
  // Diagnóstico
  initial_diagnosis:          '',
  diagnostic_results:         '',
  diagnostic_interpretation:  '',
  ace_curriculum_description: '',
  // Plan
  subject_plan:               '',
  quarterly_objectives:       '',
  local_extension:            '',
  life_skills:                '',
  // Metodología
  daily_rhythm_methodology:   '',
  estimated_time_daily_load:  '',
  follow_up_strategies:       '',
  follow_up_resources:        '',
  required_adaptations:       '',
  // Familia
  family_message:             '',
  institutional_conclusion:   '',
  coordinator_observations:   '',
  // Vocacional (modelo Daniel)
  vocational_interest:        '',
  strategic_objectives:       '',
  graduation_pathway_notes:   '',
  pace_status_notes:          '',
  vocational_plan:            '',
  // Firmas
  director_signature_name:    '',
  director_signature_date:    '',
  parent_signature_name:      '',
  parent_signature_date:      '',
  status:                     'draft',
};

const INTRO_DEFAULT = 'Este Programa Educativo Individualizado ha sido elaborado por el equipo académico de Chanak International Academy con el propósito de brindar una educación personalizada, basada en el ritmo y las necesidades únicas de cada estudiante.';

const ACE_DEFAULT = 'El currículo A.C.E. (Accelerated Christian Education) es un sistema de autoaprendizaje basado en PACEs (Packet of Accelerated Christian Education). Cada PACE equivale a una unidad de contenido evaluable de 12 lecciones. El estudiante avanza a su propio ritmo bajo la supervisión de un tutor certificado. El diagnóstico inicial determina el nivel real de entrada y sirve como punto de partida para la proyección académica personalizada.';

export default function PEIFormFull({ studentId, studentName, peiId: initialPeiId, onClose, canEdit = false }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('portada');
  const [loading, setLoading]     = useState(!!initialPeiId);
  const [saving, setSaving]       = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [peiId, setPeiId]         = useState(initialPeiId || null);
  const [form, setForm]           = useState(DEFAULT_FORM);

  const [fichaLevels, setFichaLevels] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Always prefill from student ficha (DOB, modality, grade, vocational, etc.)
      const { data: studentData } = await supabase
        .from('students')
        .select('date_of_birth, enrollment_date, last_grade_completed, grade_level, us_grade_level, modality, curriculum_base, vocational_interest, graduation_pathway_notes, diagnostic_notes, parent1_name, diag_math, diag_english, diag_word_building, diag_science, diag_social_studies')
        .eq('id', studentId)
        .single();

      if (studentData) {
        const fichaDefaults = {};
        if (studentData.date_of_birth)            fichaDefaults.student_dob             = studentData.date_of_birth;
        if (studentData.enrollment_date)          fichaDefaults.enrollment_date          = studentData.enrollment_date;
        if (studentData.last_grade_completed)     fichaDefaults.last_grade_completed     = studentData.last_grade_completed;
        if (studentData.grade_level)              fichaDefaults.grade_level              = studentData.us_grade_level || studentData.grade_level;
        if (studentData.modality)                 fichaDefaults.modality                 = studentData.modality;
        if (studentData.curriculum_base)          fichaDefaults.curriculum_base          = studentData.curriculum_base;
        if (studentData.vocational_interest)      fichaDefaults.vocational_interest      = studentData.vocational_interest;
        if (studentData.graduation_pathway_notes) fichaDefaults.graduation_pathway_notes = studentData.graduation_pathway_notes;
        if (studentData.diagnostic_notes)         fichaDefaults.initial_diagnosis        = studentData.diagnostic_notes;
        if (studentData.parent1_name)             fichaDefaults.parent_signature_name    = studentData.parent1_name;
        setForm(prev => ({ ...prev, ...fichaDefaults }));
        setFichaLevels({
          math:          studentData.diag_math          || null,
          english:       studentData.diag_english       || null,
          word_building: studentData.diag_word_building || null,
          science:       studentData.diag_science       || null,
          social_studies:studentData.diag_social_studies|| null,
        });
      }

      if (!initialPeiId) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('individualized_education_plans')
        .select('*')
        .eq('id', initialPeiId)
        .single();
      if (error) throw error;
      setForm(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(data).filter(([k, v]) => k in DEFAULT_FORM && v !== null && v !== undefined)
        ),
      }));
      setPeiId(data.id);
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo cargar el PEI.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [initialPeiId, studentId]);

  useEffect(() => { load(); }, [load]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, student_id: studentId, updated_at: new Date().toISOString() };
      if (peiId) {
        const { error } = await supabase.from('individualized_education_plans').update(payload).eq('id', peiId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('individualized_education_plans').insert([payload]).select('id').single();
        if (error) throw error;
        setPeiId(data.id);
      }
      toast({ title: 'PEI guardado', description: 'Los cambios han sido guardados.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'No se pudo guardar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!peiId) {
      toast({ title: 'Aviso', description: 'Guarda el PEI antes de avanzar el estado.', variant: 'destructive' });
      return;
    }
    const nextStatus = STATUS_META[form.status]?.next;
    if (!nextStatus) return;
    setAdvancing(true);
    try {
      const tsField = { in_review: 'reviewed_at', approved: 'approved_at', published: 'published_at' }[nextStatus];
      const patch = { status: nextStatus, updated_at: new Date().toISOString() };
      if (tsField) patch[tsField] = new Date().toISOString();
      const { error } = await supabase.from('individualized_education_plans').update(patch).eq('id', peiId);
      if (error) throw error;
      setForm(prev => ({ ...prev, status: nextStatus }));
      toast({ title: 'Estado actualizado', description: `PEI en estado: ${STATUS_META[nextStatus].label}` });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAdvancing(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const [pacesRes, settingsRes] = await Promise.all([
        peiId
          ? supabase.from('pei_pace_projections').select('*').eq('pei_id', peiId).order('subject_name').order('quarter').order('pace_number')
          : Promise.resolve({ data: [] }),
        supabase.from('institutional_settings').select('*').limit(1).single(),
      ]);
      const [parts] = (studentName || '').split(' ');
      generatePeiPDF({
        pei: { ...form, id: peiId },
        paces: pacesRes.data || [],
        student: {
          first_name: parts || studentName,
          last_name: (studentName || '').replace(parts + ' ', ''),
        },
        settings: settingsRes.data || null,
      });
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20 bg-white rounded-2xl">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  const status     = STATUS_META[form.status] || STATUS_META.draft;
  const isReadOnly = !canEdit || form.status === 'published';

  return (
    <div className="flex flex-col h-full max-h-[92vh] bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#193D6D] shrink-0">
        <div>
          <h2 className="font-black text-base text-white">Programa Educativo Individualizado (PEI)</h2>
          <p className="text-xs text-blue-200">{studentName} · {form.school_year}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
          <button onClick={handleDownloadPDF} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
          </button>
          <button onClick={onClose} className="text-blue-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── PORTADA ──────────────────────────────────────────────────────── */}
        {activeTab === 'portada' && (
          <div className="space-y-5">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Portada Institucional</p>
              <p className="text-xs text-blue-600">Esta sección genera la carátula del PEI con datos del estudiante e información de ingreso a Chanak.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={LABEL}>Año Escolar</label>
                <select value={form.school_year} onChange={set('school_year')} disabled={isReadOnly} className={INPUT}>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Fecha de Emisión</label>
                <input type="date" value={form.issue_date} onChange={set('issue_date')} disabled={isReadOnly} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Código de Estudiante</label>
                <input type="text" value={form.student_code} onChange={set('student_code')} disabled={isReadOnly} className={INPUT} placeholder="CHA-001" />
              </div>
              <div>
                <label className={LABEL}>Edad</label>
                <input type="text" value={form.student_age} onChange={set('student_age')} disabled={isReadOnly} className={INPUT} placeholder="15 años" />
              </div>
              <div>
                <label className={LABEL}>Fecha de Nacimiento</label>
                <input type="date" value={form.student_dob} onChange={set('student_dob')} disabled={isReadOnly} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Ingreso a Chanak</label>
                <input type="date" value={form.enrollment_date} onChange={set('enrollment_date')} disabled={isReadOnly} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Último Grado Completado</label>
                <input type="text" value={form.last_grade_completed} onChange={set('last_grade_completed')} disabled={isReadOnly} className={INPUT} placeholder="8th Grade" />
              </div>
              <div>
                <label className={LABEL}>Nivel / Grado Actual</label>
                <input type="text" value={form.grade_level} onChange={set('grade_level')} disabled={isReadOnly} className={INPUT} placeholder="9th Grade" />
              </div>
              <div>
                <label className={LABEL}>Modalidad</label>
                <select value={form.modality} onChange={set('modality')} disabled={isReadOnly} className={INPUT}>
                  <option value="Off-Campus">Off-Campus</option>
                  <option value="Dual Diploma">Dual Diploma</option>
                  <option value="On-Campus">On-Campus</option>
                  <option value="Homeschool">Homeschool</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className={LABEL}>Currículo Base</label>
                <input type="text" value={form.curriculum_base} onChange={set('curriculum_base')} disabled={isReadOnly} className={INPUT} placeholder="A.C.E. (Accelerated Christian Education)" />
              </div>
              <div>
                <label className={LABEL}>Coordinador Responsable</label>
                <input type="text" value={form.coordinator_name} onChange={set('coordinator_name')} disabled={isReadOnly} className={INPUT} placeholder="Nombre del coordinador" />
              </div>
            </div>
            <div>
              <label className={LABEL}>Texto Introductorio Institucional</label>
              <textarea rows={4} value={form.institutional_intro || INTRO_DEFAULT} onChange={set('institutional_intro')} disabled={isReadOnly} className={TEXTAREA}
                placeholder={INTRO_DEFAULT} />
            </div>
          </div>
        )}

        {/* ── PERFIL ───────────────────────────────────────────────────────── */}
        {activeTab === 'perfil' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Áreas de Fortaleza</label>
              <textarea rows={5} value={form.strength_areas} onChange={set('strength_areas')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Materias, habilidades y disposiciones en las que el estudiante destaca. Incluir áreas académicas, sociales, artísticas o vocacionales." />
            </div>
            <div>
              <label className={LABEL}>Áreas de Mejora</label>
              <textarea rows={5} value={form.improvement_areas} onChange={set('improvement_areas')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Áreas donde el estudiante necesita apoyo adicional o intervención específica." />
            </div>
          </div>
        )}

        {/* ── VOCACIONAL ───────────────────────────────────────────────────── */}
        {activeTab === 'vocacional' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Perfil Vocacional</p>
              <p className="text-xs text-amber-700">Basado en el modelo de PEI de Daniel Vidal. Define el interés vocacional, estado de PACEs, objetivos estratégicos y ruta de graduación del estudiante.</p>
            </div>
            <div>
              <label className={LABEL}>Interés Principal / Área Vocacional</label>
              <input
                type="text"
                value={form.vocational_interest}
                onChange={set('vocational_interest')}
                disabled={isReadOnly}
                className={INPUT}
                placeholder="Ej. Área Financiera (Broker / Finanzas) con enfoque ético · Ingeniería · Medicina · Artes"
              />
            </div>
            <div>
              <label className={LABEL}>Estado Académico Actual — PACE Status</label>
              <textarea
                rows={5}
                value={form.pace_status_notes}
                onChange={set('pace_status_notes')}
                disabled={isReadOnly}
                className={TEXTAREA}
                placeholder={
                  'Describe el nivel actual por asignatura. Ejemplo:\n' +
                  'Mathematics: Math 1081\n' +
                  'English: English 1076\n' +
                  'Word Building: WB 1078\n' +
                  'Science: Science 1078\n' +
                  'Social Studies: Social 1077'
                }
              />
            </div>
            <div>
              <label className={LABEL}>Objetivos Estratégicos del Año</label>
              <textarea
                rows={5}
                value={form.strategic_objectives}
                onChange={set('strategic_objectives')}
                disabled={isReadOnly}
                className={TEXTAREA}
                placeholder={
                  'Enumera los objetivos clave del año. Ejemplo:\n' +
                  '• Progresar de forma continua en todas las asignaturas del sequence ACE.\n' +
                  '• Prioridad: Matemáticas e Inglés por proyección universitaria y perfil financiero.\n' +
                  '• Consolidar vocabulario académico (Word Building) y pensamiento crítico.\n' +
                  '• Introducir educación financiera estructurada, práctica y ética.'
                }
              />
            </div>
            <div>
              <label className={LABEL}>Graduation Pathway — Ruta de Graduación</label>
              <textarea
                rows={5}
                value={form.graduation_pathway_notes}
                onChange={set('graduation_pathway_notes')}
                disabled={isReadOnly}
                className={TEXTAREA}
                placeholder={
                  'Define la ruta estimada hacia la graduación. Ejemplo:\n' +
                  'Edad 13-14 — Consolidación de bases: nivelación matemática y Language Arts.\n' +
                  'Edad 15 — Grade 10 / Diagnóstico: simulacro SAT, definición de créditos High School.\n' +
                  'Edad 16-18 — High School y Graduación: créditos estimados 17-19, transcript completo, Dual Diploma si aplica.'
                }
              />
            </div>
            <div>
              <label className={LABEL}>Plan Vocacional — Lecturas, Práctica &amp; Tech</label>
              <textarea
                rows={7}
                value={form.vocational_plan}
                onChange={set('vocational_plan')}
                disabled={isReadOnly}
                className={TEXTAREA}
                placeholder={
                  'Describe el plan vocacional detallado. Ejemplo:\n\n' +
                  'LECTURAS RECOMENDADAS\n' +
                  '• Padre Rico, Padre Pobre — Robert Kiyosaki\n' +
                  '• El Inversor Inteligente — Benjamin Graham\n' +
                  '• Think and Grow Rich — Napoleon Hill\n\n' +
                  'PRÁCTICA & TECH\n' +
                  '• Simulador de inversiones / paper trading (Investopedia)\n' +
                  '• Khan Academy: Finance & Capital Markets\n' +
                  '• Proyecto práctico: análisis de empresa cotizada\n\n' +
                  'PACING Y EVALUACIÓN\n' +
                  '• Revisión mensual de avance con tutor\n' +
                  '• Entrega de proyecto vocacional al cierre de cada trimestre'
                }
              />
            </div>
          </div>
        )}

        {/* ── DIAGNÓSTICO ──────────────────────────────────────────────────── */}
        {activeTab === 'diagnostico' && (
          <div className="space-y-4">
            {/* Per-subject diagnostic levels from student ficha */}
            {fichaLevels && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Niveles Diagnósticos A.C.E. — desde Ficha del Estudiante</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Mathematics', val: fichaLevels.math },
                    { label: 'English',     val: fichaLevels.english },
                    { label: 'Word Building',val: fichaLevels.word_building },
                    { label: 'Science',     val: fichaLevels.science },
                    { label: 'Social Studies',val: fichaLevels.social_studies },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                      <p className={`font-black text-sm ${val ? 'text-blue-700' : 'text-slate-300'}`}>
                        {val || '—'}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Estos niveles se editan en la Ficha del Estudiante → pestaña Académico.</p>
              </div>
            )}
            <div>
              <label className={LABEL}>Cómo funciona el currículo A.C.E.</label>
              <textarea rows={4} value={form.ace_curriculum_description || ACE_DEFAULT} onChange={set('ace_curriculum_description')} disabled={isReadOnly} className={TEXTAREA}
                placeholder={ACE_DEFAULT} />
            </div>
            <div>
              <label className={LABEL}>Diagnóstico Inicial</label>
              <textarea rows={4} value={form.initial_diagnosis} onChange={set('initial_diagnosis')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Descripción del estado académico inicial del estudiante al momento de ingreso. Contexto, historial académico, necesidades detectadas." />
            </div>
            <div>
              <label className={LABEL}>Resultados del Diagnóstico — PACE de Entrada por Asignatura</label>
              <textarea rows={5} value={form.diagnostic_results} onChange={set('diagnostic_results')} disabled={isReadOnly} className={TEXTAREA}
                placeholder={'Mathematics: Math PACE 1076\nEnglish: English PACE 1075\nWord Building: WB PACE 1074\nScience: Science PACE 1074\nSocial Studies: Social PACE 1073\n\nPuntuaciones y observaciones evaluativas.'} />
            </div>
            <div>
              <label className={LABEL}>Interpretación y Brechas Detectadas</label>
              <textarea rows={4} value={form.diagnostic_interpretation} onChange={set('diagnostic_interpretation')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Análisis de los resultados. Brechas detectadas por asignatura. Estrategias de nivelación y abordaje específico para cada área." />
            </div>
          </div>
        )}

        {/* ── PLAN DE ESTUDIOS ─────────────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Plan de Estudios</label>
              <textarea rows={5} value={form.subject_plan} onChange={set('subject_plan')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Descripción del plan por materia: asignaturas del año, PACEs de inicio proyectados, contenidos prioritarios, metas por trimestre." />
            </div>
            <div>
              <label className={LABEL}>Objetivos Trimestrales</label>
              <textarea rows={4} value={form.quarterly_objectives} onChange={set('quarterly_objectives')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Metas académicas y de desarrollo personal para cada trimestre del año escolar." />
            </div>
            <div>
              <label className={LABEL}>Extensión Local Obligatoria</label>
              <textarea rows={4} value={form.local_extension} onChange={set('local_extension')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Materias, actividades o contenidos requeridos por la normativa educativa local (España / UE) adicionales al currículo A.C.E.: historia local, lengua oficial, etc." />
            </div>
            <div>
              <label className={LABEL}>Life Skills / Desarrollo Integral</label>
              <textarea rows={4} value={form.life_skills} onChange={set('life_skills')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Actividades de habilidades para la vida: deportes, arte, música, servicio comunitario, emprendimiento, idiomas adicionales, educación emocional, etc." />
            </div>
          </div>
        )}

        {/* ── METODOLOGÍA ──────────────────────────────────────────────────── */}
        {activeTab === 'metodologia' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Ritmo, Carga y Metodología</label>
              <textarea rows={5} value={form.daily_rhythm_methodology} onChange={set('daily_rhythm_methodology')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Descripción del ritmo de trabajo: sesiones semanales, horario tipo, método de supervisión del tutor, uso de la plataforma digital, entrega de PACEs, evaluación y scoring." />
            </div>
            <div>
              <label className={LABEL}>Tiempo Estimado y Carga Diaria</label>
              <textarea rows={3} value={form.estimated_time_daily_load} onChange={set('estimated_time_daily_load')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Ej: 4–5 horas diarias de trabajo autónomo. 1 sesión semanal de tutoría de 60 min. PACE completado cada 2–3 semanas. Proyección: 3 PACEs/mes por materia." />
            </div>
            <div>
              <label className={LABEL}>Estrategias de Seguimiento</label>
              <textarea rows={4} value={form.follow_up_strategies} onChange={set('follow_up_strategies')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Frecuencia y método de seguimiento: revisión semanal del tutor, reuniones con padres, uso del SIS, reportes trimestrales, alertas de atraso." />
            </div>
            <div>
              <label className={LABEL}>Recursos y Apoyos</label>
              <textarea rows={3} value={form.follow_up_resources} onChange={set('follow_up_resources')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Materiales: kits A.C.E., diccionario bíblico, atlas, diccionario de Word Building. Tecnología: plataforma SIS, recursos digitales. Apoyos especiales si aplica." />
            </div>
            <div>
              <label className={LABEL}>Adaptaciones Requeridas</label>
              <textarea rows={3} value={form.required_adaptations} onChange={set('required_adaptations')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Adaptaciones curriculares, de evaluación, de tiempo o de entorno necesarias para el estudiante." />
            </div>
          </div>
        )}

        {/* ── PACEs ────────────────────────────────────────────────────────── */}
        {activeTab === 'paces' && (
          <div>
            {peiId ? (
              <PaceProjectionTable
                peiId={peiId}
                studentId={studentId}
                schoolYear={form.school_year}
                canEdit={canEdit && !isReadOnly}
              />
            ) : (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-800">Guarda el PEI primero (pestaña Portada → Guardar) para registrar la proyección de PACEs.</p>
              </div>
            )}
          </div>
        )}

        {/* ── FAMILIA ──────────────────────────────────────────────────────── */}
        {activeTab === 'familia' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Mensaje para la Familia</label>
              <textarea rows={5} value={form.family_message} onChange={set('family_message')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Carta o mensaje dirigido a los padres/tutores explicando el PEI, el rol de la familia en el proceso, expectativas y compromisos mutuos." />
            </div>
            <div>
              <label className={LABEL}>Conclusión Institucional</label>
              <textarea rows={4} value={form.institutional_conclusion} onChange={set('institutional_conclusion')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Declaración institucional final: compromiso de Chanak, marco legal (FLDOE #134620), disponibilidad del equipo académico." />
            </div>
            <div>
              <label className={LABEL}>Observaciones Adicionales del Coordinador</label>
              <textarea rows={4} value={form.coordinator_observations} onChange={set('coordinator_observations')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Notas internas del coordinador: contexto familiar, acuerdos verbales, situaciones especiales, seguimiento requerido." />
            </div>
          </div>
        )}

        {/* ── FIRMAS ───────────────────────────────────────────────────────── */}
        {activeTab === 'firmas' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-bold mb-1">Nota sobre firmas digitales</p>
              <p>Las firmas criptográficas requieren una Edge Function de Supabase (pendiente de implementación). Por ahora, registra los nombres y fechas de firma. El PDF generará espacios de firma impresos.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-xl p-5 space-y-3">
                <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Head of School / Dirección</h4>
                <div>
                  <label className={LABEL}>Nombre del Director(a)</label>
                  <input type="text" value={form.director_signature_name} onChange={set('director_signature_name')} disabled={isReadOnly} className={INPUT} placeholder="Nombre completo" />
                </div>
                <div>
                  <label className={LABEL}>Fecha de Firma</label>
                  <input type="date" value={form.director_signature_date} onChange={set('director_signature_date')} disabled={isReadOnly} className={INPUT} />
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-5 space-y-3">
                <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Padre / Madre / Tutor Legal</h4>
                <div>
                  <label className={LABEL}>Nombre del Tutor Legal</label>
                  <input type="text" value={form.parent_signature_name} onChange={set('parent_signature_name')} disabled={isReadOnly} className={INPUT} placeholder="Nombre completo" />
                </div>
                <div>
                  <label className={LABEL}>Fecha de Firma</label>
                  <input type="date" value={form.parent_signature_date} onChange={set('parent_signature_date')} disabled={isReadOnly} className={INPUT} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {canEdit && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {form.status === 'published' && (
              <span className="flex items-center gap-1 text-green-700 font-bold">
                <CheckCircle className="w-4 h-4" /> Documento publicado — solo lectura
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar borrador
              </button>
            )}
            {status.next && !isReadOnly && (
              <button onClick={handleAdvanceStatus} disabled={advancing}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors">
                {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {status.nextLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
