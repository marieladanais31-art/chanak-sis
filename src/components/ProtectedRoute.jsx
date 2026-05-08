import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ALL_VALID_ROLES, getDashboardPath } from '@/lib/roleUtils';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * ProtectedRoute
 * Guard de autenticación y rol para rutas protegidas.
 *
 * Props:
 *   children      — componente a renderizar si el acceso es válido
 *   requiredRole  — string o string[] con los roles permitidos.
 *                   Si se omite, cualquier rol válido puede acceder.
 *                   SIEMPRE especificar en rutas de dashboard.
 */
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, profile, isInitialized, loading, isPasswordRecovery } = useAuth();
  const location = useLocation();

  // ── Cargando ──────────────────────────────────────────────────────────────
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm font-medium animate-pulse">Cargando…</p>
        </div>
      </div>
    );
  }

  // ── Sesión de recuperación de contraseña ──────────────────────────────────
  const storedRecovery = sessionStorage.getItem('passwordRecoveryInProgress') === 'true';
  if (isPasswordRecovery || storedRecovery) {
    console.log('SKIPPING ROLE REDIRECT - password recovery in progress (ProtectedRoute)');
    return <Navigate to="/reset-password" replace />;
  }

  // ── Sin sesión ────────────────────────────────────────────────────────────
  if (!user || !profile) {
    console.log('🔒 ProtectedRoute: sin sesión → /login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Rol completamente desconocido ─────────────────────────────────────────
  if (!ALL_VALID_ROLES.includes(profile.role)) {
    console.warn(`⚠️ ProtectedRoute: rol no reconocido "${profile.role}"`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Rol no configurado</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Tu cuenta no tiene un rol de acceso válido.
            Contacta con administración de Chanak Academy.
          </p>
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 font-mono">
            {profile.email}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors text-sm"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  // ── Verificar rol requerido para esta ruta ────────────────────────────────
  if (requiredRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(profile.role)) {
      // Redirigir al dashboard correcto del usuario, no a /login
      const dest = getDashboardPath(profile.role);
      console.log(
        `🔒 ProtectedRoute: acceso denegado. ` +
        `Ruta requiere [${allowed.join(',')}], usuario tiene "${profile.role}". → ${dest}`
      );
      return <Navigate to={dest} replace />;
    }
  }

  // ── Acceso concedido ──────────────────────────────────────────────────────
  console.log(`🔓 ProtectedRoute: acceso concedido [${profile.role}] → ${location.pathname}`);
  return children;
};

export default ProtectedRoute;
