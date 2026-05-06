
import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

/**
 * CallbackPage — procesa tokens de Supabase (PKCE y flujo implícito).
 *
 * HARD STOP para recovery:
 *  Si detecta que el callback es de recuperación de contraseña (por URL o sessionStorage),
 *  pone la bandera 'passwordRecoveryInProgress' en sessionStorage y redirige a /auth/reset
 *  SIN cargar perfil ni navegar por rol.
 *
 * Detección de recovery (por orden de prioridad):
 *  1. sessionStorage.getItem('passwordRecoveryInProgress') === 'true'  (misma sesión de browser)
 *  2. ?type=recovery  en query string
 *  3. type=recovery   en el hash original (antes de que el SDK lo limpie)
 *  4. AMR claim 'otp' en la sesión (PKCE recovery)
 */
const CallbackPage = () => {
  const hasProcessed = useRef(false);

  // ── Captura SÍNCRONA del search y hash antes de cualquier effect ──────────
  // IMPORTANTE: se captura en el cuerpo del componente (render síncrono),
  // antes de que el SDK pueda limpiar el hash con detectSessionInUrl=true.
  const rawSearch = useRef(window.location.search);
  const rawHash   = useRef(window.location.hash);

  const [redirectPath, setRedirectPath] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    console.log('CALLBACK search:', rawSearch.current);
    console.log('CALLBACK hash:  ', rawHash.current ? '(present, len=' + rawHash.current.length + ')' : '(empty)');

    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(rawSearch.current);
        const code = urlParams.get('code');
        const type = urlParams.get('type');                   // ?type=recovery
        const next = urlParams.get('next') || '/';

        // ── DETECCIÓN DE RECOVERY: nivel 1 — sessionStorage ─────────────────
        const storedFlag = sessionStorage.getItem('passwordRecoveryInProgress') === 'true';

        // ── DETECCIÓN DE RECOVERY: nivel 2 — URL ────────────────────────────
        const recoveryInSearch =
          rawSearch.current.includes('type=recovery') ||
          rawSearch.current.includes('type=PASSWORD_RECOVERY');

        const recoveryInHash =
          rawHash.current.includes('type=recovery') ||
          rawHash.current.includes('type=PASSWORD_RECOVERY');

        const recoveryFromUrl = recoveryInSearch || recoveryInHash;

        // Detección rápida: si ya tenemos señal sin necesitar intercambiar sesión
        const isEarlyRecovery = storedFlag || recoveryFromUrl;

        console.log(`CALLBACK type=${type} code=${!!code} storedFlag=${storedFlag} recoveryFromUrl=${recoveryFromUrl}`);

        if (code) {
          // ── Flujo PKCE: intercambiar código ──────────────────────────────
          console.log('CALLBACK: exchanging PKCE code...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('CALLBACK: exchangeCodeForSession failed:', error.message);
            // Si el flag de recovery ya estaba, igual redirigir a /auth/reset
            // para que el usuario vea un mensaje de "enlace expirado"
            if (isEarlyRecovery) {
              console.log('RECOVERY DETECTED - redirecting to /auth/reset (session error)');
              sessionStorage.setItem('passwordRecoveryInProgress', 'true');
              setRedirectPath('/auth/reset');
              return;
            }
            setRedirectPath('/login');
            return;
          }

          // ── DETECCIÓN DE RECOVERY: nivel 3 — AMR ────────────────────────
          const amrMethods = data.session?.user?.amr?.map?.((a) => a.method) ?? [];
          const recoveryFromAmr =
            amrMethods.includes('otp') ||
            amrMethods.includes('recovery');

          const isRecovery = isEarlyRecovery || recoveryFromAmr;
          console.log(`CALLBACK: isRecovery=${isRecovery} amr=${JSON.stringify(amrMethods)}`);

          if (isRecovery) {
            console.log('RECOVERY DETECTED - redirecting to /auth/reset');
            sessionStorage.setItem('passwordRecoveryInProgress', 'true');
            // Limpiar URL
            window.history.replaceState({}, document.title, window.location.pathname);
            setRedirectPath('/auth/reset');
          } else {
            console.log(`CALLBACK: normal session. Redirecting to ${next}`);
            window.history.replaceState({}, document.title, window.location.pathname);
            setRedirectPath(next);
          }

        } else {
          // ── Flujo implícito: SDK ya procesó el hash ──────────────────────
          // Si la detección por URL ya nos dice que es recovery, redirigir directo
          if (isEarlyRecovery) {
            // Esperar brevemente para que el SDK establezca la sesión desde el hash
            await new Promise((r) => setTimeout(r, 300));
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              console.log('RECOVERY DETECTED - redirecting to /auth/reset (implicit)');
              sessionStorage.setItem('passwordRecoveryInProgress', 'true');
              setRedirectPath('/auth/reset');
            } else {
              // Session not yet ready — still redirect to /auth/reset, it will show error
              console.log('RECOVERY DETECTED but no session - /auth/reset will show expired error');
              sessionStorage.setItem('passwordRecoveryInProgress', 'true');
              setRedirectPath('/auth/reset');
            }
            return;
          }

          // Sin señal de recovery — comprobar sesión e intentar AMR
          await new Promise((r) => setTimeout(r, 400));
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            const amrMethods = session.user?.amr?.map?.((a) => a.method) ?? [];
            const recoveryFromAmr =
              amrMethods.includes('otp') || amrMethods.includes('recovery');

            if (recoveryFromAmr) {
              console.log('RECOVERY DETECTED - redirecting to /auth/reset (AMR, no code)');
              sessionStorage.setItem('passwordRecoveryInProgress', 'true');
              setRedirectPath('/auth/reset');
            } else {
              console.log(`CALLBACK: normal implicit session. → ${next}`);
              setRedirectPath(next);
            }
          } else {
            console.warn('CALLBACK: no session found. → /login');
            setRedirectPath('/login');
          }
        }
      } catch (err) {
        console.error('CALLBACK error:', err);
        setRedirectPath('/login');
      }
    };

    handleCallback();
  }, []);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-sm font-medium text-slate-500">Verificando enlace de acceso...</p>
    </div>
  );
};

export default CallbackPage;
