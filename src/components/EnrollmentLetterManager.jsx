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

const STATUS_META = {
  draft:     { label: 'Borrador',   color: 'bg-slate-100 text-slate-700', next: 'sent',      nextLabel: 'Enviar a Familia', icon: Send },
  sent:      { label: 'Enviado',    color: 'bg-amber-100 text-amber-800', next: 'published',  nextLabel: 'Publicar',         icon: Eye },
  published: { label: 'Publicado',  color: 'bg-green-100 text-green-800', next: 'archived',   nextLabel: 'Archivar',         icon: CheckCircle },
  archived:  { label: 'Archivado',  color: 'bg-slate-200 text-slate-600', next: null,         nextLabel: null,               icon: Mail },
};

const CONFIRMATION_DEFAULT = 'Por medio de la presente, Chanak International Academy confirma la matrícula del/la estudiante para el presente año académico. El estudiante ha completado satisfactoriamente el proceso de admisión y se encuentra debidamente inscrito en nuestro programa educativo. Chanak International Academy está comprometida con brindar una educación de excelencia basada en los principios del currículo A.C.E. (Accelerated Christian Education).';

const DEFAULT_FORM = {
  school_year:             '2025-2026',
  program:                 'Dual Diploma / Off-Campus',
  modality:                'Off-Campus',
  grade_level:             '',
  us_grade_level:          '',
  start_date:              '',
  confirmation_text:       '',
  director_signature_name: '',
  director_signature_date: '',
  issue_date:              new Date().toISOString().split('T')[0],
  notes:                   '',
  status:                  'draft',
};

export default function EnrollmentLetterManager({ studentId, studentName, letterId: initialId, canEdit = false, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading]       = useState(!!initialId);
  const [saving, setSaving]         = useState(false);
  const [advancing, setAdvancing]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [letterId, setLetterId]     = useState(initialId || null);
  const [form, setForm]             = useState(DEFAULT_FORM);

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
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo cargar la carta.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [initialId]);

  useEffect(() => { load(); }, [load]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

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
      const { error } = await supabase.from('enrollment_letters').update({ status: next, updated_at: new Date().toISOString() }).eq('id', letterId);
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
      const [first, ...rest] = (studentName || '').split(' ');
      generateEnrollmentLetterPDF({
        letter: { ...form, id: letterId },
        student: { first_name: first || studentName, last_name: rest.join(' ') },
        settings: settings || null,
      });
    } catch (err) {
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
            <input type="text" value={form.us_grade_level} onChange={set('us_grade_level')} disabled={isReadOnly} className={INPUT} placeholder="9th Grade" />
          </div>
          <div>
            <label className={LABEL}>Fecha de Inicio</label>
            <input type="date" value={form.start_date} onChange={set('start_date')} disabled={isReadOnly} className={INPUT} />
          </div>
        </div>

        <div>
          <label className={LABEL}>Texto de Confirmación</label>
          <textarea rows={5} value={form.confirmation_text || CONFIRMATION_DEFAULT} onChange={set('confirmation_text')} disabled={isReadOnly} className={TEXTAREA}
            placeholder={CONFIRMATION_DEFAULT} />
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
              <input type="text" value={form.director_signature_name} onChange={set('director_signature_name')} disabled={isReadOnly} className={INPUT} />
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
