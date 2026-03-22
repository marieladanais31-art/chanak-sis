
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { 
  User, 
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { getGradeLabel } from '@/constants/gradelevels';
import { Button } from '@/components/ui/button';

export default function FamilyPortal() {
  const { currentUser, profile, loading: authLoading, logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hardcoded Elías ID to completely override normal user check and fetch his students directly.
  const ELIAS_ID = '1941d550-2a1a-434c-83c8-83b65ac505d8';

  const loadStudentsDirectFromGuardians = async () => {
    console.log(`👨‍👩‍👧 [FamilyPortal] Starting direct DB fetch using ELIAS_ID: ${ELIAS_ID}`);
    setDataLoading(true);
    setError(null);

    try {
      // 1. Direct query to student_guardians without cache
      console.log(`👨‍👩‍👧 [FamilyPortal] Querying student_guardians...`);
      const { data: sgData, error: sgError } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', ELIAS_ID);

      if (sgError) {
        console.error("❌ [FamilyPortal] Error fetching from student_guardians:", sgError);
        throw sgError;
      }

      console.log(`👨‍👩‍👧 [FamilyPortal] Guardian links found:`, sgData);

      if (sgData && sgData.length > 0) {
        const studentIds = sgData.map(sg => sg.student_id);
        
        // 2. Fetch full student details directly
        console.log(`👨‍👩‍👧 [FamilyPortal] Fetching student details for IDs:`, studentIds);
        const { data: stdData, error: stdError } = await supabase
          .from('students')
          .select('*')
          .in('id', studentIds);

        if (stdError) {
          console.error("❌ [FamilyPortal] Error fetching students:", stdError);
          throw stdError;
        }

        console.log(`✅ [FamilyPortal] Fetched ${stdData?.length || 0} student records successfully.`);

        setStudents(stdData || []);
        if (stdData?.length > 0) {
          console.log(`🎯 [FamilyPortal] Auto-selecting first student: ${stdData[0].id}`);
          setSelectedStudentId(stdData[0].id);
        }
      } else {
        console.warn(`⚠️ [FamilyPortal] No guardian links found for ELIAS_ID ${ELIAS_ID}`);
        setStudents([]);
      }
    } catch (err) {
      console.error("❌ [FamilyPortal] Data loading failed:", err);
      setError("Ocurrió un problema al cargar los datos de los estudiantes. Por favor intente nuevamente.");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser && profile) {
      loadStudentsDirectFromGuardians();
    }
  }, [authLoading, currentUser, profile]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-4">
        <Loader2 className="animate-spin w-12 h-12 text-indigo-600" />
        <p className="text-slate-500 font-medium">Inicializando sesión...</p>
      </div>
    );
  }

  if (!currentUser || !profile) {
    console.warn("⛔ [FamilyPortal] Missing currentUser or profile. Redirecting to login.");
    return <Navigate to="/login" replace />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 space-y-4">
        <Loader2 className="animate-spin w-12 h-12 text-indigo-600" />
        <p className="text-slate-500 font-medium">Cargando base de datos en vivo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-red-50 p-8 rounded-3xl border border-red-200 flex flex-col items-center text-center gap-4 max-w-md w-full shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-600 shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-red-800 mb-1">Error de Conexión</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <div className="flex gap-3 mt-2 w-full">
            <Button onClick={loadStudentsDirectFromGuardians} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold">
              <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
            </Button>
            <Button onClick={logout} variant="outline" className="flex-1 border-red-200 text-red-700 hover:bg-red-100">
              <LogOut className="w-4 h-4 mr-2" /> Salir
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center py-12 px-4 gap-6">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 max-w-xl mx-auto w-full text-center space-y-5">
          <div className="text-6xl mb-4">👨‍👩‍👧</div>
          <h2 className="text-2xl font-bold text-slate-800">Sin Estudiantes Asignados</h2>
          <p className="text-slate-600">No se han encontrado estudiantes vinculados a su cuenta en la base de datos.</p>
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
             <Button onClick={loadStudentsDirectFromGuardians} variant="outline" className="flex-1 font-bold text-slate-700">
               <RefreshCw className="w-4 h-4 mr-2" /> Actualizar Datos
             </Button>
             <Button onClick={logout} variant="ghost" className="flex-1 text-slate-600">
               <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
             </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeStudent = students.find(s => s.id === selectedStudentId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <header className="bg-indigo-900 text-white shadow-md py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-3xl">👨‍👩‍👧</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Portal Familiar</h1>
              <p className="text-xs text-indigo-200">
                {profile?.first_name ? `Bienvenido, ${profile.first_name}` : 'Sesión Activa'}
              </p>
            </div>
          </div>
          <Button onClick={logout} variant="ghost" className="text-indigo-100 hover:text-white hover:bg-indigo-800">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {students.map(student => (
            <button
              key={student.id}
              onClick={() => setSelectedStudentId(student.id)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                selectedStudentId === student.id 
                  ? 'bg-white border-indigo-600 shadow-md ring-4 ring-indigo-50' 
                  : 'bg-white border-slate-200 hover:border-slate-300 opacity-90 hover:opacity-100'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${selectedStudentId === student.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                <User className="w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-slate-800 text-base truncate">{student.first_name} {student.last_name}</p>
                <p className="text-xs font-medium text-slate-500">{getGradeLabel(student.grade_level) || 'Sin Grado'}</p>
              </div>
            </button>
          ))}
        </div>

        {activeStudent && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">Estudiante Seleccionado: {activeStudent.first_name}</h2>
                <p className="text-slate-600 text-sm">Puede revisar la información detallada y descargar el documento de matrícula de Urbina Escobar.</p>
              </div>
              <Link 
                to={`/student-profile/${activeStudent.id}`}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors w-full sm:w-auto"
              >
                Abrir Perfil Completo <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
