import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { generateContractPDF } from '@/lib/contractPdf';
import {
  Save, Loader2, X, Download, ChevronRight,
  FileSignature, Send, Archive
} from 'lucide-react';

const INPUT    = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const TEXTAREA = INPUT + ' resize-none';
const LABEL    = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const STATUS_META = {
  draft:    { label: 'Borrador',  color: 'bg-slate-100 text-slate-700',  next: 'sent',    nextLabel: 'Enviar a Familia', icon: Send },
  sent:      { label: 'Enviado',   color: 'bg-amber-100 text-amber-800',  next: 'signed',    nextLabel: 'Marcar Firmado', icon: FileSignature },
  signed:    { label: 'Firmado',   color: 'bg-blue-100 text-blue-800',    next: 'published', nextLabel: 'Publicar',       icon: FileSignature },
  published: { label: 'Publicado', color: 'bg-green-100 text-green-800',  next: 'archived',  nextLabel: 'Archivar',       icon: Archive },
  archived:  { label: 'Archivado', color: 'bg-slate-200 text-slate-600',  next: null,        nextLabel: null,             icon: Archive },
};

// ── Plantilla base completa Programa Off-Campus ───────────────────────────────
const OFF_CAMPUS_FULL_DEFAULTS = {
  academic_services:
`PRIMERA. OBJETO DEL ACUERDO
El presente acuerdo tiene por objeto la prestación, por parte de CHANAK, de servicios educativos internacionales a través del Programa Off-Campus, que incluye: (a) diagnóstico académico inicial; (b) elaboración del Plan Educativo Individualizado (PEI); (c) provisión de materiales curriculares según el PEI asignado; (d) acceso a las plataformas SIS y LMS de CHANAK; (e) seguimiento académico mensual con mentor asignado; (f) emisión de reportes, boletines y transcript académico; y (g) emisión del High School Diploma estadounidense al cumplir los requisitos del programa.

SEGUNDA. NATURALEZA DEL SERVICIO Y RESPONSABILIDAD LEGAL EN ESPAÑA
Los servicios prestados por CHANAK tienen carácter internacional y complementario. CHANAK actúa exclusivamente como institución educativa registrada en Florida, EE.UU., sin establecimiento físico en España ni actividad docente presencial en territorio español. LA FAMILIA asume plena e íntegra responsabilidad por el cumplimiento de cualesquiera obligaciones que imponga la legislación educativa española vigente, incluidas las relativas a la escolarización obligatoria. CHANAK no asesora, no orienta, ni asume responsabilidad alguna sobre las opciones educativas locales adoptadas por LA FAMILIA en su país de residencia.

TERCERA. DURACIÓN
El presente acuerdo entrará en vigor en la fecha de su firma y tendrá una duración de un (1) año académico, prorrogable automáticamente por períodos anuales salvo que cualquiera de las partes notifique su voluntad de no renovación con un mínimo de treinta (30) días de antelación al término del período en curso.`,

  chanak_responsibilities:
`QUINTA. COMPROMISOS DE CHANAK
CHANAK se compromete a: (a) asignar un mentor académico al estudiante; (b) elaborar el PEI en un plazo máximo de quince (15) días hábiles desde el diagnóstico; (c) garantizar el acceso operativo a las plataformas SIS y LMS; (d) emitir reportes académicos trimestrales; (e) custodiar el expediente académico (Cumulative Record) conforme a los estándares de FLDOE y MSA-CESS; (f) emitir el High School Diploma cuando el estudiante complete los requisitos establecidos.`,

  family_responsibilities:
`SEXTA. COMPROMISOS DE LA FAMILIA
LA FAMILIA se compromete a: (a) supervisar el trabajo académico diario del estudiante conforme al modelo indicado por CHANAK; (b) custodiar las claves de corrección y los PACE Tests bajo su responsabilidad; (c) registrar las calificaciones en el SIS con exactitud y honestidad; (d) mantener las credenciales de acceso a las plataformas en confidencialidad; (e) comunicar a CHANAK cualquier incidencia académica relevante; (f) abonar puntualmente las cuotas establecidas; (g) cumplir de forma autónoma e independiente con cualquier obligación legal o administrativa que la normativa española imponga en materia de educación.`,

  economic_conditions:
`CUARTA. CONDICIONES ECONÓMICAS
Los servicios del Programa Off-Campus quedan sujetos a la siguiente estructura económica, vigente en el momento de la firma y susceptible de actualización anual:

Matrícula de apertura de expediente: 180 €.
Paquete curricular anual: 480 €.
Mensualidad de seguimiento académico: 70 €/mes.

El paquete curricular comprende los materiales académicos base asignados al estudiante conforme a su Plan Educativo Individualizado (PEI), sin perjuicio de ajustes, materiales adicionales o recursos complementarios que pudieran ser necesarios según el diagnóstico académico y la planificación individual del estudiante.

Los pagos se realizarán mediante los métodos habilitados en el portal SIS de CHANAK o por los medios autorizados por la administración institucional. La falta de pago de dos (2) mensualidades consecutivas faculta a CHANAK para suspender temporalmente el acceso a los servicios, sin perjuicio de las obligaciones económicas pendientes.`,

  notes:
`SÉPTIMA. PROTECCIÓN DE DATOS (RGPD / LOPDGDD)
Los datos personales facilitados serán tratados por CHANAK TRAINUP EDUCATION, INC. con la finalidad de gestionar la relación académica y administrativa del estudiante. La base legal del tratamiento es la ejecución del presente contrato. Los datos no serán cedidos a terceros salvo obligación legal. LA FAMILIA tiene derecho de acceso, rectificación, supresión, portabilidad y oposición dirigiéndose a administration@chanakacademy.org. En el caso de estudiantes menores de 18 años, el responsable legal presta el consentimiento en nombre del menor.

OCTAVA. PROPIEDAD INTELECTUAL
Todos los materiales, contenidos, plataformas y documentación académica desarrollados o provistos por CHANAK son propiedad intelectual de CHANAK TRAINUP EDUCATION, INC. o de sus licenciantes. Queda expresamente prohibida su reproducción, distribución o cesión a terceros sin autorización escrita previa.

NOVENA. RESOLUCIÓN DEL CONTRATO
Cualquiera de las partes podrá resolver el presente acuerdo mediante notificación escrita con un preaviso de treinta (30) días naturales. CHANAK podrá resolver de forma inmediata en caso de incumplimiento grave, conducta contraria a los valores institucionales o falsificación de evidencias académicas. La resolución no genera derecho a devolución de cantidades ya abonadas salvo que el incumplimiento sea imputable exclusivamente a CHANAK.

DÉCIMA. LEY APLICABLE Y JURISDICCIÓN
El presente contrato se regirá e interpretará conforme a las leyes del Estado de Florida, Estados Unidos de América, por ser el domicilio de CHANAK. Para cualquier controversia derivada de su interpretación o ejecución, ambas partes se someten, con renuncia a cualquier otro fuero, a los tribunales del condado de Miami-Dade, Florida, EE.UU., sin perjuicio de los derechos que asistan al consumidor conforme a la normativa española de protección de consumidores y usuarios.`,
};

const DEFAULT_FORM = {
  school_year:             '2025-2026',
  family_name:             '',
  tutor_legal:             '',
  program:                 'Off-Campus',
  modality:                'Off-Campus',
  academic_services:       OFF_CAMPUS_FULL_DEFAULTS.academic_services,
  economic_conditions:     OFF_CAMPUS_FULL_DEFAULTS.economic_conditions,
  family_responsibilities: OFF_CAMPUS_FULL_DEFAULTS.family_responsibilities,
  chanak_responsibilities: OFF_CAMPUS_FULL_DEFAULTS.chanak_responsibilities,
  start_date:              '',
  end_date:                '',
  issue_date:              new Date().toISOString().split('T')[0],
  director_signature_name: '',
  director_signature_date: '',
  parent_signature_name:   '',
  parent_signature_date:   '',
  notes:                   OFF_CAMPUS_FULL_DEFAULTS.notes,
  status:                  'draft',
};

export default function ContractManager({ studentId, studentName, contractId: initialId, canEdit = false, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading]         = useState(!!initialId);
  const [saving, setSaving]           = useState(false);
  const [advancing, setAdvancing]     = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [contractId, setContractId]   = useState(initialId || null);
  const [form, setForm]               = useState(DEFAULT_FORM);

  const load = useCallback(async () => {
    if (!initialId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('enrollment_contracts').select('*').eq('id', initialId).single();
      if (error) throw error;
      setForm(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in DEFAULT_FORM && v !== null && v !== undefined)),
      }));
      setContractId(data.id);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar el contrato.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [initialId]);

  const loadStudentFicha = useCallback(async () => {
    if (!studentId || initialId) return;
    const [studentRes, settingsRes] = await Promise.all([
      supabase.from('students').select('parent1_name, modality').eq('id', studentId).single(),
      supabase.from('institutional_settings').select('active_school_year').limit(1).single(),
    ]);
    if (studentRes.data || settingsRes.data) {
      setForm(prev => ({
        ...prev,
        school_year: settingsRes.data?.active_school_year || prev.school_year,
        tutor_legal: studentRes.data?.parent1_name || prev.tutor_legal,
        modality:    studentRes.data?.modality     || prev.modality,
      }));
    }
  }, [studentId, initialId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStudentFicha(); }, [loadStudentFicha]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  // ── Sanitiza campos date: '' → null para evitar error PostgreSQL 22007 ──────
  const CONTRACT_DATE_FIELDS = ['start_date', 'end_date', 'issue_date', 'director_signature_date', 'parent_signature_date'];
  const buildPayload = (overrides = {}) => {
    const raw = { ...form, student_id: studentId, updated_at: new Date().toISOString(), ...overrides };
    CONTRACT_DATE_FIELDS.forEach(f => { if (!raw[f]) raw[f] = null; });
    return raw;
  };

  // ── Persiste el contrato y devuelve el ID (crea si no existe, actualiza si ya existe) ─
  const persistContract = async () => {
    if (!studentId) throw new Error('Selecciona un estudiante antes de guardar.');
    const payload = buildPayload();
    // [DIAG] Log temporal para diagnóstico — eliminar tras resolver
    console.error('[ContractManager:DIAG] payload a enviar:', JSON.stringify(payload, null, 2));
    if (contractId) {
      const { error } = await supabase.from('enrollment_contracts').update(payload).eq('id', contractId);
      if (error) {
        console.error('[ContractManager:DIAG] ERROR en update:', { code: error.code, message: error.message, details: error.details, hint: error.hint, full: error });
        throw error;
      }
      return contractId;
    } else {
      const { data, error } = await supabase.from('enrollment_contracts').insert([payload]).select('id').single();
      if (error) {
        console.error('[ContractManager:DIAG] ERROR en insert:', { code: error.code, message: error.message, details: error.details, hint: error.hint, full: error });
        throw error;
      }
      setContractId(data.id);
      return data.id;
    }
  };

  const applyOffCampusTemplate = () => {
    setForm(prev => ({
      ...prev,
      program:                 'Off-Campus',
      modality:                'Off-Campus',
      academic_services:       OFF_CAMPUS_FULL_DEFAULTS.academic_services,
      economic_conditions:     OFF_CAMPUS_FULL_DEFAULTS.economic_conditions,
      family_responsibilities: OFF_CAMPUS_FULL_DEFAULTS.family_responsibilities,
      chanak_responsibilities: OFF_CAMPUS_FULL_DEFAULTS.chanak_responsibilities,
      notes:                   OFF_CAMPUS_FULL_DEFAULTS.notes,
    }));
    toast({ title: 'Plantilla aplicada', description: 'Contrato Off-Campus cargado. Revisa y guarda.' });
  };

  const handleSave = async () => {
    if (!studentId) {
      toast({ title: 'Sin estudiante', description: 'Selecciona un estudiante antes de guardar.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await persistContract();
      toast({ title: 'Contrato guardado correctamente.' });
    } catch (err) {
      console.error('[ContractManager:DIAG] handleSave CATCH:', { code: err.code, message: err.message, details: err.details, hint: err.hint, full: err });
      toast({ title: 'Error al guardar', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdvance = async () => {
    if (!studentId) {
      toast({ title: 'Sin estudiante', description: 'Selecciona un estudiante antes de continuar.', variant: 'destructive' });
      return;
    }
    const next = STATUS_META[form.status]?.next;
    if (!next) return;
    setAdvancing(true);
    try {
      // Auto-guarda si aún no está persistido, luego avanza el estado
      const id = contractId || (await persistContract());
      const { error } = await supabase
        .from('enrollment_contracts')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setForm(prev => ({ ...prev, status: next }));
      const desc = next === 'sent'
        ? 'Contrato marcado como enviado y disponible en el portal de la familia.'
        : `Contrato: ${STATUS_META[next]?.label}`;
      toast({ title: 'Estado actualizado', description: desc });
    } catch (err) {
      console.error('[ContractManager:DIAG] handleAdvance CATCH:', { code: err.code, message: err.message, details: err.details, hint: err.hint, full: err });
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAdvancing(false);
    }
  };

  const handleDownload = async (lang = 'es') => {
    setDownloading(true);
    try {
      const { data: settings } = await supabase.from('institutional_settings').select('*').limit(1).single();
      const [first, ...rest] = (studentName || '').split(' ');
      generateContractPDF({
        contract: { ...form, id: contractId, language: lang },
        student:  { first_name: first || studentName, last_name: rest.join(' ') },
        settings: settings || null,
        lang,
      });
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar el PDF.', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-16 bg-white rounded-2xl">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  const status     = STATUS_META[form.status] || STATUS_META.draft;
  const isReadOnly = !canEdit || form.status === 'archived';

  const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-2 mt-2 mb-3">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );

  return (
    <div className="flex flex-col max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-[#193D6D] shrink-0">
        <div>
          <h2 className="font-black text-base text-white flex items-center gap-2">
            <FileSignature className="w-4 h-4" /> Contrato de Servicios Educativos
          </h2>
          <p className="text-xs text-blue-200">{studentName} · {form.school_year} · {form.modality}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
          <button onClick={() => handleDownload('es')} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold disabled:opacity-50">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF ES
          </button>
          <button onClick={() => handleDownload('en')} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold disabled:opacity-50">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF EN
          </button>
          <button onClick={onClose} className="text-blue-200 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Tipo de contrato + botón plantilla */}
        <div className="flex items-end gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex-1">
            <label className={LABEL}>Tipo de Contrato</label>
            <select value={form.modality} onChange={set('modality')} disabled={isReadOnly} className={INPUT}>
              <option value="Off-Campus">Off-Campus (Homeschool Guiado)</option>
              <option value="Dual Diploma">Dual Diploma &amp; Life Leadership</option>
              <option value="On-Campus">On-Campus</option>
              <option value="Homeschool">Homeschool</option>
            </select>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={applyOffCampusTemplate}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-[#193D6D] hover:bg-[#14305a] text-white rounded-xl text-xs font-bold transition-colors"
              title="Carga el borrador completo del contrato Off-Campus con todas las cláusulas"
            >
              📋 Aplicar Plantilla Off-Campus
            </button>
          )}
        </div>

        {/* Datos generales */}
        <SectionTitle>Datos del Contrato</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Año Académico</label>
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
            <label className={LABEL}>Programa</label>
            <input type="text" value={form.program} onChange={set('program')} disabled={isReadOnly} className={INPUT} placeholder="Dual Diploma" />
          </div>
          <div>
            <label className={LABEL}>Familia (Apellido)</label>
            <input type="text" value={form.family_name} onChange={set('family_name')} disabled={isReadOnly} className={INPUT} placeholder="Apellido familiar" />
          </div>
          <div>
            <label className={LABEL}>Tutor Legal (Nombre completo)</label>
            <input type="text" value={form.tutor_legal} onChange={set('tutor_legal')} disabled={isReadOnly} className={INPUT} placeholder="Nombre del padre/tutor" />
          </div>
          <div>
            <label className={LABEL}>Fecha de Inicio</label>
            <input type="date" value={form.start_date} onChange={set('start_date')} disabled={isReadOnly} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Fecha de Fin</label>
            <input type="date" value={form.end_date} onChange={set('end_date')} disabled={isReadOnly} className={INPUT} />
          </div>
        </div>

        {/* Cláusulas */}
        <SectionTitle>Cláusulas del Contrato</SectionTitle>

        <div>
          <label className={LABEL}>Objeto del Contrato y Naturaleza del Programa</label>
          <textarea rows={6} value={form.academic_services} onChange={set('academic_services')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Cláusula 1 y 2 — Objeto y naturaleza del programa educativo." />
        </div>
        <div>
          <label className={LABEL}>Obligaciones de Chanak International Academy</label>
          <textarea rows={3} value={form.chanak_responsibilities} onChange={set('chanak_responsibilities')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Cláusula — Obligaciones de la institución." />
        </div>
        <div>
          <label className={LABEL}>Obligaciones de la Familia</label>
          <textarea rows={3} value={form.family_responsibilities} onChange={set('family_responsibilities')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Cláusula — Obligaciones del padre/madre/tutor legal." />
        </div>
        <div>
          <label className={LABEL}>Condiciones Económicas y Pagos</label>
          <textarea rows={3} value={form.economic_conditions} onChange={set('economic_conditions')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Cláusula — Condiciones de pago, cuotas, penalizaciones por atraso." />
        </div>
        <div>
          <label className={LABEL}>Ley Aplicable y Notas Adicionales</label>
          <textarea rows={5} value={form.notes} onChange={set('notes')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Cláusula final de ley aplicable + Anexo informativo." />
        </div>

        {/* Firmas */}
        <SectionTitle>Firmas</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-slate-700 text-sm">Head of School / Dirección</h4>
            <div>
              <label className={LABEL}>Nombre</label>
              <input type="text" value={form.director_signature_name} onChange={set('director_signature_name')} disabled={isReadOnly} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fecha de Firma</label>
              <input type="date" value={form.director_signature_date} onChange={set('director_signature_date')} disabled={isReadOnly} className={INPUT} />
            </div>
          </div>
          <div className="border border-slate-200 rounded-xl p-4 space-y-3">
            <h4 className="font-bold text-slate-700 text-sm">Padre / Madre / Tutor Legal</h4>
            <div>
              <label className={LABEL}>Nombre</label>
              <input type="text" value={form.parent_signature_name} onChange={set('parent_signature_name')} disabled={isReadOnly} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Fecha de Firma</label>
              <input type="date" value={form.parent_signature_date} onChange={set('parent_signature_date')} disabled={isReadOnly} className={INPUT} />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {canEdit && (
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          {!isReadOnly && (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
          )}
          {status.next && !isReadOnly && (
            <button onClick={handleAdvance} disabled={advancing}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {status.nextLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
