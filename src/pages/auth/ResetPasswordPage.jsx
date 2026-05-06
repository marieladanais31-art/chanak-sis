import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

const LOGO_URL =
  'https://horizons-cdn.hostinger.com/fecf9528-708e-4a5b-9228-805062d89fe9/d9778ccb909ddc8597ac3c64740796e6.png';

/**
 * ResetPasswordPage — permite al usuario establecer una nueva contraseña.
 *
 * Soporta dos flujos de llegada:
 *  A. Vía /auth/callback (PKCE o implícito): sesión ya activa al montar.
 *  B. Directo con hash (implícito): Supabase SDK dispara PASSWORD_RECOVERY.
 *
 * Validaciones:
 *  - Mínimo 8 caracteres
 *  - Las dos contraseñas deben coincidir
 *  - Mensajes en español
 */
export default function ResetPasswordPage() {
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [sessionReady,    setSessionReady]    = useState(false);
  const [sessionError,    setSessionError]    = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [logoError,       setLogoError]       = useState(false);
  const [formError,       setFormError]       = useState('');

  const navigate = useNavigate();
  const { toast } = useToast();
  const sessionCheckDone = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // 1. Suscribirse a onAuthStateChange para capturar PASSWORD_RECOVERY
    //    (flujo implícito: hash con type=recovery procesado por el SDK).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      console.log(`🔑 [ResetPasswordPage] Auth event: ${event}`);
      if (
        (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') &&
        session?.user
      ) {
        setSessionReady(true);
        setSessionError(false);
      }
    });

    // 2. Verificar si la sesión ya está activa (flujo PKCE vía /auth/callback).
    const checkSession = async () => {
      if (sessionCheckDone.current) return;
      sessionCheckDone.current = true;

      // Esperar un poco para que el SDK procese el hash si llega directo con token
      await new Promise((r) => setTimeout(r, 500));
      if (cancelled) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (session?.user) {
        console.log('✅ [ResetPasswordPage] Sesión activa encontrada. User:', session.user.id);
        setSessionReady(true);
      } else {
        // Esperar un segundo más por si el SDK necesita más tiempo
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelled) return;

        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (!cancelled) {
          if (s2?.user) {
            setSessionReady(true);
          } else {
            console.warn('⚠️ [ResetPasswordPage] Sin sesión válida. Enlace expirado o inválido.');
            setSessionError(true);
          }
        }
      }
    };

    checkSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // ─── Validación ────────────────────────────────────────────────────────────
  const validate = () => {
    if (password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres.');
      return false;
    }
    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return false;
    }
    setFormError('');
    return true;
  };

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setFormError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast({ title: 'Contraseña actualizada', description: 'Tu contraseña fue cambiada correctamente.' });

      // Cerrar sesión de recuperación para forzar login limpio
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      console.error('[ResetPasswordPage] Error al actualizar:', err);
      setFormError(
        err.message === 'New password should be different from the old password.'
          ? 'La nueva contraseña debe ser diferente a la anterior.'
          : err.message || 'No se pudo actualizar la contraseña. Solicita un nuevo enlace.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Logo helper ──────────────────────────────────────────────────────────
  const Logo = () =>
    !logoError ? (
      <img
        src={LOGO_URL}
        alt="Chanak Academy"
        onError={() => setLogoError(true)}
        className="h-16 w-auto object-contain mx-auto"
      />
    ) : (
      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
        <span className="text-2xl font-black text-white tracking-tighter">CA</span>
      </div>
    );

  // ─── Estado: enlace inválido o expirado ───────────────────────────────────
  if (sessionError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center space-y-4">
          <Logo />
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Enlace inválido o expirado</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            El enlace de recuperación ya expiró o no es válido. Los enlaces tienen una duración limitada por seguridad.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
          >
            Solicitar nuevo enlace
          </Link>
          <div>
            <Link to="/login" className="text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Estado: contraseña actualizada con éxito ─────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center space-y-4">
          <Logo />
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800">¡Contraseña actualizada!</h2>
          <p className="text-slate-500 text-sm">
            Tu contraseña fue cambiada correctamente. Serás redirigido al inicio de sesión en unos segundos.
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
        </div>
      </div>
    );
  }

  // ─── Estado: verificando sesión ───────────────────────────────────────────
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 gap-4">
        <Logo />
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-slate-500 font-medium text-sm">Verificando enlace de recuperación...</p>
      </div>
    );
  }

  // ─── Formulario principal ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 space-y-6">

        {/* Logo + header */}
        <div className="text-center space-y-3">
          <Logo />
          <div>
            <h1 className="text-xl font-black text-slate-800">Chanak International Academy</h1>
            <h2 className="text-lg font-bold text-slate-600 mt-1">Restablecer contraseña</h2>
            <p className="text-slate-500 text-sm mt-1">
              Elige una contraseña segura de al menos 8 caracteres.
            </p>
          </div>
        </div>

        {/* Alerta de error */}
        {formError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
          {/* Nueva contraseña */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFormError(''); }}
                minLength={8}
                className="w-full p-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 bg-slate-50"
                placeholder="Mínimo 8 caracteres"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFormError(''); }}
                minLength={8}
                className="w-full p-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 bg-slate-50"
                placeholder="Repite la contraseña"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1 font-medium">Las contraseñas no coinciden.</p>
            )}
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading || (confirmPassword.length > 0 && password !== confirmPassword)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Actualizando...</>
            ) : (
              <><KeyRound className="w-5 h-5" /> Actualizar contraseña</>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link to="/login" className="text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
