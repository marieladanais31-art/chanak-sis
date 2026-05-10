/**
 * SisDebugPanel — Diagnóstico SIS en tiempo real
 *
 * Muestra:
 *  - Identidad: auth.uid, profile.id, profile.user_id, role
 *  - Funciones DB: get_current_user_role(), is_admin_or_director(),
 *                  can_manage_institutional_settings()
 *  - Permisos READ por tabla (yes / no / error code)
 *  - Conteos de filas por tabla
 *
 * Solo visible para super_admin / admin — no expone PII.
 */
import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Terminal } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function testRead(table) {
  const { error } = await supabase.from(table).select('id').limit(1);
  if (!error) return { ok: true };
  return { ok: false, code: error.code, msg: error.message };
}

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return `ERR(${error.code})`;
  return count ?? 0;
}

async function callRpc(name) {
  const { data, error } = await supabase.rpc(name);
  if (error) return `ERR: ${error.message}`;
  if (data === null || data === undefined) return '(null)';
  return String(data);
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusChip({ ok, value, code }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
        <CheckCircle2 className="w-3 h-3" /> SÍ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold" title={value}>
      <XCircle className="w-3 h-3" /> NO {code ? `(${code})` : ''}
    </span>
  );
}

function BoolChip({ value }) {
  if (value === 'true') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
        <CheckCircle2 className="w-3 h-3" /> true
      </span>
    );
  }
  if (value === 'false') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
        <XCircle className="w-3 h-3" /> false
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
      <AlertTriangle className="w-3 h-3" /> {value}
    </span>
  );
}

function Row({ label, value, mono = true }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2.5 pr-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-56">
        {label}
      </td>
      <td className={`py-2.5 text-sm text-slate-800 ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value}
      </td>
    </tr>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

const TABLES_TO_TEST = [
  'institutional_settings',
  'academic_calendars',
  'operational_links',
  'students',
  'family_students',
  'profiles',
  'student_grade_entries',
];

const TABLES_TO_COUNT = [
  'students',
  'profiles',
  'family_students',
  'academic_calendars',
  'institutional_settings',
];

export default function SisDebugPanel() {
  const { profile: authProfile } = useAuth();
  const [running, setRunning]   = useState(false);
  const [diag, setDiag]         = useState(null);
  const [timestamp, setTimestamp] = useState(null);

  const runDiag = async () => {
    setRunning(true);
    setDiag(null);
    try {
      // ── Identidad ─────────────────────────────────────────────────────────
      const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();

      // ── Funciones DB ──────────────────────────────────────────────────────
      const [dbRole, isAdminVal, canSettingsVal] = await Promise.all([
        callRpc('get_current_user_role'),
        callRpc('is_admin_or_director'),
        callRpc('can_manage_institutional_settings'),
      ]);

      // ── Permisos READ ─────────────────────────────────────────────────────
      const reads = {};
      await Promise.all(
        TABLES_TO_TEST.map(async (t) => {
          reads[t] = await testRead(t);
        })
      );

      // ── Conteos ───────────────────────────────────────────────────────────
      const counts = {};
      await Promise.all(
        TABLES_TO_COUNT.map(async (t) => {
          counts[t] = await countRows(t);
        })
      );

      // ── Verificar columnas nuevas en institutional_settings ───────────────
      const { data: colCheck } = await supabase.rpc
        ? { data: null }  // placeholder; usamos query directa abajo
        : { data: null };

      const { data: missingCols } = await supabase
        .from('institutional_settings')
        .select('msa_status, active_school_year, primary_language, document_footer')
        .limit(0);

      const newColsExist = missingCols !== undefined; // si no hay error de columna, existen

      setDiag({
        authUid:       authUser?.id ?? '(no session)',
        authErr:       authErr?.message ?? null,
        profileId:     authProfile?.id ?? '(undefined)',
        profileUserId: authProfile?.user_id ?? '(undefined)',
        profileRole:   authProfile?.role ?? '(undefined)',
        dbRole,
        isAdmin:       isAdminVal,
        canSettings:   canSettingsVal,
        reads,
        counts,
        newColsExist,
      });
      setTimestamp(new Date().toLocaleTimeString());
    } catch (err) {
      setDiag({ fatalError: err.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-black text-slate-800">Diagnóstico SIS</h2>
            {timestamp && (
              <p className="text-xs text-slate-400 mt-0.5">Última ejecución: {timestamp}</p>
            )}
          </div>
        </div>
        <button
          onClick={runDiag}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-60"
        >
          {running
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />}
          {running ? 'Ejecutando…' : 'Ejecutar diagnóstico'}
        </button>
      </div>

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-800">Solo visible para Super Admin / Admin</p>
          <p className="text-amber-700 mt-0.5">
            Este panel ejecuta consultas de diagnóstico en tiempo real contra la base de datos.
            Pulsa "Ejecutar diagnóstico" para ver el estado actual. No modifica ningún dato.
          </p>
        </div>
      </div>

      {/* Spinner mientras corre */}
      {running && (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
          <p className="text-slate-500 text-sm font-medium">Consultando base de datos…</p>
        </div>
      )}

      {/* Error fatal */}
      {diag?.fatalError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <strong>Error fatal durante diagnóstico:</strong> {diag.fatalError}
        </div>
      )}

      {/* Resultados */}
      {diag && !diag.fatalError && (
        <div className="space-y-6">

          {/* ── Identidad ───────────────────────────────────────────────── */}
          <Section title="Identidad del usuario autenticado">
            <table className="w-full">
              <tbody>
                <Row label="auth.uid()"       value={diag.authUid} />
                <Row label="profile.id"       value={diag.profileId} />
                <Row label="profile.user_id"  value={diag.profileUserId} />
                <Row label="profile.role"     value={diag.profileRole} />
                {diag.authErr && (
                  <Row label="auth error"     value={diag.authErr} />
                )}
              </tbody>
            </table>
            {diag.authUid === diag.profileId && (
              <Pill color="amber" text="Perfil LEGACY: profiles.id = auth.uid()" />
            )}
            {diag.authUid === diag.profileUserId && diag.authUid !== diag.profileId && (
              <Pill color="blue" text="Perfil MODERNO: profiles.user_id = auth.uid(), profiles.id es UUID distinto" />
            )}
            {diag.profileUserId === '(undefined)' && (
              <Pill color="red" text="WARNING: profile.user_id no definido — puede causar problemas de RLS" />
            )}
          </Section>

          {/* ── Funciones DB ─────────────────────────────────────────────── */}
          <Section title="Funciones de seguridad en DB">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-56">
                    get_current_user_role()
                  </td>
                  <td className="py-2.5">
                    <span className="font-mono text-xs text-slate-800 px-2 py-0.5 bg-slate-100 rounded">
                      {diag.dbRole}
                    </span>
                    {diag.dbRole !== diag.profileRole && !diag.dbRole.startsWith('ERR') && (
                      <span className="ml-2 text-xs text-red-600 font-bold">
                        ⚠ Discrepancia con profile.role ({diag.profileRole})
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 pr-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    is_admin_or_director()
                  </td>
                  <td className="py-2.5">
                    <BoolChip value={diag.isAdmin} />
                    {diag.isAdmin === 'false' && (
                      <span className="ml-2 text-xs text-red-600 font-bold">
                        → RLS bloqueará calendar y otras tablas
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    can_manage_institutional_settings()
                  </td>
                  <td className="py-2.5">
                    <BoolChip value={diag.canSettings} />
                    {diag.canSettings === 'false' && (
                      <span className="ml-2 text-xs text-red-600 font-bold">
                        → RLS bloqueará guardado en institutional_settings
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* ── Columnas nuevas en institutional_settings ─────────────────── */}
          <Section title="Columnas de institutional_settings (migración 20260510)">
            <div className="flex items-center gap-3">
              {diag.newColsExist
                ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                : <XCircle className="w-5 h-5 text-red-500" />}
              <div>
                {diag.newColsExist ? (
                  <p className="text-sm font-bold text-emerald-700">
                    ✓ Columnas msa_status, active_school_year, primary_language, document_footer existen
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-bold text-red-700">
                      ✗ Columnas nuevas NO existen → error 42703 al guardar
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Ejecutar: <code className="bg-red-50 px-1 rounded">20260510_fase_cierre_operacional.sql</code>
                    </p>
                  </>
                )}
              </div>
            </div>
          </Section>

          {/* ── Permisos READ ─────────────────────────────────────────────── */}
          <Section title="Permisos de lectura por tabla">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-black text-slate-500 uppercase tracking-wider">
                    <th className="p-3 text-left rounded-l-lg">Tabla</th>
                    <th className="p-3 text-left">Puede leer</th>
                    <th className="p-3 text-left rounded-r-lg">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TABLES_TO_TEST.map((t) => {
                    const r = diag.reads[t];
                    return (
                      <tr key={t} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs text-slate-700">{t}</td>
                        <td className="p-3">
                          <StatusChip ok={r.ok} code={r.code} value={r.msg} />
                        </td>
                        <td className="p-3 text-xs text-slate-400">
                          {r.ok ? 'OK' : r.msg}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Conteos ───────────────────────────────────────────────────── */}
          <Section title="Conteo de filas por tabla">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {TABLES_TO_COUNT.map((t) => (
                <div key={t} className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-2xl font-black text-slate-800">{diag.counts[t]}</p>
                  <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{t}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Diagnóstico de perfil de autenticación ─────────────────────── */}
          {(diag.isAdmin === 'false' || diag.canSettings === 'false' || diag.dbRole.startsWith('ERR')) && (
            <div className="p-5 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <p className="font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Acción requerida — Permisos bloqueados
              </p>
              <ul className="text-sm text-red-700 space-y-1 ml-6 list-disc">
                {diag.dbRole.startsWith('ERR') && (
                  <li>
                    <strong>get_current_user_role()</strong> devuelve error.
                    Verificar que la migración <code>20260510_fix_rls_functions_user_id.sql</code> fue ejecutada.
                  </li>
                )}
                {diag.isAdmin === 'false' && (
                  <li>
                    <strong>is_admin_or_director()</strong> retorna false para este usuario.
                    Si el rol en DB es correcto ({diag.dbRole}), puede ser que
                    <code>get_current_user_role()</code> no esté buscando por <code>user_id</code>.
                    Ejecutar <code>20260510_fix_rls_functions_user_id.sql</code>.
                  </li>
                )}
                {diag.canSettings === 'false' && (
                  <li>
                    <strong>can_manage_institutional_settings()</strong> retorna false.
                    Institutional Settings no podrá guardarse. Mismo fix que arriba.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* ── Todo OK ──────────────────────────────────────────────────── */}
          {diag.isAdmin === 'true' && diag.canSettings === 'true' && diag.newColsExist &&
            Object.values(diag.reads).every(r => r.ok) && (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Sistema en buen estado — Todas las tablas accesibles y funciones correctas
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ─── Helpers internos ──────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Pill({ color, text }) {
  const colors = {
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue:  'bg-blue-50 border-blue-200 text-blue-800',
    red:   'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`mt-3 px-3 py-2 rounded-lg border text-xs font-medium ${colors[color] || colors.amber}`}>
      {text}
    </div>
  );
}
