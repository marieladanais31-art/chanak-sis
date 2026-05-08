import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Save, Loader2, Building2, User, FileText, AlertCircle, Globe, Image as ImageIcon, Award, CalendarDays } from 'lucide-react';

const MSA_STATUS_OPTIONS = [
  { value: '',                          label: '— Sin estado —' },
  { value: 'candidate',                 label: 'MSA Candidacy (Candidate)' },
  { value: 'accreditation_in_progress', label: 'Accreditation In Progress' },
  { value: 'accredited',                label: 'MSA Accredited' },
  { value: 'not_applicable',            label: 'No aplica' },
];

const LANGUAGE_OPTIONS = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'es_en', label: 'Español / English (bilingüe)' },
];

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
  const { profile: authProfile } = useAuth();
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
    msa_status: '',
    active_school_year: '2025-2026',
    primary_language: 'es',
    document_footer: '',
  });

  useEffect(() => { loadSettings(); }, []);

  /** Carga la primera (y única) fila de configuración institucional */
  const loadSettings = async () => {
    setLoading(true);
    try {
      // maybeSingle() nunca lanza error si hay 0 filas — devuelve data=null
      const { data, error } = await supabase
        .from('institutional_settings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[InstitutionalSettings] load error:', error);
        throw new Error(error.message);
      }

      if (data) {
        setSettingsId(data.id);
        // Mezclar solo valores no nulos sobre los defaults del formulario
        setForm(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data).filter(([k, v]) => v !== null && v !== undefined && k !== 'id' && k !== 'created_at' && k !== 'updated_at')
          ),
        }));
      }
      // Si data es null: la fila no existe aún — el primer guardado hará INSERT
    } catch (err) {
      console.error('[InstitutionalSettings] load:', err);
      toast({ title: 'Error al cargar', description: err.message || 'No se pudo cargar la configuración.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Guarda la configuración:
   * 1. Si ya existe la fila (settingsId) → UPDATE
   * 2. Si no existe → INSERT
   * 3. Vuelve a leer la fila después de guardar para refrescar el estado
   *
   * NOTA: si el guardado falla con error 42501 (RLS) significa que la DB
   * tiene is_admin_or_director() usando `id` en lugar de `user_id`.
   * Ejecutar la migración 20260510_fix_rls_functions_user_id.sql para resolverlo.
   */
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // ── DIAGNÓSTICO: imprimir contexto completo antes de guardar ──────────────
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
      console.group('[InstitutionalSettings] Pre-save diagnostics');
      console.log('auth.uid()       :', authUser?.id ?? '(no session)');
      console.log('auth error       :', authErr?.message ?? 'none');
      console.log('profile.id       :', authProfile?.id ?? '(undefined)');
      console.log('profile.user_id  :', authProfile?.user_id ?? '(undefined)');
      console.log('profile.role     :', authProfile?.role ?? '(undefined)');
      console.log('settingsId (row) :', settingsId ?? '(no row yet → will INSERT)');
      console.groupEnd();
      // ─────────────────────────────────────────────────────────────────────────

      // Campos seguros a enviar (excluir campos internos de DB)
      const payload = {
        institution_name:      form.institution_name,
        legal_name:            form.legal_name     || null,
        fldoe_registration:    form.fldoe_registration || null,
        address:               form.address        || null,
        city:                  form.city           || null,
        state_province:        form.state_province || null,
        country:               form.country        || null,
        phone:                 form.phone          || null,
        email:                 form.email          || null,
        website:               form.website        || null,
        director_name:         form.director_name  || null,
        director_title:        form.director_title || null,
        director_signature_url:form.director_signature_url || null,
        logo_url:              form.logo_url       || null,
        seal_url:              form.seal_url       || null,
        legal_text_es:         form.legal_text_es  || null,
        legal_text_en:         form.legal_text_en  || null,
        apostille_text:        form.apostille_text || null,
        msa_status:            form.msa_status     || null,
        active_school_year:    form.active_school_year || null,
        primary_language:      form.primary_language || 'es',
        document_footer:       form.document_footer || null,
        updated_at:            new Date().toISOString(),
      };

      let savedId = settingsId;

      console.log('[InstitutionalSettings] Payload a enviar:', JSON.stringify(payload, null, 2));

      if (settingsId) {
        // ── UPDATE ──
        const { error } = await supabase
          .from('institutional_settings')
          .update(payload)
          .eq('id', settingsId);

        if (error) {
          console.error('[InstitutionalSettings] UPDATE error completo:', {
            code:    error.code,
            message: error.message,
            details: error.details,
            hint:    error.hint,
          });
          const parts = [
            error.message,
            error.code    ? `Código: ${error.code}` : null,
            error.details ? `Detalles: ${error.details}` : null,
            error.hint    ? `Hint: ${error.hint}` : null,
            error.code === '42501' ? '→ RLS bloqueó el guardado. Verificar migración fix_rls_functions_user_id y que el rol del usuario sea admin/super_admin/director.' : null,
            error.code === '42703' ? '→ Columna inexistente. Ejecutar migración 20260510_fase_cierre_operacional.sql para crear columnas nuevas.' : null,
          ].filter(Boolean);
          throw new Error(parts.join(' | '));
        }
      } else {
        // ── INSERT (primera vez) ──
        const { data: inserted, error } = await supabase
          .from('institutional_settings')
          .insert([payload])
          .select('id')
          .single();

        if (error) {
          console.error('[InstitutionalSettings] INSERT error completo:', {
            code:    error.code,
            message: error.message,
            details: error.details,
            hint:    error.hint,
          });
          const parts = [
            error.message,
            error.code    ? `Código: ${error.code}` : null,
            error.details ? `Detalles: ${error.details}` : null,
            error.hint    ? `Hint: ${error.hint}` : null,
            error.code === '42501' ? '→ RLS bloqueó el INSERT. Verificar migración fix_rls_functions_user_id.' : null,
            error.code === '42703' ? '→ Columna inexistente. Ejecutar migración 20260510_fase_cierre_operacional.sql.' : null,
          ].filter(Boolean);
          throw new Error(parts.join(' | '));
        }
        savedId = inserted.id;
        setSettingsId(savedId);
      }

      // ── Re-leer la fila para confirmar que quedó guardada en DB ──
      const { data: reloaded, error: reloadErr } = await supabase
        .from('institutional_settings')
        .select('*')
        .eq('id', savedId)
        .maybeSingle();

      if (!reloadErr && reloaded) {
        setForm(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(reloaded).filter(([k, v]) => v !== null && v !== undefined && k !== 'id' && k !== 'created_at' && k !== 'updated_at')
          ),
        }));
        toast({
          title: '✓ Configuración guardada',
          description: 'Los datos institucionales fueron actualizados correctamente.',
        });
      } else {
        // Guardó en DB pero no se pudo releer (poco probable)
        toast({
          title: '✓ Guardado (sin confirmación de lectura)',
          description: 'Los datos se enviaron a la DB pero no se pudo confirmar la lectura.',
        });
      }

    } catch (err) {
      console.error('[InstitutionalSettings] save error:', err);
      toast({
        title: 'Error al guardar',
        description: err.message || 'No se pudo guardar la configuración.',
        variant: 'destructive',
      });
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

      <Section icon={Award} title="Acreditación MSA y Año Escolar Activo">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Estado de Acreditación MSA-CESS">
            <select value={form.msa_status} onChange={set('msa_status')} className={INPUT}>
              {MSA_STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Aparece en documentos oficiales y expedientes.</p>
          </Field>
          <Field label="Año Escolar Activo">
            <input
              type="text"
              value={form.active_school_year}
              onChange={set('active_school_year')}
              className={INPUT}
              placeholder="2025-2026"
            />
            <p className="text-xs text-slate-500 mt-1">Usado como año por defecto en nuevos documentos.</p>
          </Field>
          <Field label="Idioma principal de documentos">
            <select value={form.primary_language} onChange={set('primary_language')} className={INPUT}>
              {LANGUAGE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
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
        <Field label="Pie de página / Footer para todos los documentos (opcional)">
          <textarea
            rows={2}
            value={form.document_footer}
            onChange={set('document_footer')}
            className={INPUT + ' resize-none'}
            placeholder="p. ej.: Documento emitido bajo supervisión de Chanak Foundation 501(c)(3) · FLDOE #134620"
          />
          <p className="text-xs text-slate-500 mt-1">Aparece al pie de boletines, contratos y cartas.</p>
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
