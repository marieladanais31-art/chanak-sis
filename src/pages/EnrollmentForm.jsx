/**
 * EnrollmentForm.jsx
 * Formulario público de solicitud de matrícula — Chanak International Academy
 * Rutas: /matricula  /enrollment  (sin autenticación)
 * Envía POST a /api/enrollment (proxy Vercel → Zapier server-side).
 * No guarda en Supabase. No crea usuarios.
 */

import React, { useState, useCallback } from 'react';
import {
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  Loader2, GraduationCap, User, Users, BookOpen, FileText, ClipboardCheck,
  ExternalLink,
} from 'lucide-react';

// ── Generador de folio ────────────────────────────────────────────────────────
function generateFolio() {
  const now  = new Date();
  const pad  = (n, l = 2) => String(n).padStart(l, '0');
  const date = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `CHA-${date}-${time}-${rand}`;
}

// ── Opciones ──────────────────────────────────────────────────────────────────
const PROGRAMAS = [
  'Off-Campus K-12 (España)',
  'Dual Diploma',
  'On-Campus',
  'Homeschool Supervisado',
];
const AÑOS_ESCOLARES = ['2025-2026', '2026-2027'];
const GRADOS = [
  'Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade',
  '5th Grade','6th Grade','7th Grade','8th Grade',
  '9th Grade','10th Grade','11th Grade','12th Grade',
];
const RELACIONES  = ['Madre','Padre','Tutor Legal','Abuelo/a','Otro'];
const IDIOMAS     = ['Español','Inglés','Bilingüe Español/Inglés','Otro'];
const PAISES      = ['España','Venezuela','Colombia','México','Argentina','Peru','Chile','Ecuador','Estados Unidos','Otro'];
const NIV_INGLES  = ['A1 – Principiante','A2 – Básico','B1 – Intermedio','B2 – Intermedio Alto','C1 – Avanzado','Nativo'];

// ── Pasos ─────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Programa',     icon: GraduationCap },
  { id: 2, label: 'Alumno',       icon: User          },
  { id: 3, label: 'Familia',      icon: Users         },
  { id: 4, label: 'Académico',    icon: BookOpen      },
  { id: 5, label: 'Documentos',   icon: FileText      },
  { id: 6, label: 'Confirmar',    icon: ClipboardCheck},
];

// ── Estado inicial ────────────────────────────────────────────────────────────
const INIT = {
  // Paso 1
  programa: '', añoEscolar: '2025-2026', fechaInicio: '', referencia: '',
  // Paso 2
  alumNombre: '', alumApellidos: '', alumFechaNac: '', alumGenero: '',
  alumNacional: '', alumPais: 'España', alumCiudad: '', alumDNI: '',
  alumIdioma: '', gradeSelected: '', neeCheck: 'No', neeDesc: '',
  // Paso 3
  tutNombre: '', tutRelacion: '', tutEmail: '', tutTel: '',
  tutPais: 'España', tutCiudad: '', tutDireccion: '',
  tut2Nombre: '', tut2Email: '', tut2Tel: '',
  // Paso 4
  instAnterior: '', instPais: '', nivelIngles: '', aceExp: 'No',
  fortalezas: '', dificultades: '', motivacion: '', cosmovis: '',
  // Paso 5 — Documentos
  tutorIdDocumentUrl: '', studentIdDocumentUrl: '',
  reportCardsLastTwoYearsUrl: '', neeDocumentsUrl: '', documentsNotes: '',
};

// ── Validación por paso ───────────────────────────────────────────────────────
const REQUIRED_BY_STEP = {
  1: ['programa','añoEscolar','fechaInicio'],
  2: ['alumNombre','alumApellidos','alumFechaNac','gradeSelected'],
  3: ['tutNombre','tutRelacion','tutEmail','tutTel'],
  4: [],
  5: [], // documentos opcionales — la familia puede enviarlos después por correo
};

// ── Estilos ───────────────────────────────────────────────────────────────────
const INPUT  = 'w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-[#193D6D] focus:border-[#193D6D] transition-colors';
const SELECT = INPUT + ' cursor-pointer';
const LABEL  = 'block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider';
const S2     = 'space-y-5';
const G2     = 'grid grid-cols-1 sm:grid-cols-2 gap-4';

// ─────────────────────────────────────────────────────────────────────────────
export default function EnrollmentForm() {
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState(INIT);
  const [errors,    setErrors]    = useState({});
  const [sending,   setSending]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sendError, setSendError] = useState('');
  const [folio]                   = useState(generateFolio);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const validate = useCallback((s) => {
    const required = REQUIRED_BY_STEP[s] || [];
    const errs = {};
    required.forEach(f => { if (!form[f] || !String(form[f]).trim()) errs[f] = 'Campo obligatorio'; });

    // Email tutor
    if (s === 3 && form.tutEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.tutEmail)) {
      errs.tutEmail = 'Email no válido';
    }
    // Los documentos son 100% opcionales — sin validación de URL en paso 5

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [form]);

  const next = () => { if (validate(step)) setStep(s => s + 1); };
  const prev = () => { setErrors({}); setStep(s => s - 1); };

  const handleSubmit = async () => {
    if (!validate(step)) return;
    setSending(true);
    setSendError('');

    const payload = {
      folioSIS: folio,
      // Paso 1
      programa: form.programa, añoEscolar: form.añoEscolar,
      fechaInicio: form.fechaInicio, referencia: form.referencia,
      // Paso 2
      alumNombre: form.alumNombre, alumApellidos: form.alumApellidos,
      alumFechaNac: form.alumFechaNac, alumGenero: form.alumGenero,
      alumNacional: form.alumNacional, alumPais: form.alumPais,
      alumCiudad: form.alumCiudad, alumDNI: form.alumDNI,
      alumIdioma: form.alumIdioma, gradeSelected: form.gradeSelected,
      neeCheck: form.neeCheck, neeDesc: form.neeDesc,
      // Paso 3
      tutNombre: form.tutNombre, tutRelacion: form.tutRelacion,
      tutEmail: form.tutEmail, tutTel: form.tutTel,
      tutPais: form.tutPais, tutCiudad: form.tutCiudad,
      tutDireccion: form.tutDireccion,
      tut2Nombre: form.tut2Nombre, tut2Email: form.tut2Email, tut2Tel: form.tut2Tel,
      // Paso 4
      instAnterior: form.instAnterior, instPais: form.instPais,
      nivelIngles: form.nivelIngles, aceExp: form.aceExp,
      fortalezas: form.fortalezas, dificultades: form.dificultades,
      motivacion: form.motivacion, cosmovis: form.cosmovis,
      // Paso 5 — Documentos
      tutorIdDocumentUrl:         form.tutorIdDocumentUrl,
      studentIdDocumentUrl:       form.studentIdDocumentUrl,
      reportCardsLastTwoYearsUrl: form.reportCardsLastTwoYearsUrl,
      neeDocumentsUrl:            form.neeDocumentsUrl    || 'No aplica',
      documentsNotes:             form.documentsNotes     || 'No proporcionado',
    };

    // El sitio está en Vercel → /api/enrollment existe como serverless function.
    // El proxy hace el fetch server-side a Zapier (sin CORS, sin preflight).
    const ENDPOINT = '/api/enrollment';
    const fullPayload = {
      ...payload,
      stripePaymentLink: 'https://buy.stripe.com/aFa7sMgjLcBvfvW2NQ67S0c',
      paymentStatus:     'Pendiente de pago',
      fechaEnvio:        new Date().toISOString(),
      origen:            'Formulario público /matricula',
    };

    console.log('ENROLLMENT ENDPOINT', ENDPOINT);
    console.log('ENROLLMENT PAYLOAD FINAL', fullPayload);

    try {
      const res = await fetch(ENDPOINT, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(fullPayload),
      });

      console.log('ENROLLMENT RESPONSE STATUS', res.status);
      const data = await res.json().catch(() => ({}));
      console.log('ENROLLMENT RESPONSE BODY', data);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (err) {
      console.error('[EnrollmentForm] submit error:', err.message);
      setSendError('No se pudo enviar la solicitud. Inténtelo nuevamente o contacte con offcampus@chanakacademy.org.');
    } finally {
      setSending(false);
    }
  };

  // ── Pantalla de éxito ─────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#193D6D] to-[#20B2AA] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-10 text-center space-y-5">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-black text-[#193D6D]">¡Solicitud recibida!</h1>
          <p className="text-slate-600 font-medium">
            Hemos registrado su solicitud de matrícula con el folio{' '}
            <strong>{folio}</strong> para <strong>{form.alumNombre} {form.alumApellidos}</strong>.
            Si no adjuntó los documentos, puede enviarlos posteriormente a{' '}
            <a href="mailto:offcampus@chanakacademy.org" className="underline font-bold text-[#193D6D]">offcampus@chanakacademy.org</a>{' '}
            indicando su folio SIS.
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-3">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">Número de folio</p>
            <p className="text-lg font-black text-[#193D6D]">{folio}</p>
          </div>
          <a
            href="https://buy.stripe.com/aFa7sMgjLcBvfvW2NQ67S0c"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#193D6D] hover:bg-[#142d5a] text-white rounded-xl font-black text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Realizar pago inicial / reserva de plaza
          </a>
          <p className="text-xs text-slate-400 italic leading-relaxed">
            El pago no garantiza admisión automática. La solicitud queda sujeta a revisión
            académica y administrativa por parte de Chanak International Academy.
          </p>
          <p className="text-xs text-slate-400">
            Consultas: <a href="mailto:offcampus@chanakacademy.org" className="underline">offcampus@chanakacademy.org</a>
          </p>
        </div>
      </div>
    );
  }

  // ── Layout principal ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#193D6D] to-[#20B2AA]">
      <header className="text-white text-center py-8 px-4">
        <p className="text-sm font-bold opacity-80 tracking-widest uppercase">Chanak International Academy</p>
        <h1 className="text-2xl md:text-3xl font-black mt-1">Solicitud de Matrícula Off-Campus</h1>
        <p className="text-sm opacity-70 mt-1">FLDOE #134620 · chanakacademy.org</p>
      </header>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        {/* Barra de pasos */}
        <div className="flex items-center justify-center gap-1 mb-8 flex-wrap">
          {STEPS.map((s, idx) => {
            const Icon  = s.icon;
            const active = step === s.id;
            const done   = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all ${
                  active ? 'bg-white text-[#193D6D] shadow-lg' :
                  done   ? 'bg-white/30 text-white' : 'bg-white/10 text-white/50'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">{s.label}</span>
                </div>
                {idx < STEPS.length - 1 && <div className={`h-px w-3 md:w-5 ${step > s.id ? 'bg-white/60' : 'bg-white/20'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-[#193D6D] px-8 py-5">
            <h2 className="text-white font-black text-lg">
              {STEPS[step-1]?.label} — Paso {step} de {STEPS.length}
            </h2>
          </div>

          <div className="p-8">
            {/* ── PASO 1: Programa ── */}
            {step === 1 && (
              <div className={S2}>
                <div>
                  <label className={LABEL}>Programa solicitado *</label>
                  <select value={form.programa} onChange={set('programa')} className={SELECT}>
                    <option value="">Seleccionar programa…</option>
                    {PROGRAMAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {errors.programa && <Err>{errors.programa}</Err>}
                </div>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Año escolar *</label>
                    <select value={form.añoEscolar} onChange={set('añoEscolar')} className={SELECT}>
                      {AÑOS_ESCOLARES.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Fecha de inicio deseada *</label>
                    <input type="date" value={form.fechaInicio} onChange={set('fechaInicio')} className={INPUT} />
                    {errors.fechaInicio && <Err>{errors.fechaInicio}</Err>}
                  </div>
                </div>
                <div>
                  <label className={LABEL}>¿Cómo nos conociste? / Referencia</label>
                  <input type="text" value={form.referencia} onChange={set('referencia')} className={INPUT}
                    placeholder="Google, recomendación, redes sociales…" />
                </div>
              </div>
            )}

            {/* ── PASO 2: Alumno ── */}
            {step === 2 && (
              <div className={S2}>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Nombre(s) del alumno *</label>
                    <input type="text" value={form.alumNombre} onChange={set('alumNombre')} className={INPUT} />
                    {errors.alumNombre && <Err>{errors.alumNombre}</Err>}
                  </div>
                  <div>
                    <label className={LABEL}>Apellidos *</label>
                    <input type="text" value={form.alumApellidos} onChange={set('alumApellidos')} className={INPUT} />
                    {errors.alumApellidos && <Err>{errors.alumApellidos}</Err>}
                  </div>
                </div>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Fecha de nacimiento *</label>
                    <input type="date" value={form.alumFechaNac} onChange={set('alumFechaNac')} className={INPUT} />
                    {errors.alumFechaNac && <Err>{errors.alumFechaNac}</Err>}
                  </div>
                  <div>
                    <label className={LABEL}>Género</label>
                    <select value={form.alumGenero} onChange={set('alumGenero')} className={SELECT}>
                      <option value="">Seleccionar…</option>
                      <option>Masculino</option><option>Femenino</option><option>Prefiero no indicar</option>
                    </select>
                  </div>
                </div>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Nacionalidad</label>
                    <input type="text" value={form.alumNacional} onChange={set('alumNacional')} className={INPUT} placeholder="Española, Venezolana…" />
                  </div>
                  <div>
                    <label className={LABEL}>País de residencia</label>
                    <select value={form.alumPais} onChange={set('alumPais')} className={SELECT}>
                      {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Ciudad</label>
                    <input type="text" value={form.alumCiudad} onChange={set('alumCiudad')} className={INPUT} />
                  </div>
                  <div>
                    <label className={LABEL}>DNI / Pasaporte</label>
                    <input type="text" value={form.alumDNI} onChange={set('alumDNI')} className={INPUT} />
                  </div>
                </div>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Idioma materno</label>
                    <select value={form.alumIdioma} onChange={set('alumIdioma')} className={SELECT}>
                      <option value="">Seleccionar…</option>
                      {IDIOMAS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Grado al que ingresa *</label>
                    <select value={form.gradeSelected} onChange={set('gradeSelected')} className={SELECT}>
                      <option value="">Seleccionar grado…</option>
                      {GRADOS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    {errors.gradeSelected && <Err>{errors.gradeSelected}</Err>}
                  </div>
                </div>
                <div>
                  <label className={LABEL}>¿Tiene necesidades educativas especiales o diagnóstico previo?</label>
                  <div className="flex gap-4">
                    {['No','Sí'].map(v => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                        <input type="radio" name="neeCheck" value={v} checked={form.neeCheck === v} onChange={set('neeCheck')} className="accent-[#193D6D]" />
                        {v}
                      </label>
                    ))}
                  </div>
                  {form.neeCheck === 'Sí' && (
                    <textarea rows={3} value={form.neeDesc} onChange={set('neeDesc')} className={INPUT + ' mt-2 resize-none'}
                      placeholder="Describe brevemente el diagnóstico, apoyos recibidos y necesidades actuales." />
                  )}
                </div>
              </div>
            )}

            {/* ── PASO 3: Familia ── */}
            {step === 3 && (
              <div className={S2}>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 font-bold">Tutor / Responsable Legal Principal</div>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Nombre completo *</label>
                    <input type="text" value={form.tutNombre} onChange={set('tutNombre')} className={INPUT} />
                    {errors.tutNombre && <Err>{errors.tutNombre}</Err>}
                  </div>
                  <div>
                    <label className={LABEL}>Relación con el alumno *</label>
                    <select value={form.tutRelacion} onChange={set('tutRelacion')} className={SELECT}>
                      <option value="">Seleccionar…</option>
                      {RELACIONES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {errors.tutRelacion && <Err>{errors.tutRelacion}</Err>}
                  </div>
                </div>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Correo electrónico *</label>
                    <input type="email" value={form.tutEmail} onChange={set('tutEmail')} className={INPUT} />
                    {errors.tutEmail && <Err>{errors.tutEmail}</Err>}
                  </div>
                  <div>
                    <label className={LABEL}>Teléfono / WhatsApp *</label>
                    <input type="tel" value={form.tutTel} onChange={set('tutTel')} className={INPUT} placeholder="+34 600 000 000" />
                    {errors.tutTel && <Err>{errors.tutTel}</Err>}
                  </div>
                </div>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>País</label>
                    <select value={form.tutPais} onChange={set('tutPais')} className={SELECT}>
                      {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Ciudad</label>
                    <input type="text" value={form.tutCiudad} onChange={set('tutCiudad')} className={INPUT} />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Dirección postal</label>
                  <input type="text" value={form.tutDireccion} onChange={set('tutDireccion')} className={INPUT} placeholder="Calle, número, código postal…" />
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Segundo tutor / responsable (opcional)</p>
                  <div className={G2}>
                    <div>
                      <label className={LABEL}>Nombre completo</label>
                      <input type="text" value={form.tut2Nombre} onChange={set('tut2Nombre')} className={INPUT} />
                    </div>
                    <div>
                      <label className={LABEL}>Correo electrónico</label>
                      <input type="email" value={form.tut2Email} onChange={set('tut2Email')} className={INPUT} />
                    </div>
                  </div>
                  <div className="mt-4 max-w-xs">
                    <label className={LABEL}>Teléfono</label>
                    <input type="tel" value={form.tut2Tel} onChange={set('tut2Tel')} className={INPUT} placeholder="+34 600 000 000" />
                  </div>
                </div>
              </div>
            )}

            {/* ── PASO 4: Académico ── */}
            {step === 4 && (
              <div className={S2}>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Institución educativa anterior</label>
                    <input type="text" value={form.instAnterior} onChange={set('instAnterior')} className={INPUT} placeholder="Nombre del colegio o escuela" />
                  </div>
                  <div>
                    <label className={LABEL}>País de la institución anterior</label>
                    <select value={form.instPais} onChange={set('instPais')} className={SELECT}>
                      <option value="">Seleccionar…</option>
                      {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className={G2}>
                  <div>
                    <label className={LABEL}>Nivel de inglés del alumno</label>
                    <select value={form.nivelIngles} onChange={set('nivelIngles')} className={SELECT}>
                      <option value="">Seleccionar…</option>
                      {NIV_INGLES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>¿Experiencia previa con currículo A.C.E.?</label>
                    <div className="flex gap-4 mt-2">
                      {['No','Sí'].map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-700">
                          <input type="radio" name="aceExp" value={v} checked={form.aceExp === v} onChange={set('aceExp')} className="accent-[#193D6D]" />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Fortalezas académicas y personales del alumno</label>
                  <textarea rows={3} value={form.fortalezas} onChange={set('fortalezas')} className={INPUT + ' resize-none'}
                    placeholder="Materias en las que destaca, habilidades especiales, actitudes positivas…" />
                </div>
                <div>
                  <label className={LABEL}>Áreas de mejora o dificultades detectadas</label>
                  <textarea rows={3} value={form.dificultades} onChange={set('dificultades')} className={INPUT + ' resize-none'}
                    placeholder="Materias o habilidades donde necesita apoyo adicional…" />
                </div>
                <div>
                  <label className={LABEL}>Motivación para solicitar este programa</label>
                  <textarea rows={3} value={form.motivacion} onChange={set('motivacion')} className={INPUT + ' resize-none'}
                    placeholder="¿Por qué eligieron Chanak? ¿Qué esperan lograr?" />
                </div>
                <div>
                  <label className={LABEL}>Cosmovisión / valores familiares</label>
                  <textarea rows={2} value={form.cosmovis} onChange={set('cosmovis')} className={INPUT + ' resize-none'}
                    placeholder="Describe brevemente los valores y perspectiva de su familia (opcional)" />
                </div>
              </div>
            )}

            {/* ── PASO 5: Documentos ── */}
            {step === 5 && (
              <div className={S2}>
                {/* Instrucciones */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-2">
                  <p className="font-black text-[#193D6D] text-sm">Documentación académica y legal</p>
                  <p className="text-sm text-blue-800 font-medium">
                    Si ya tiene los documentos preparados en Google Drive, puede pegar aquí los enlaces.
                    Si todavía no los tiene, puede continuar con la solicitud y enviarlos después por
                    correo a <strong>offcampus@chanakacademy.org</strong>.
                  </p>
                  <ul className="text-xs text-blue-700 font-medium list-disc list-inside space-y-1 mt-2">
                    <li>Identificación del tutor legal (Pasaporte, DNI, NIE)</li>
                    <li>Identificación del estudiante (Pasaporte, DNI, NIE)</li>
                    <li>Boletines o reportes académicos de los últimos dos años</li>
                    <li>Informe psicopedagógico / NEE, si aplica</li>
                  </ul>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800 font-semibold">
                  ✅ Puede completar la solicitud ahora y enviar los documentos más adelante por correo a
                  offcampus@chanakacademy.org. La revisión académica comenzará cuando recibamos la
                  documentación necesaria.
                </div>

                {/* Identificación tutor */}
                <div>
                  <label className={LABEL}>Documento de identidad del tutor legal <span className="normal-case font-normal text-slate-400">(opcional)</span></label>
                  <input type="url" value={form.tutorIdDocumentUrl} onChange={set('tutorIdDocumentUrl')} className={INPUT}
                    placeholder="https://drive.google.com/file/d/… (dejar vacío si lo envía después)" />
                  {errors.tutorIdDocumentUrl && <Err>{errors.tutorIdDocumentUrl}</Err>}
                </div>

                {/* Identificación estudiante */}
                <div>
                  <label className={LABEL}>Documento de identidad del estudiante <span className="normal-case font-normal text-slate-400">(opcional)</span></label>
                  <input type="url" value={form.studentIdDocumentUrl} onChange={set('studentIdDocumentUrl')} className={INPUT}
                    placeholder="https://drive.google.com/file/d/… (dejar vacío si lo envía después)" />
                  {errors.studentIdDocumentUrl && <Err>{errors.studentIdDocumentUrl}</Err>}
                </div>

                {/* Boletines */}
                <div>
                  <label className={LABEL}>Boletines o reportes académicos de los últimos dos años <span className="normal-case font-normal text-slate-400">(opcional)</span></label>
                  <input type="url" value={form.reportCardsLastTwoYearsUrl} onChange={set('reportCardsLastTwoYearsUrl')} className={INPUT}
                    placeholder="https://drive.google.com/drive/folders/… (dejar vacío si lo envía después)" />
                  {errors.reportCardsLastTwoYearsUrl && <Err>{errors.reportCardsLastTwoYearsUrl}</Err>}
                </div>

                {/* NEE */}
                <div>
                  <label className={LABEL}>Documentación NEE / necesidades educativas, si aplica <span className="normal-case font-normal text-slate-400">(opcional)</span></label>
                  <input type="url" value={form.neeDocumentsUrl} onChange={set('neeDocumentsUrl')} className={INPUT}
                    placeholder="https://drive.google.com/file/d/… (dejar vacío si no aplica)" />
                  {errors.neeDocumentsUrl && <Err>{errors.neeDocumentsUrl}</Err>}
                </div>

                {/* Notas */}
                <div>
                  <label className={LABEL}>Notas sobre documentación pendiente <span className="normal-case font-normal text-slate-400">(opcional)</span></label>
                  <textarea rows={3} value={form.documentsNotes} onChange={set('documentsNotes')} className={INPUT + ' resize-none'}
                    placeholder="Ej: Enviamos los boletines esta semana. El pasaporte del alumno llega el día 15." />
                </div>
              </div>
            )}

            {/* ── PASO 6: Confirmar ── */}
            {step === 6 && (
              <div className={S2}>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-2">
                  <h3 className="font-black text-[#193D6D] text-lg">Resumen de la solicitud</h3>

                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider pt-2">Datos generales</p>
                  <Row label="Folio SIS"          value={folio} highlight />
                  <Row label="Programa"            value={form.programa} />
                  <Row label="Año escolar"         value={form.añoEscolar} />
                  <Row label="Fecha de inicio"     value={form.fechaInicio} />
                  <Row label="Alumno"              value={`${form.alumNombre} ${form.alumApellidos}`} />
                  <Row label="Fecha de nacimiento" value={form.alumFechaNac} />
                  <Row label="Grado solicitado"    value={form.gradeSelected} />
                  <Row label="Tutor principal"     value={form.tutNombre} />
                  <Row label="Email tutor"         value={form.tutEmail} />
                  <Row label="Teléfono tutor"      value={form.tutTel} />

                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider pt-3">Documentación</p>
                  {(form.tutorIdDocumentUrl || form.studentIdDocumentUrl || form.reportCardsLastTwoYearsUrl) ? (
                    <>
                      <Row label="ID tutor legal"   value={form.tutorIdDocumentUrl         ? 'Enlace registrado ✓' : 'Pendiente'} />
                      <Row label="ID estudiante"    value={form.studentIdDocumentUrl       ? 'Enlace registrado ✓' : 'Pendiente'} />
                      <Row label="Boletines"        value={form.reportCardsLastTwoYearsUrl ? 'Enlace registrado ✓' : 'Pendiente'} />
                      {form.documentsNotes && <Row label="Notas" value={form.documentsNotes} />}
                    </>
                  ) : (
                    <p className="text-sm text-amber-700 font-bold bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Pendiente de envío por correo a offcampus@chanakacademy.org
                    </p>
                  )}
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 font-medium">
                  <p className="font-black mb-1">Antes de enviar, confirma que:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Los datos del alumno y del tutor son correctos.</li>
                    <li>El correo electrónico del tutor es válido para recibir comunicaciones.</li>
                    <li>Los enlaces de Google Drive tienen permisos de visualización.</li>
                    <li>Comprende que esta solicitud no garantiza plaza; el equipo evaluará y contactará.</li>
                  </ul>
                </div>

                {sendError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold text-red-700">{sendError}</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Navegación ── */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              {step > 1 ? (
                <button type="button" onClick={prev}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors text-sm">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
              ) : <div />}

              {step < STEPS.length ? (
                <button type="button" onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#193D6D] hover:bg-[#142d5a] text-white rounded-xl font-bold text-sm transition-colors">
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={sending}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {sending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                    : <><CheckCircle2 className="w-4 h-4" /> Enviar solicitud</>}
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          Chanak International Academy · FLDOE #134620 ·{' '}
          <a href="mailto:offcampus@chanakacademy.org" className="underline">offcampus@chanakacademy.org</a>
        </p>
      </div>
    </div>
  );
}

// ── Micro-componentes ─────────────────────────────────────────────────────────
function Err({ children }) {
  return (
    <p className="text-xs font-bold text-red-600 mt-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3" />{children}
    </p>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="font-bold text-slate-500 w-36 shrink-0">{label}:</span>
      <span className={`font-bold ${highlight ? 'text-[#193D6D] font-black text-base' : 'text-slate-800'}`}>
        {value || '—'}
      </span>
    </div>
  );
}
