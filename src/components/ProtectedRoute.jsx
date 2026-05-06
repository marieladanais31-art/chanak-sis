
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

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
    default:           return '/login';
  }
};

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, profile, isInitialized, loading } = useAuth();
  const location = useLocation();

  if (!isInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-indigo-600 text-sm font-medium animate-pulse">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    console.log("🔒 ProtectedRoute: No user or profile, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(profile.role)) {
      const dest = getRoleDashboard(profile.role);
      console.log(`🔒 ProtectedRoute: Access denied. Required: ${roles.join(',')}, Actual: ${profile.role}. Redirecting to ${dest}`);
      return <Navigate to={dest} replace />;
    }
  }

  console.log(`🔓 ProtectedRoute: Access granted for ${profile.role}`);
  return children;
};

export default ProtectedRoute;
