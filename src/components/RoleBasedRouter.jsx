
import React, { useEffect } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { useAuth, ROLES } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import CoordinatorDashboard from '@/pages/CoordinatorDashboard';

export default function RoleBasedRouter() {
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (profile) {
      console.log('🔐 RoleBasedRouter: Checking role for user:', profile.email, '| Role:', profile.role);
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-[rgb(25,61,109)]" />
      </div>
    );
  }

  if (!profile) {
    console.log('❌ RoleBasedRouter: No profile loaded. Redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  // Coordinator Redirect Logic
  if (profile.role === 'coordinator' || profile.role === ROLES.COORDINATOR) {
    console.log(`🎓 Coordinator detected: ${profile.email}`);
    console.log(`🔄 Redirecting to /coordinator panel...`);
    
    // Check if we are already on a coordinator route
    if (window.location.pathname.startsWith('/coordinator')) {
      return (
        <Routes>
          <Route path="/*" element={<CoordinatorDashboard />} />
        </Routes>
      );
    }
    
    return <Navigate to="/coordinator" replace />;
  }

  switch (profile.role) {
    case ROLES.SUPER_ADMIN:
    case 'admin':
      return <Navigate to="/admin" replace />;
    case ROLES.TUTOR:
      return <Navigate to="/tutor" replace />;
    case ROLES.STUDENT:
      return <Navigate to="/student" replace />;
    case ROLES.PARENT:
      return <Navigate to="/parent" replace />;
    default:
      console.log('❌ RoleBasedRouter: No valid route mapped for role. Redirecting to /login');
      return <Navigate to="/login" replace />;
  }
}
