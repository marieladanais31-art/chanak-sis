/**
 * FamilyPortal — punto de entrada para usuarios con rol 'parent'.
 * Carga estudiantes via family_students.family_id = auth.uid().
 * Redirige a /parent (ParentDashboard) que es el portal completo.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function FamilyPortal() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[rgb(25,61,109)]" />
      </div>
    );
  }

  // Redirigir al portal completo según rol
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === 'parent') return <Navigate to="/parent" replace />;
  if (profile.role === 'admin' || profile.role === 'super_admin') return <Navigate to="/admin" replace />;
  if (profile.role === 'coordinator') return <Navigate to="/coordinator" replace />;
  if (profile.role === 'tutor') return <Navigate to="/tutor" replace />;

  return <Navigate to="/login" replace />;
}
