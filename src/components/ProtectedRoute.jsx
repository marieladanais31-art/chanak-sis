
import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';

const KNOWN_ROLES = [
  'super_admin', 'admin',
  'coordinator',
  'tutor', 'mentor',
  'parent', 'family',
  'student',
];

const getRoleDashboard = (role) => {
  switch (role) {
    case 'super_admin':
    case 'admin':      return '/admin';
    case 'coordinator':return '/coordinator';
    case 'tutor':
    case 'mentor':     return '/tutor';
    case 'parent':
    case 'family':     return '/parent';
    case 'student':    return '/student';
    default:           return null; // rol no reconocido
  }
};

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, profile, isInitialized, loading, isPasswordRecovery } = useAuth();
  const location = useLocation();

  // ── Cargando ──────────────────────────────────────────────────────────────
  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-slate-500 text-sm font-medium animate-pulse">Cargando...</p>
        </div>
      </div>
    );
  }

  // ── Sesión de recuperación de contraseña ──────────────────────────────────
  // Doble verificación: context state + sessionStorage hard stop.
  const storedRecovery = sessionStorage.getItem('passwordRecoveryInProgress') === 'true';
  if (isPasswordRecovery || storedRecovery) {
    console.log('SKIPPING ROLE REDIRECT - password recovery in progress (ProtectedRoute)');
    return <Navigate to="/reset-password" replace />;
  }

  // ── Sin sesión ────────────────────────────────────────────────────────────
  if (!user || !profile) {
    console.log('🔒 ProtectedRoute: No user or profile, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Rol no reconocido ─────────────────────────────────────────────────────
  if (!KNOWN_ROLES.includes(profile.role)) {
    console.warn(`⚠️ ProtectedRoute: Rol no reconocido: "${profile.role}"`);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Sin rol válido asignado</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Tu cuenta no tiene un rol de acceso válido.
            Contacta con administración para que te asignen el acceso correcto.
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

  // ── Verificar rol requerido ───────────────────────────────────────────────
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(profile.role)) {
      const dest = getRoleDashboard(profile.role) || '/login';
      console.log(`🔒 ProtectedRoute: Acceso denegado. Requerido: [${roles.join(',')}], Actual: ${profile.role}. → ${dest}`);
      return <Navigate to={dest} replace />;
    }
  }

  // ── Acceso concedido ─────────────────────────────────────────────────────
  console.log(`🔓 ProtectedRoute: Acceso concedido para ${profile.role}`);
  return children;
};

export default ProtectedRoute;
