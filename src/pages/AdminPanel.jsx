
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminSidebar from '@/components/AdminSidebar';
import AdminUserManagement from '@/pages/AdminUserManagement';
import AdminEstudiantes from '@/pages/AdminEstudiantes';
import AdminHubs from '@/pages/AdminHubs';
import AdminPagos from '@/pages/AdminPagos';
import AdminAcademico from '@/pages/AdminAcademico';
import AdminPEI from '@/pages/AdminPEI';
import AdminContratos from '@/pages/AdminContratos';
import AdminSeguridad from '@/pages/AdminSeguridad';
import AdminConfiguracion from '@/pages/AdminConfiguracion';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Users, Building2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminPanel() {
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState('dashboard');
  
  const [hubs, setHubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (currentSection === 'dashboard') {
      loadDashboardData();
    }
  }, [currentSection]);

  const loadDashboardData = async () => {
    setDataLoading(true);
    try {
      const { data: hubsData, error: hubsError } = await supabase.from('organizations').select('id, name, location');
      if (hubsError) throw hubsError;
      
      const { data: studentsData, error: studentsError } = await supabase.from('students').select('id, first_name, last_name, grade_level, hub_id').order('created_at', { ascending: false });
      if (studentsError) throw studentsError;

      setHubs(hubsData || []);
      setStudents(studentsData || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      toast({ title: 'Error', description: 'No se pudieron cargar los datos del dashboard.', variant: 'destructive' });
    } finally {
      setDataLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const getPageTitle = (section) => {
    switch(section) {
      case 'dashboard': return 'Dashboard General';
      case 'users': return 'Gestión de Usuarios';
      case 'estudiantes': return 'Directorio Estudiantil';
      case 'hubs': return 'Administración de Hubs';
      case 'academico': return 'Módulo Académico';
      case 'pei': return 'Gestión de PEI';
      case 'pagos': return 'Gestión de Pagos';
      case 'contratos': return 'Contratos';
      case 'seguridad': return 'Seguridad y Accesos';
      case 'settings': return 'Configuración';
      default: return 'Panel de Administración';
    }
  };

  const renderDashboard = () => {
    if (dataLoading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Total Estudiantes</p>
              <h3 className="text-3xl font-black text-slate-800">{students.length}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Hubs Activos</p>
              <h3 className="text-3xl font-black text-slate-800">{hubs.length}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Sistema</p>
              <h3 className="text-3xl font-black text-slate-800">Online</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" /> Resumen de Hubs
              </h3>
            </div>
            <div className="p-0 overflow-auto max-h-96">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-4">Nombre</th>
                    <th className="p-4 text-right">Estudiantes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hubs.map(hub => {
                    const studentCount = students.filter(s => s.hub_id === hub.id).length;
                    return (
                      <tr key={hub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{hub.name}</td>
                        <td className="p-4 text-right">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-bold">{studentCount}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" /> Estudiantes Recientes
              </h3>
            </div>
            <div className="p-0 overflow-auto max-h-96">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Hub</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.slice(0, 10).map(student => {
                    const hub = hubs.find(h => h.id === student.hub_id);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                        <td className="p-4 text-xs font-medium text-slate-500">{hub ? hub.name : 'Sin asignar'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch(currentSection) {
      case 'dashboard': return renderDashboard();
      case 'estudiantes': return <AdminEstudiantes />;
      case 'hubs': return <AdminHubs />;
      case 'pagos': return <AdminPagos />;
      case 'academico': return <AdminAcademico />;
      case 'pei': return <AdminPEI />;
      case 'contratos': return <AdminContratos />;
      case 'users': return <AdminUserManagement />;
      case 'seguridad': return <AdminSeguridad />;
      case 'settings': return <AdminConfiguracion />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans">
      <AdminSidebar currentSection={currentSection} onNavigate={setCurrentSection} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm shrink-0 z-10 relative">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{getPageTitle(currentSection)}</h1>
            <p className="text-sm text-slate-500 mt-0.5 font-medium">Sistema de Gestión Institucional</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{profile?.first_name || 'Admin'} {profile?.last_name || 'Chanak'}</p>
              <p className="text-xs text-blue-600 font-black tracking-wider uppercase mt-0.5">
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center border border-blue-200 shadow-sm">
              {(profile?.first_name || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-8 relative">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
