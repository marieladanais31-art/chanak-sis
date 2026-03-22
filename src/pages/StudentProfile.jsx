import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, ArrowLeft, User, GraduationCap, Calendar, AlertCircle } from 'lucide-react';
import { getGradeLabel } from '@/constants/gradelevels';
import UrbinaPDF from '@/components/UrbinaPDF';

export default function StudentProfile() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (!studentId) return;
      setLoading(true);
      setError(null);
      console.log(`👤 [StudentProfile] Loading directly from DB for ID: ${studentId}`);
      
      try {
        const { data, error: dbError } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single();

        if (dbError) throw dbError;
        setStudent(data);
      } catch (err) {
        console.error("❌ [StudentProfile] Fetch error:", err);
        setError("No se pudo cargar el perfil del estudiante.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProfile();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Loader2 className="animate-spin w-10 h-10 text-indigo-600" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 gap-4">
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-8 h-8 shrink-0" />
          <p className="font-bold">{error || "Estudiante no encontrado."}</p>
        </div>
        <Link to="/family-portal" className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver al Portal
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <header className="bg-indigo-900 text-white shadow-md py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <Link to="/family-portal" className="p-2 bg-indigo-800 rounded-full hover:bg-indigo-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Perfil del Estudiante</h1>
            <p className="text-xs text-indigo-200">Vista detallada</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-8 items-start">
          <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
            <User className="w-12 h-12" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800">{student.first_name} {student.last_name}</h2>
              <p className="text-slate-500 font-medium mt-1">
                ID Oficial: {student.passport_number || 'No registrado'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><GraduationCap className="w-5 h-5"/></div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Grado</p>
                  <p className="font-semibold">{getGradeLabel(student.grade_level) || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-lg">✅</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Estado</p>
                  <p className="font-semibold">{student.status === 'Enrolled' ? 'Matriculado' : 'Pendiente'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Calendar className="w-5 h-5"/></div>
                <div>
                  <p className="text-xs font-bold text-slate-500">Nacimiento</p>
                  <p className="font-semibold">{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 px-2">Documentos Oficiales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UrbinaPDF 
              studentName={`${student.first_name} ${student.last_name}`}
              passportNumber={student.passport_number}
              gradeLevel={getGradeLabel(student.grade_level)}
            />
          </div>
        </div>

      </main>
    </div>
  );
}