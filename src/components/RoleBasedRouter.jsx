import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardPath, isKnownRole } from '@/lib/roleUtils';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * RoleBasedRouter
 * Redirige al usuario al dashboard correspondiente a su rol.
 * Usado en la ruta /portal/* para el redirect post-login.
 *
 * Usa getDashboardPath() de roleUtils para centralizar la lógica:
 *   family     → /parent
 *   mentor     → /tutor
 *   super_admin → /admin
 *   unknown    → pantalla de error clara
 */
export default function RoleBasedRouter() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#193D6D]" />
          <p className="text-slate-500 text-sm font-medium animate-pulse">Cargando perfil…</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    console.log('❌ RoleBasedRouter: sin perfil — redirigiendo a /login');
    return <Navigate to="/login" replace />;
  }

  const dest = getDashboardPath(profile.role);

  if (dest === '/login') {
    // Rol desconocido: mostrar pantalla explicativa en lugar de loop /login
    console.warn(`⚠️ RoleBasedRouter: rol no reconocido "${profile.role}" para ${profile.email}`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Rol no configurado</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Tu cuenta no tiene un rol de acceso válido asignado.
            Contacta con administración para que te asignen el acceso correcto.
          </p>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 font-mono">
            {profile.email}
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors text-sm"
          >
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  console.log(`🔄 RoleBasedRouter: ${profile.email} [${profile.role}] → ${dest}`);
  return <Navigate to={dest} replace />;
}
