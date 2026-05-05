import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { generateContractPDF } from '@/lib/contractPdf';
import {
  Save, Loader2, X, Download, ChevronRight,
  FileSignature, Eye, Send, CheckCircle, Archive
} from 'lucide-react';

const INPUT    = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const TEXTAREA = INPUT + ' resize-none';
const LABEL    = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const STATUS_META = {
  draft:    { label: 'Borrador',          color: 'bg-slate-100 text-slate-700',  next: 'sent',    nextLabel: 'Enviar a Familia', icon: Send },
  sent:     { label: 'Enviado',           color: 'bg-amber-100 text-amber-800',  next: 'signed',  nextLabel: 'Marcar Firmado',   icon: FileSignature },
  signed:   { label: 'Firmado',           color: 'bg-green-100 text-green-800',  next: 'archived',nextLabel: 'Archivar',         icon: Archive },
  archived: { label: 'Archivado',         color: 'bg-slate-200 text-slate-600',  next: null,      nextLabel: null,               icon: Archive },
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
  const [loading, setLoading]       = useState(!!initialId);
  const [saving, setSaving]         = useState(false);
  const [advancing, setAdvancing]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [contractId, setContractId] = useState(initialId || null);
  const [form, setForm]             = useState(DEFAULT_FORM);

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
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo cargar el contrato.', variant: 'destructive' });
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
      const { error } = await supabase.from('enrollment_contracts').update({ status: next, updated_at: new Date().toISOString() }).eq('id', contractId);
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
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  const status     = STATUS_META[form.status] || STATUS_META.draft;
  const isReadOnly = !canEdit || form.status === 'archived';

  return (
    <div className="flex flex-col max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-[#193D6D] shrink-0">
        <div>
          <h2 className="font-black text-base text-white flex items-center gap-2">
            <FileSignature className="w-4 h-4" /> Contrato de Matrícula
          </h2>
          <p className="text-xs text-blue-200">{studentName} · {form.school_year}</p>
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
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Datos */}
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
            <label className={LABEL}>Modalidad</label>
            <select value={form.modality} onChange={set('modality')} disabled={isReadOnly} className={INPUT}>
              <option value="Off-Campus">Off-Campus</option>
              <option value="Dual Diploma">Dual Diploma</option>
              <option value="On-Campus">On-Campus</option>
              <option value="Homeschool">Homeschool</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Familia / Tutor Legal</label>
            <input type="text" value={form.family_name} onChange={set('family_name')} disabled={isReadOnly} className={INPUT} placeholder="Apellido familiar" />
          </div>
          <div>
            <label className={LABEL}>Nombre del Tutor Legal</label>
            <input type="text" value={form.tutor_legal} onChange={set('tutor_legal')} disabled={isReadOnly} className={INPUT} placeholder="Nombre completo" />
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

        <div>
          <label className={LABEL}>Servicios Académicos Contratados</label>
          <textarea rows={3} value={form.academic_services} onChange={set('academic_services')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Descripción de los servicios: currículo, tutoría, plataforma SIS, reportes, etc." />
        </div>
        <div>
          <label className={LABEL}>Condiciones Económicas</label>
          <textarea rows={3} value={form.economic_conditions} onChange={set('economic_conditions')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Cuota de matrícula, cuota mensual, método de pago, penalizaciones por atraso, etc." />
        </div>
        <div>
          <label className={LABEL}>Responsabilidades de la Familia</label>
          <textarea rows={4} value={form.family_responsibilities} onChange={set('family_responsibilities')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Compromisos del padre/tutor: supervisión, pago, documentación, comunicación, etc." />
        </div>
        <div>
          <label className={LABEL}>Responsabilidades de Chanak International Academy</label>
          <textarea rows={4} value={form.chanak_responsibilities} onChange={set('chanak_responsibilities')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Compromisos de la institución: materiales, tutoría, reportes, confidencialidad, etc." />
        </div>
        <div>
          <label className={LABEL}>Notas y Acuerdos Adicionales</label>
          <textarea rows={3} value={form.notes} onChange={set('notes')} disabled={isReadOnly} className={TEXTAREA}
            placeholder="Cualquier acuerdo específico o cláusula adicional." />
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
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
