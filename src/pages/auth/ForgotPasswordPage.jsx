import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';

const COOLDOWN_MS = 60000;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);

  // Restaurar cooldown si el usuario recarga la página
  useEffect(() => {
    const last = localStorage.getItem('chanak_pwd_reset_ts');
    if (last) {
      const diff = Date.now() - parseInt(last, 10);
      if (diff < COOLDOWN_MS) setCooldown(Math.ceil((COOLDOWN_MS - diff) / 1000));
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setSent(false);

    // La URL de callback apunta a /auth/callback para que CallbackPage procese el token
    const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
    console.log('FORGOT redirectTo:', redirectTo);

    // Marcar recovery en curso ANTES de enviar el email.
    // Esto garantiza que si el usuario hace clic en el enlace en la misma sesión del navegador,
    // el flag ya está presente cuando AuthContext o CallbackPage ejecutan su lógica.
    sessionStorage.setItem('passwordRecoveryInProgress', 'true');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

      if (error) {
        if (error.status === 429) throw new Error('Demasiados intentos. Espera al menos 1 minuto.');
        throw error;
      }

      localStorage.setItem('chanak_pwd_reset_ts', Date.now().toString());
      setCooldown(60);
      setSent(true);
      setEmail('');
    } catch (err) {
      console.error('[ForgotPasswordPage]', err);
      sessionStorage.removeItem('passwordRecoveryInProgress'); // limpiamos si falla
      toast({
        title: 'No se pudo enviar el enlace',
        description: err.message || 'Intenta nuevamente en unos minutos.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        <div className="flex justify-center mb-6">
          <img
            src="https://horizons-cdn.hostinger.com/fecf9528-708e-4a5b-9228-805062d89fe9/d9778ccb909ddc8597ac3c64740796e6.png"
            alt="Chanak Academy"
            className="h-16 w-auto object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        <h2 className="text-2xl font-black text-center text-slate-800 mb-1">Recuperar contraseña</h2>
        <p className="text-center text-slate-500 text-sm mb-8 leading-relaxed">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {sent ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Revisa tu correo</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Si el correo está registrado, recibirás un enlace de recuperación en los próximos minutos.
              Revisa también tu carpeta de spam.
            </p>
            <button
              onClick={() => setSent(false)}
              disabled={cooldown > 0}
              className="w-full py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors text-sm"
            >
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Enviar de nuevo'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@chanakacademy.org"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
              ) : cooldown > 0 ? (
                `Reenviar en ${cooldown}s`
              ) : (
                <><Mail className="w-5 h-5" /> Enviar enlace de recuperación</>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
