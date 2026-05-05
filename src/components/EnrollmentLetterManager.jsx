import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { generateEnrollmentLetterPDF } from '@/lib/enrollmentLetterPdf';
import {
  Save, Loader2, X, Download, ChevronRight,
  Mail, CheckCircle, Send, Eye, Globe
} from 'lucide-react';

const INPUT    = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm bg-white';
const TEXTAREA = INPUT + ' resize-none';
const LABEL    = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const STATUS_META = {
  draft:     { label: 'Borrador',   color: 'bg-slate-100 text-slate-700', next: 'sent',      nextLabel: 'Enviar a Familia', icon: Send },
  sent:      { label: 'Enviado',    color: 'bg-amber-100 text-amber-800', next: 'published',  nextLabel: 'Publicar',         icon: Eye },
  published: { label: 'Publicado',  color: 'bg-green-100 text-green-800', next: 'archived',   nextLabel: 'Archivar',         icon: CheckCircle },
  archived:  { label: 'Archivado',  color: 'bg-slate-200 text-slate-600', next: null,         nextLabel: null,               icon: Mail },
};

const BODY_TEXT = {
  es: (studentName, schoolYear, fldoe) =>
    `Chanak International Academy es una institución educativa internacional privada diseñada para brindar continuidad académica a familias que requieren una estructura de aprendizaje a distancia flexible, fundamentada en el currículo A.C.E. (Accelerated Christian Education) y los estándares del Estado de Florida, EE. UU.\n\nEsta carta confirma que el/la siguiente estudiante está debidamente inscrito/a y registrado/a en Chanak International Academy para el año académico ${schoolYear || '—'}. El estudiante sigue un Plan Educativo Individualizado (PEI) basado en el currículo A.C.E. (Accelerated Christian Education), impartido mediante nuestro modelo estructurado de aprendizaje a distancia. Chanak International Academy asume la supervisión académica y la responsabilidad de la entrega, supervisión y evaluación del programa educativo de cada estudiante, conforme a las políticas institucionales. Esta confirmación se emite a petición de la familia para fines administrativos oficiales.`,
  en: (studentName, schoolYear, fldoe) =>
    `Chanak International Academy is a private international educational institution designed to provide academic continuity to families requiring a flexible distance learning structure, grounded in the A.C.E. (Accelerated Christian Education) curriculum and the standards of the State of Florida, USA.\n\nThis letter confirms that the following student is duly enrolled and registered with Chanak International Academy for the academic year ${schoolYear || '—'}. The student follows an Individualized Educational Plan (IEP) based on the Accelerated Christian Education (A.C.E.) curriculum, delivered through our structured distance learning model. Chanak International Academy assumes academic oversight and responsibility for the delivery, supervision, and evaluation of each student's educational programme in accordance with institutional policies. This confirmation is issued upon request for official administrative purposes.`,
};

const DEFAULT_FORM = {
  school_year:             '2025-2026',
  program:                 'Dual Diploma / Off-Campus',
  modality:                'Off-Campus',
  grade_level:             '',
  us_grade_level:          '',
  start_date:              '',
  letter_language:         'es',
  letter_ref:              '',
  confirmation_text:       '',
  director_signature_name: '',
  director_signature_date: '',
  issue_date:              new Date().toISOString().split('T')[0],
  notes:                   '',
  status:                  'draft',
};

export default function EnrollmentLetterManager({ studentId, studentName, letterId: initialId, canEdit = false, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading]         = useState(!!initialId);
  const [saving, setSaving]           = useState(false);
  const [advancing, setAdvancing]     = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [letterId, setLetterId]       = useState(initialId || null);
  const [form, setForm]               = useState(DEFAULT_FORM);

  const load = useCallback(async () => {
    if (!initialId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('enrollment_letters').select('*').eq('id', initialId).single();
      if (error) throw error;
      setForm(prev => ({
        ...prev,
        ...Object.fromEntries(Object.entries(data).filter(([k, v]) => k in DEFAULT_FORM && v !== null && v !== undefined)),
      }));
      setLetterId(data.id);
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar la carta.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [initialId]);

  const loadStudentFicha = useCallback(async () => {
    if (!studentId || initialId) return;
    const { data } = await supabase
      .from('students')
      .select('grade_level, us_grade_level, modality, program, enrollment_date')
      .eq('id', studentId)
      .single();
    if (data) {
      setForm(prev => ({
        ...prev,
        grade_level:    data.grade_level    || prev.grade_level,
        us_grade_level: data.us_grade_level || prev.us_grade_level,
        modality:       data.modality       || prev.modality,
        program:        data.program        || prev.program,
        start_date:     data.enrollment_date|| prev.start_date,
      }));
    }
  }, [studentId, initialId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStudentFicha(); }, [loadStudentFicha]);

  // Auto-fill confirmation_text if still empty when language or school_year changes
  useEffect(() => {
    if (!form.confirmation_text) {
      setForm(prev => ({
        ...prev,
        confirmation_text: BODY_TEXT[prev.letter_language]?.(studentName, prev.school_year, '134620') || '',
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const refreshBodyText = () => {
    setForm(prev => ({
      ...prev,
      confirmation_text: BODY_TEXT[prev.letter_language]?.(studentName, prev.school_year, '134620') || '',
    }));
    toast({ title: 'Texto actualizado según idioma y año escolar' });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, student_id: studentId, updated_at: new Date().toISOString() };
      if (letterId) {
        const { error } = await supabase.from('enrollment_letters').update(payload).eq('id', letterId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('enrollment_letters').insert([payload]).select('id').single();
        if (error) throw error;
        setLetterId(data.id);
      }
      toast({ title: 'Carta guardada' });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdvance = async () => {
    if (!letterId) {
      toast({ title: 'Aviso', description: 'Guarda la carta antes de avanzar.', variant: 'destructive' });
      return;
    }
    const next = STATUS_META[form.status]?.next;
    if (!next) return;
    setAdvancing(true);
    try {
      const { error } = await supabase
        .from('enrollment_letters')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', letterId);
      if (error) throw error;
      setForm(prev => ({ ...prev, status: next }));
      toast({ title: 'Estado actualizado', description: `Carta: ${STATUS_META[next].label}` });
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
      const { data: studentData } = await supabase.from('students').select('*').eq('id', studentId).single();
      generateEnrollmentLetterPDF({
        letter:   { ...form, id: letterId },
        student:  studentData || { id: studentId },
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
      <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
    </div>
  );

  const status     = STATUS_META[form.status] || STATUS_META.draft;
  const isReadOnly = !canEdit || form.status === 'archived';

  return (
    <div className="flex flex-col max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-[#20B2AA] shrink-0">
        <div>
          <h2 className="font-black text-base text-white flex items-center gap-2">
            <Mail className="w-4 h-4" /> Carta de Confirmación de Matrícula
          </h2>
          <p className="text-xs text-teal-100">{studentName} · {form.school_year}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>{status.label}</span>
          <button onClick={handleDownload} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold disabled:opacity-50">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF
          </button>
          <button onClick={onClose} className="text-teal-100 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Idioma + Ref */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Idioma del Documento</label>
            <div className="flex gap-2">
              <select value={form.letter_language} onChange={set('letter_language')} disabled={isReadOnly} className={INPUT}>
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
              {!isReadOnly && (
                <button
                  onClick={refreshBodyText}
                  title="Recargar texto según idioma"
                  className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl border border-teal-200 text-xs font-bold"
                >
                  <Globe className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className={LABEL}>Referencia (Ref.)</label>
            <input type="text" value={form.letter_ref} onChange={set('letter_ref')} disabled={isReadOnly} className={INPUT}
              placeholder="CIA-ENR-2026-001" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
            <input type="text" value={form.program} onChange={set('program')} disabled={isReadOnly} className={INPUT} placeholder="Dual Diploma / Off-Campus" />
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
          <div>
            <label className={LABEL}>Grado (ES)</label>
            <input type="text" value={form.grade_level} onChange={set('grade_level')} disabled={isReadOnly} className={INPUT} placeholder="9.° Grado" />
          </div>
          <div>
            <label className={LABEL}>Grado (US)</label>
            <input type="text" value={form.us_grade_level} onChange={set('us_grade_level')} disabled={isReadOnly} className={INPUT} placeholder="9th Grade (Freshman)" />
          </div>
          <div>
            <label className={LABEL}>Fecha de Inicio</label>
            <input type="date" value={form.start_date} onChange={set('start_date')} disabled={isReadOnly} className={INPUT} />
          </div>
        </div>

        <div>
          <label className={LABEL}>
            {form.letter_language === 'en' ? 'Confirmation Text' : 'Texto de Confirmación'}
          </label>
          <textarea rows={8} value={form.confirmation_text} onChange={set('confirmation_text')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Texto de confirmación institucional…" />
        </div>

        <div>
          <label className={LABEL}>Notas Adicionales</label>
          <textarea rows={2} value={form.notes} onChange={set('notes')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Observaciones adicionales para incluir en la carta." />
        </div>

        {/* Firma */}
        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
          <h4 className="font-bold text-slate-700 text-sm">Head of School / Dirección</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Nombre del Director(a)</label>
              <input type="text" value={form.director_signature_name} onChange={set('director_signature_name')} disabled={isReadOnly} className={INPUT}
                placeholder="Mariela Andrade" />
            </div>
            <div>
              <label className={LABEL}>Fecha de Firma</label>
              <input type="date" value={form.director_signature_date} onChange={set('director_signature_date')} disabled={isReadOnly} className={INPUT} />
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
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">
              {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {status.nextLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
