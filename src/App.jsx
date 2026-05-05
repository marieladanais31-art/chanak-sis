
import React from 'react';
import { Route, Routes, BrowserRouter as Router, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/ProtectedRoute';
import RoleBasedRouter from '@/components/RoleBasedRouter';

import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import CallbackPage from '@/pages/auth/CallbackPage';

import AdminPanel from '@/pages/AdminPanel';
import ParentDashboard from '@/pages/ParentDashboard';
import CoordinatorDashboard from '@/pages/CoordinatorDashboard';
import TutorDashboard from '@/pages/TutorDashboard';
import StudentDashboard from '@/pages/StudentDashboard';
import PeiManagement from '@/pages/PeiManagement';

const AppContent = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      {/* /auth/callback: procesa el token del email y redirige según tipo */}
      <Route path="/auth/callback" element={<CallbackPage />} />
      {/* /auth/reset: página de nueva contraseña tras recuperación */}
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      {/* Alias legacy por compatibilidad con emails ya enviados */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Root portal redirects based on role */}
      <Route path="/portal/*" element={<ProtectedRoute><RoleBasedRouter /></ProtectedRoute>} />

      {/* Role-specific routes */}
      <Route path="/admin/*" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
      <Route path="/admin/pei-management" element={<ProtectedRoute requiredRole={['super_admin', 'admin']}><PeiManagement /></ProtectedRoute>} />
      
      <Route path="/coordinator/*" element={<ProtectedRoute><CoordinatorDashboard /></ProtectedRoute>} />
      <Route path="/coordinator/pei-management" element={<ProtectedRoute requiredRole={['coordinator']}><PeiManagement /></ProtectedRoute>} />
      
      <Route path="/parent/*" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
      <Route path="/tutor/*" element={<ProtectedRoute><TutorDashboard /></ProtectedRoute>} />
      <Route path="/student/*" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
        <Toaster />
      </Router>
    </AuthProvider>
  );
}
