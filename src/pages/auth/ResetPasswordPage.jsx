import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verificar que llegamos aquí con una sesión de recuperación válida.
  // Supabase establece la sesión automáticamente desde el hash/code del email link.
  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      // Pequeño delay para que Supabase procese el token de la URL si viene del hash
      await new Promise((r) => setTimeout(r, 400));

      const { data: { session } } = await supabase.auth.getSession();

      if (cancelled) return;

      if (session?.user) {
        setSessionReady(true);
      } else {
        setSessionError(true);
      }
    };

    checkSession();
    return () => { cancelled = true; };
  }, []);

  const validatePassword = () => {
    if (password.length < 8) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 8 caracteres.', variant: 'destructive' });
      return false;
    }
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setLoading(true);
    try {
      // updateUser funciona porque tenemos una sesión de recuperación activa
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast({ title: 'Contraseña actualizada', description: 'Tu contraseña fue cambiada correctamente.' });

      // Cerrar sesión de recuperación y redirigir al login
      await supabase.auth.signOut();
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      console.error('[ResetPasswordPage] Error:', err);
      toast({
        title: 'Error al actualizar',
        description: err.message || 'No se pudo actualizar la contraseña. Solicita un nuevo enlace.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Estado: sesión no disponible (token expirado o acceso directo sin link) ──
  if (sessionError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">Enlace inválido o expirado</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            El enlace de recuperación ya expiró o no es válido. Los enlaces tienen una duración limitada por seguridad.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
          >
            Solicitar nuevo enlace
          </Link>
          <div className="mt-4">
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
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">¡Contraseña actualizada!</h2>
          <p className="text-slate-500 text-sm mb-2">
            Tu contraseña fue cambiada correctamente. Serás redirigido al inicio de sesión en unos segundos.
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // ─── Estado: verificando sesión ───────────────────────────────────────────
  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Verificando enlace de recuperación...</p>
      </div>
    );
  }

  // ─── Formulario principal ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <KeyRound className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-center text-slate-800 mb-2">Nueva contraseña</h2>
        <p className="text-center text-slate-500 mb-8 text-sm leading-relaxed">
          Elige una contraseña segura de al menos 8 caracteres.
        </p>

        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="w-full p-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Confirmar contraseña</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                className="w-full p-3 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                placeholder="Repite la contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1 font-medium">Las contraseñas no coinciden.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
