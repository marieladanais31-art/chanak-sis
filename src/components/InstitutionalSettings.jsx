import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Building2, User, FileText, AlertCircle, Globe, Image as ImageIcon } from 'lucide-react';

const INPUT = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const LABEL = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <Icon className="w-4 h-4 text-blue-600" />
        <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

export default function InstitutionalSettings() {
  const { toast } = useToast();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [settingsId, setSettingsId] = useState(null);
  const [form, setForm] = useState({
    institution_name: 'Chanak International Academy',
    legal_name: '',
    fldoe_registration: '134620',
    address: '',
    city: '',
    state_province: 'Florida',
    country: 'USA',
    phone: '',
    email: '',
    website: 'https://www.chanakacademy.org',
    director_name: '',
    director_title: 'Director',
    director_signature_url: '',
    logo_url: '',
    seal_url: '',
    legal_text_es: 'Este documento es emitido por Chanak International Academy, institución registrada ante el Florida Department of Education (FLDOE #134620).',
    legal_text_en: 'This document is issued by Chanak International Academy, registered with the Florida Department of Education (FLDOE #134620).',
    apostille_text: '',
  });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('institutional_settings')
        .select('*')
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettingsId(data.id);
        setForm(prev => ({ ...prev, ...Object.fromEntries(
          Object.entries(data).filter(([, v]) => v !== null && v !== undefined)
        )}));
      }
    } catch (err) {
      console.error('[InstitutionalSettings] load:', err);
      toast({ title: 'Error', description: 'No se pudo cargar la configuración.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (settingsId) {
        const { error } = await supabase.from('institutional_settings').update(payload).eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('institutional_settings').insert([payload]).select().single();
        if (error) throw error;
        setSettingsId(data.id);
      }
      toast({ title: 'Configuración guardada', description: 'Los datos institucionales fueron actualizados.' });
    } catch (err) {
      console.error('[InstitutionalSettings] save:', err);
      toast({ title: 'Error', description: err.message || 'No se pudo guardar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (loading) return (
    <div className="flex justify-center p-16">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800">Solo editable por Admin / Super Admin</p>
          <p className="text-amber-700 mt-0.5">
            Estos datos aparecen en todos los boletines y documentos oficiales.
            La <strong>firma digital</strong> del Director requiere una Edge Function — por ahora usa la URL de una imagen.
          </p>
        </div>
      </div>

      <Section icon={Building2} title="Datos de la Institución">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre Institucional">
            <input type="text" value={form.institution_name} onChange={set('institution_name')} className={INPUT} placeholder="Chanak International Academy" />
          </Field>
          <Field label="Nombre Legal (si difiere)">
            <input type="text" value={form.legal_name} onChange={set('legal_name')} className={INPUT} placeholder="Opcional" />
          </Field>
          <Field label="Registro FLDOE">
            <input type="text" value={form.fldoe_registration} onChange={set('fldoe_registration')} className={INPUT} placeholder="134620" />
          </Field>
          <Field label="Sitio Web">
            <input type="url" value={form.website} onChange={set('website')} className={INPUT} placeholder="https://www.chanakacademy.org" />
          </Field>
          <Field label="Dirección">
            <input type="text" value={form.address} onChange={set('address')} className={INPUT} placeholder="Calle, número..." />
          </Field>
          <Field label="Ciudad">
            <input type="text" value={form.city} onChange={set('city')} className={INPUT} />
          </Field>
          <Field label="Estado / Provincia">
            <input type="text" value={form.state_province} onChange={set('state_province')} className={INPUT} />
          </Field>
          <Field label="País">
            <input type="text" value={form.country} onChange={set('country')} className={INPUT} />
          </Field>
          <Field label="Teléfono">
            <input type="tel" value={form.phone} onChange={set('phone')} className={INPUT} />
          </Field>
          <Field label="Email Institucional">
            <input type="email" value={form.email} onChange={set('email')} className={INPUT} />
          </Field>
        </div>
      </Section>

      <Section icon={User} title="Director / Firma">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre del Director">
            <input type="text" value={form.director_name} onChange={set('director_name')} className={INPUT} />
          </Field>
          <Field label="Cargo del Director">
            <input type="text" value={form.director_title} onChange={set('director_title')} className={INPUT} />
          </Field>
          <div className="md:col-span-2">
            <Field label="URL de Firma del Director (imagen PNG/JPG)">
              <input type="url" value={form.director_signature_url} onChange={set('director_signature_url')} className={INPUT} placeholder="https://..." />
              <p className="text-xs text-amber-600 mt-1">
                ⚠ Pendiente backend: la firma digital criptográfica requiere una Edge Function con certificado.
              </p>
            </Field>
          </div>
        </div>
      </Section>

      <Section icon={ImageIcon} title="Logo y Sello">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Field label="URL del Logo">
              <input type="url" value={form.logo_url} onChange={set('logo_url')} className={INPUT} placeholder="https://..." />
            </Field>
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo preview" className="mt-2 h-16 object-contain border border-slate-200 rounded-lg p-1" onError={e => { e.target.style.display = 'none'; }} />
            )}
          </div>
          <div>
            <Field label="URL del Sello Institucional (opcional)">
              <input type="url" value={form.seal_url} onChange={set('seal_url')} className={INPUT} placeholder="https://..." />
            </Field>
          </div>
        </div>
      </Section>

      <Section icon={Globe} title="Textos Legales para Documentos">
        <Field label="Texto Legal (Español)">
          <textarea rows={3} value={form.legal_text_es} onChange={set('legal_text_es')} className={INPUT + ' resize-none'} />
        </Field>
        <Field label="Legal Text (English)">
          <textarea rows={3} value={form.legal_text_en} onChange={set('legal_text_en')} className={INPUT + ' resize-none'} />
        </Field>
        <Field label="Texto para Apostilla / Validación Internacional (opcional)">
          <textarea rows={3} value={form.apostille_text} onChange={set('apostille_text')} className={INPUT + ' resize-none'} placeholder="Texto adicional para trámites de apostilla..." />
        </Field>
      </Section>

      <div className="flex justify-end">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  );
}
