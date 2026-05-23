import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { generateEnrollmentLetterPDF } from '@/lib/enrollmentLetterPdf';
import {
  Save, Loader2, X, Download, ChevronRight,
  Mail, CheckCircle, Send, Eye
} from 'lucide-react';

const INPUT    = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 text-sm bg-white';
const TEXTAREA = INPUT + ' resize-none';
const LABEL    = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

/**
 * Genera el texto de confirmación institucional base.
 * El admin puede editarlo antes de guardar / enviar.
 */
function buildDefaultConfirmationText(studentName = '[NOMBRE DEL ESTUDIANTE]') {
  return `Por medio de la presente, Chanak International Academy, institución educativa privada cristiana americana registrada ante el Florida Department of Education de los Estados Unidos de América, confirma que el/la estudiante ${studentName} figura como alumno/a activo/a y matriculado/a en nuestro programa académico internacional.

El/La estudiante está inscrito/a en el Programa Off-Campus de Chanak International Academy, un programa educativo internacional de carácter estructurado que ofrece formación académica rigurosa basada en el modelo pedagógico Mastery Learning. El programa incluye un Plan Educativo Individualizado (PEI), seguimiento académico personalizado con mentor asignado, y acceso a las plataformas institucionales SIS y LMS de Chanak.

Chanak International Academy está registrada ante el Florida Department of Education (FLDOE School Number 134620) como institución educativa privada en el Estado de Florida, Estados Unidos de América, bajo la entidad legal Chanak TrainUp Education, Inc., organización sin fines de lucro registrada en el Estado de Florida. Asimismo, la institución ostenta la condición de MSA-CESS Official Candidate for Accreditation ante la Middle States Association of Colleges and Schools, Commissions on Elementary and Secondary Schools.

Los estudiantes que completen satisfactoriamente los requisitos académicos del programa son elegibles para la obtención del High School Diploma estadounidense, emitido por Chanak International Academy conforme a los estándares del Estado de Florida, documento susceptible de apostilla conforme al Convenio de La Haya de 1961.

La presente carta se expide a efectos académicos, administrativos e informativos, y puede ser verificada contactando directamente con el departamento de administración institucional de Chanak International Academy.`;
}

const STATUS_META = {
  // Flujo simplificado: draft → published directamente.
  // La carta queda visible en el portal de la familia en cuanto se publica.
  draft:     { label: 'Borrador',   color: 'bg-slate-100 text-slate-700', next: 'published', nextLabel: 'Publicar para Familia', icon: Eye },
  sent:      { label: 'Enviado',    color: 'bg-amber-100 text-amber-800', next: 'published', nextLabel: 'Publicar',              icon: Eye },
  published: { label: 'Publicado',  color: 'bg-green-100 text-green-800', next: 'archived',  nextLabel: 'Archivar',              icon: CheckCircle },
  archived:  { label: 'Archivado',  color: 'bg-slate-200 text-slate-600', next: null,        nextLabel: null,                   icon: Mail },
};

const DEFAULT_FORM = {
  school_year:             '2025-2026',
  program:                 'Off-Campus International Program · K–12',
  modality:                'Off-Campus',
  grade_level:             '',
  us_grade_level:          '',
  start_date:              '',
  letter_language:         'es',
  letter_ref:              '',
  confirmation_text:       buildDefaultConfirmationText(),
  director_signature_name: 'Mariela Andrade',
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
    const [studentRes, settingsRes] = await Promise.all([
      supabase.from('students').select('grade_level, us_grade_level, modality, program, enrollment_date').eq('id', studentId).single(),
      supabase.from('institutional_settings').select('active_school_year').limit(1).single(),
    ]);
    if (studentRes.data || settingsRes.data) {
      setForm(prev => {
        // Re-build confirmation text with real student name if it still has the placeholder
        const currentText = prev.confirmation_text || '';
        const needsRename = currentText.includes('[NOMBRE DEL ESTUDIANTE]') && studentName;
        const updatedText = needsRename
          ? buildDefaultConfirmationText(studentName)
          : currentText;
        return {
          ...prev,
          school_year:       settingsRes.data?.active_school_year || prev.school_year,
          grade_level:       studentRes.data?.grade_level    || prev.grade_level,
          us_grade_level:    studentRes.data?.us_grade_level || prev.us_grade_level,
          modality:          studentRes.data?.modality       || prev.modality,
          program:           'Off-Campus International Program · K–12',
          start_date:        studentRes.data?.enrollment_date|| prev.start_date,
          confirmation_text: updatedText,
        };
      });
    }
  }, [studentId, initialId, studentName]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadStudentFicha(); }, [loadStudentFicha]);


  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  // ── Sanitiza campos date: '' → null para evitar error PostgreSQL 22007 ──────
  const LETTER_DATE_FIELDS = ['start_date', 'issue_date', 'director_signature_date'];
  const buildLetterPayload = () => {
    const raw = { ...form, student_id: studentId, updated_at: new Date().toISOString() };
    LETTER_DATE_FIELDS.forEach(f => { if (!raw[f]) raw[f] = null; });
    return raw;
  };

  // ── Persiste la carta y devuelve el ID (crea si no existe, actualiza si ya existe) ─
  const persistLetter = async () => {
    if (!studentId) throw new Error('Selecciona un estudiante antes de guardar.');
    const payload = buildLetterPayload();
    if (letterId) {
      const { data: updated, error } = await supabase.from('enrollment_letters').update(payload).eq('id', letterId).select('id');
      if (error) throw error;
      if (!updated || updated.length === 0) throw new Error('Sin permiso para guardar. Verifica que tu rol sea admin o director.');
      return letterId;
    } else {
      const { data, error } = await supabase.from('enrollment_letters').insert([payload]).select('id').single();
      if (error) throw error;
      setLetterId(data.id);
      return data.id;
    }
  };

  const handleSave = async () => {
    if (!studentId) {
      toast({ title: 'Sin estudiante', description: 'Selecciona un estudiante antes de guardar.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await persistLetter();
      toast({ title: 'Carta guardada correctamente.' });
    } catch (err) {
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
      const id = letterId || (await persistLetter());
      const { data: updated, error } = await supabase
        .from('enrollment_letters')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error('No se actualizó el registro. Verifica tu rol o que la migración de base de datos esté aplicada.');
      }
      setForm(prev => ({ ...prev, status: next }));
      const desc = next === 'published'
        ? '✅ Carta publicada. Ya visible en el portal de la familia.'
        : `Carta: ${STATUS_META[next]?.label}`;
      toast({ title: 'Estado actualizado', description: desc });
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAdvancing(false);
    }
  };

  const handleDownload = async (lang = form.letter_language) => {
    setDownloading(true);
    try {
      const { data: settings } = await supabase.from('institutional_settings').select('*').limit(1).single();
      const { data: studentData } = await supabase.from('students').select('*').eq('id', studentId).single();
      generateEnrollmentLetterPDF({
        letter:   { ...form, id: letterId, letter_language: lang },
        student:  studentData || { id: studentId },
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
          <button onClick={() => handleDownload('es')} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold disabled:opacity-50">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF ES
          </button>
          <button onClick={() => handleDownload('en')} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold disabled:opacity-50">
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            PDF EN
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
            <input type="text" value={form.program} onChange={set('program')} disabled={isReadOnly} className={INPUT} placeholder="Off-Campus International Program · K–12" />
          </div>
          {/* Modalidad se guarda en BD para uso interno pero no aparece en la carta oficial */}
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
          <div className="flex items-center justify-between mb-1">
            <label className={LABEL}>
              {form.letter_language === 'en' ? 'Confirmation Text' : 'Texto de Confirmación'}
            </label>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, confirmation_text: buildDefaultConfirmationText(studentName || '[NOMBRE DEL ESTUDIANTE]') }))}
                className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline underline-offset-2"
                title="Restaura el texto base institucional (puedes editarlo después)"
              >
                ↺ Restaurar texto base
              </button>
            )}
          </div>
          <textarea rows={10} value={form.confirmation_text} onChange={set('confirmation_text')} disabled={isReadOnly} className={TEXTAREA}
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
