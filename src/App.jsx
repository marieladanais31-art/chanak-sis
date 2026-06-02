
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
import HelpPage from '@/pages/HelpPage';
import EnrollmentForm from '@/pages/EnrollmentForm';

const AppContent = () => {
  return (
    <Routes>
      {/* ── Rutas completamente públicas — NUNCA requieren sesión ── */}
      <Route path="/matricula"  element={<EnrollmentForm />} />
      <Route path="/enrollment" element={<EnrollmentForm />} />

      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      {/* /auth/callback: procesa el token del email y redirige según tipo */}
      <Route path="/auth/callback" element={<CallbackPage />} />
      {/* /auth/reset: página de nueva contraseña tras recuperación */}
      <Route path="/auth/reset" element={<ResetPasswordPage />} />
      {/* Alias legacy por compatibilidad con emails ya enviados */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Root portal: redirige al dashboard según rol */}
      <Route path="/portal/*" element={<ProtectedRoute><RoleBasedRouter /></ProtectedRoute>} />

      {/* ── Rutas de dashboard con requiredRole obligatorio ────────────────────
          REGLA: cada ruta solo es accesible para su(s) rol(es) válido(s).
          Aliases legacy (family, mentor, super_admin) incluidos explícitamente.
          Sin requiredRole → cualquier usuario autenticado podría entrar. ── */}
      <Route path="/admin/*"
        element={<ProtectedRoute requiredRole={['super_admin', 'admin']}><AdminPanel /></ProtectedRoute>} />
      <Route path="/admin/pei-management"
        element={<ProtectedRoute requiredRole={['super_admin', 'admin']}><PeiManagement /></ProtectedRoute>} />

      <Route path="/coordinator/*"
        element={<ProtectedRoute requiredRole={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />
      <Route path="/coordinator/pei-management"
        element={<ProtectedRoute requiredRole={['coordinator']}><PeiManagement /></ProtectedRoute>} />

      {/* parent y family son el mismo dashboard */}
      <Route path="/parent/*"
        element={<ProtectedRoute requiredRole={['parent', 'family']}><ParentDashboard /></ProtectedRoute>} />

      {/* tutor y mentor son el mismo dashboard */}
      <Route path="/tutor/*"
        element={<ProtectedRoute requiredRole={['tutor', 'mentor']}><TutorDashboard /></ProtectedRoute>} />

      <Route path="/student/*"
        element={<ProtectedRoute requiredRole={['student']}><StudentDashboard /></ProtectedRoute>} />
      
      {/* Centro de Ayuda — accesible para cualquier usuario autenticado */}
      <Route path="/ayuda" element={<ProtectedRoute><HelpPage /></ProtectedRoute>} />

      {/* Catch-all: cualquier ruta desconocida va directo al login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
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
