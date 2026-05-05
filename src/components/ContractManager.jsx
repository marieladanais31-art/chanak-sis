import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { generateContractPDF } from '@/lib/contractPdf';
import {
  Save, Loader2, X, Download, ChevronRight,
  FileSignature, Send, Archive, Wand2
} from 'lucide-react';

const INPUT    = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const TEXTAREA = INPUT + ' resize-none';
const LABEL    = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const STATUS_META = {
  draft:    { label: 'Borrador',  color: 'bg-slate-100 text-slate-700',  next: 'sent',    nextLabel: 'Enviar a Familia', icon: Send },
  sent:     { label: 'Enviado',   color: 'bg-amber-100 text-amber-800',  next: 'signed',  nextLabel: 'Marcar Firmado',   icon: FileSignature },
  signed:   { label: 'Firmado',   color: 'bg-green-100 text-green-800',  next: 'archived',nextLabel: 'Archivar',         icon: Archive },
  archived: { label: 'Archivado', color: 'bg-slate-200 text-slate-600',  next: null,      nextLabel: null,               icon: Archive },
};

const TEMPLATE = {
  'Off-Campus': {
    academic_services:
`CLÁUSULA 1 – OBJETO DEL CONTRATO
CHANAK prestará a LA FAMILIA un servicio educativo internacional a distancia, bajo la modalidad de Off Campus (Homeschool Guiado), conforme al modelo académico institucional y sus manuales de procedimientos vigentes.

CLÁUSULA 2 – NATURALEZA DEL PROGRAMA
El programa no constituye educación presencial. Es un servicio de educación a distancia regido por estándares internacionales de «Homeschooling» y la normativa del Estado de Florida.`,
    chanak_responsibilities:
`CLÁUSULA 3 – OBLIGACIONES DE CHANAK
Diseñar y supervisar el Plan Educativo Individualizado (PEI), asignar tutor académico, evaluar el progreso mediante el sistema Mastery Learning, validar calificaciones y emitir la documentación académica oficial.`,
    family_responsibilities:
`CLÁUSULA 4 – OBLIGACIONES DE LA FAMILIA
Actuar como supervisor primario del proceso educativo diario. LA FAMILIA se compromete a supervisar el trabajo diario del estudiante y reportar los datos verídicos y objetivos sobre su desempeño académico en la plataforma oficial, garantizando un entorno de estudio adecuado y el cumplimiento de los compromisos económicos.`,
    economic_conditions:
`CLÁUSULA 5 – CONDICIONES ECONÓMICAS Y PAGOS
El servicio se activa tras la confirmación del pago. El incumplimiento de los pagos acordados podrá implicar la suspensión del acceso a la plataforma y del servicio educativo.`,
    notes:
`CLÁUSULA 6 – LEY APLICABLE
Este contrato se rige íntegramente por las leyes del Estado de Florida, Estados Unidos de América, lugar de constitución de la institución.

ANEXO INFORMATIVO
Chanak International Academy (Código FLDOE 134620) es una institución educativa internacional a distancia constituida en los Estados Unidos. La matrícula en Chanak no equivale a escolarización presencial en el país de residencia del estudiante.`,
  },
  'Dual Diploma': {
    academic_services:
`CLÁUSULA 1 – OBJETO DEL CONTRATO
CHANAK prestará a LA FAMILIA un servicio de doble titulación internacional a distancia bajo la modalidad de Dual Diploma. El programa permite al estudiante obtener el High School Diploma de los Estados Unidos de forma simultánea a sus estudios de bachillerato nacional en su país de residencia.

CLÁUSULA 2 – NATURALEZA DEL PROGRAMA Y SIMULTANEIDAD
El programa Dual Diploma no sustituye la escolarización presencial obligatoria. Se basa en un modelo de convalidación de créditos: el sistema estadounidense reconoce el 75% (18 créditos) de las materias cursadas en el colegio local, y el alumno cursa con CHANAK el 25% restante (6 créditos específicos) requeridos por el Estado de Florida.

CLÁUSULA 3 – LIFE SKILLS Y COSMOVISIÓN
Como pilar fundamental de la formación en Chanak, el programa integra obligatoriamente el bloque de Life Skills. Este componente se enfoca en oratoria, inteligencia financiera, proyectos sociales y cosmovisión cristiana, con una carga horaria estimada de 5 horas semanales totales.

CLÁUSULA 4 – MASTERY LEARNING Y CURRÍCULO A.C.E.
El programa utiliza el currículo A.C.E. (Accelerated Christian Education). LA FAMILIA acepta que el sistema se rige por el dominio del aprendizaje: el estudiante debe alcanzar un puntaje mínimo del 80% en cada PACE (módulo) para avanzar al siguiente nivel.

CLÁUSULA 5 – EVALUACIÓN DIAGNÓSTICA
Para alumnos que inicien el programa de forma tardía (a partir de 3.° de ESO), CHANAK realizará una Evaluación Diagnóstica de Inglés y Matemáticas para determinar el nivel de entrada real y diseñar el plan de nivelación correspondiente.`,
    chanak_responsibilities:
`CLÁUSULA 6 – OBLIGACIONES DE CHANAK
Proporcionar acceso a la plataforma institucional, asignar un mentor académico certificado, emitir transcripts oficiales y el diploma de High School al completar los requisitos, y brindar acompañamiento continuo durante todo el programa.`,
    family_responsibilities:
`CLÁUSULA 7 – OBLIGACIONES DE LA FAMILIA
Mantener la matrícula activa en el colegio local durante todo el programa. Proveer el equipamiento tecnológico necesario. Cumplir con los compromisos económicos pactados y comunicar oportunamente cualquier cambio en la situación académica local del estudiante.`,
    economic_conditions: '',
    notes:
`CLÁUSULA 8 – CANALES OFICIALES Y LEY APLICABLE
El Sistema Académico (SIS) de Chanak es el único canal oficial para registros y documentos. Este contrato se rige por las leyes del Estado de Florida, EE. UU.

ANEXO INFORMATIVO
Chanak International Academy (Código FLDOE 134620) es una institución educativa internacional a distancia constituida en los Estados Unidos. El Dual Diploma no sustituye los estudios obligatorios locales del estudiante. La familia es responsable de cumplir con la normativa educativa local de su país de residencia.`,
  },
};

const DEFAULT_FORM = {
  school_year:             '2025-2026',
  family_name:             '',
  tutor_legal:             '',
  program:                 'Dual Diploma / Off-Campus',
  modality:                'Off-Campus',
  academic_services:       '',
  economic_conditions:     '',
  family_responsibilities: '',
  chanak_responsibilities: '',
  start_date:              '',
  end_date:                '',
  issue_date:              new Date().toISOString().split('T')[0],
  director_signature_name: '',
  director_signature_date: '',
  parent_signature_name:   '',
  parent_signature_date:   '',
  notes:                   '',
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
    const { data } = await supabase
      .from('students')
      .select('parent1_name, modality')
      .eq('id', studentId)
      .single();
    if (data) {
      setForm(prev => ({
        ...prev,
        tutor_legal: data.parent1_name || prev.tutor_legal,
        modality:    data.modality     || prev.modality,
      }));
    }
  }, [studentId, initialId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStudentFicha(); }, [loadStudentFicha]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const loadTemplate = () => {
    const tpl = TEMPLATE[form.modality];
    if (!tpl) {
      toast({ title: 'Selecciona Off-Campus o Dual Diploma para cargar la plantilla.', variant: 'destructive' });
      return;
    }
    setForm(prev => ({ ...prev, ...tpl }));
    toast({ title: `Cláusulas ${form.modality} cargadas` });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, student_id: studentId, updated_at: new Date().toISOString() };
      if (contractId) {
        const { error } = await supabase.from('enrollment_contracts').update(payload).eq('id', contractId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('enrollment_contracts').insert([payload]).select('id').single();
        if (error) throw error;
        setContractId(data.id);
      }
      toast({ title: 'Contrato guardado' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdvance = async () => {
    if (!contractId) {
      toast({ title: 'Aviso', description: 'Guarda el contrato antes de avanzar.', variant: 'destructive' });
      return;
    }
    const next = STATUS_META[form.status]?.next;
    if (!next) return;
    setAdvancing(true);
    try {
      const { error } = await supabase
        .from('enrollment_contracts')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', contractId);
      if (error) throw error;
      setForm(prev => ({ ...prev, status: next }));
      toast({ title: 'Estado actualizado', description: `Contrato: ${STATUS_META[next].label}` });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAdvancing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { data: settings } = await supabase.from('institutional_settings').select('*').limit(1).single();
      const [first, ...rest] = (studentName || '').split(' ');
      generateContractPDF({
        contract: { ...form, id: contractId },
        student:  { first_name: first || studentName, last_name: rest.join(' ') },
        settings: settings || null,
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
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold disabled:opacity-50">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
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
              onClick={loadTemplate}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all whitespace-nowrap"
            >
              <Wand2 className="w-4 h-4" /> Cargar Cláusulas Modelo
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
