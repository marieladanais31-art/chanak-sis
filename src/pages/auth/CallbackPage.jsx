
import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

/**
 * CallbackPage — procesa el token de Supabase que llega por email.
 *
 * Soporta dos flujos:
 *  A. PKCE  : URL contiene ?code=...  → llama exchangeCodeForSession
 *  B. Implicit: URL contiene hash #access_token=... → Supabase SDK auto-procesa
 *
 * Para detectar si el callback es de recuperación de contraseña:
 *  1. ?type=recovery en query params (añadido por ForgotPasswordPage)
 *  2. #type=recovery en el hash original (flujo implícito)
 *  3. AMR claim 'otp' en la sesión (PKCE recovery)
 *
 * IMPORTANTE: capturamos search y hash en refs síncronos ANTES de que el SDK
 * pueda limpiar el hash con detectSessionInUrl=true.
 */
const CallbackPage = () => {
  const hasProcessed = useRef(false);

  // Capturar search y hash de forma síncrona durante el primer render,
  // antes de que el SDK los limpie al procesar la sesión.
  const originalSearch = useRef(window.location.search);
  const originalHash   = useRef(window.location.hash);

  const [redirectPath, setRedirectPath] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      console.log('🔐 [AuthCallback] Init', window.location.href);
      console.log('🔐 [AuthCallback] Original search:', originalSearch.current);
      console.log('🔐 [AuthCallback] Original hash:', originalHash.current ? '(present, length=' + originalHash.current.length + ')' : '(empty)');

      try {
        const urlParams = new URLSearchParams(originalSearch.current);
        const code = urlParams.get('code');
        const next = urlParams.get('next') || '/';
        const type = urlParams.get('type');

        // Detectar recovery desde el hash original (antes de que SDK lo limpie)
        const hashHasRecovery =
          originalHash.current.includes('type=recovery') ||
          originalHash.current.includes('type%3Drecovery');

        console.log(`➡️ [AuthCallback] code=${!!code} type=${type} next=${next} hashRecovery=${hashHasRecovery}`);

        if (code) {
          // ── Flujo PKCE: intercambiar código por sesión ───────────────────
          console.log('🔐 [AuthCallback] PKCE: exchanging code for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('❌ [AuthCallback] exchangeCodeForSession failed:', error);
            throw error;
          }

          console.log('✅ [AuthCallback] Session exchanged. User:', data.session?.user?.id);

          // Limpiar URL
          window.history.replaceState({}, document.title, window.location.pathname);

          // Detectar recovery por: type param, AMR claim, o flag previo
          const amrMethods = data.session?.user?.amr?.map?.((a) => a.method) ?? [];
          const isRecovery =
            type === 'recovery' ||
            hashHasRecovery ||
            amrMethods.includes('otp') ||
            amrMethods.includes('recovery');

          console.log(`➡️ [AuthCallback] isRecovery=${isRecovery} amr=${JSON.stringify(amrMethods)}`);
          setRedirectPath(isRecovery ? '/auth/reset' : next);

        } else {
          // ── Flujo implícito: SDK ya procesó el hash, obtener sesión ─────
          console.log('➡️ [AuthCallback] No PKCE code. Checking existing session...');

          // Pequeño delay para que el SDK complete el procesamiento del hash
          await new Promise((r) => setTimeout(r, 300));
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            console.log('✅ [AuthCallback] Session found (implicit flow). User:', session.user?.id);

            const amrMethods = session.user?.amr?.map?.((a) => a.method) ?? [];
            const isRecovery =
              type === 'recovery' ||
              hashHasRecovery ||
              amrMethods.includes('otp') ||
              amrMethods.includes('recovery');

            console.log(`➡️ [AuthCallback] isRecovery=${isRecovery} amr=${JSON.stringify(amrMethods)}`);
            setRedirectPath(isRecovery ? '/auth/reset' : next);
          } else {
            console.warn('⚠️ [AuthCallback] No session found. Redirecting to login.');
            setRedirectPath('/login');
          }
        }
      } catch (error) {
        console.error('❌ [AuthCallback] Error:', error);
        setRedirectPath('/login');
      }
    };

    handleCallback();
  }, []);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
      <p className="text-sm font-medium text-slate-500">Verificando enlace de acceso...</p>
    </div>
  );
};

export default CallbackPage;
