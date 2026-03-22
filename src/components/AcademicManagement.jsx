
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Search, AlertCircle, CheckCircle, RefreshCw, Filter, Loader2 } from 'lucide-react';

export default function AcademicManagement() {
  const [studentsData, setStudentsData] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHub, setSelectedHub] = useState('all');

  const loadData = async () => {
    console.log('🔄 [AcademicManagement] Starting data fetch...');
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Hubs
      const { data: hubsData, error: hubsError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('type', 'hub');

      if (hubsError) throw hubsError;
      setHubs(hubsData || []);

      // 2. Fetch Students
      const { data: stdData, error: stdError } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level, hub_id, status, program_type');

      if (stdError) throw stdError;

      // 3. Efficiently fetch recent grades (last 21 days)
      const twentyOneDaysAgo = new Date();
      twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);
      
      const { data: recentGrades, error: gradesError } = await supabase
        .from('student_grades')
        .select('student_id, completed_at')
        .gte('completed_at', twentyOneDaysAgo.toISOString());

      if (gradesError) throw gradesError;

      // 4. Map and enrich student data
      const enrichedStudents = (stdData || []).map(student => {
        const hubInfo = (hubsData || []).find(h => h.id === student.hub_id);
        const hasRecentGrades = (recentGrades || []).some(g => g.student_id === student.id);
        
        return {
          ...student,
          hub_name: hubInfo ? hubInfo.name : 'Sin Hub',
          hasRecentGrades,
          paces_status: hasRecentGrades ? 'al_dia' : 'alerta'
        };
      });

      console.log('✅ [AcademicManagement] Data load complete.');
      setStudentsData(enrichedStudents);
    } catch (err) {
      console.error('❌ [AcademicManagement] Error loading data:', err);
      setError('Ocurrió un error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtering
  const filteredStudents = studentsData.filter(student => {
    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesHub = selectedHub === 'all' || student.hub_id === selectedHub;
    return matchesSearch && matchesHub;
  });

  // Stats
  const totalStudents = filteredStudents.length;
  const alertCount = filteredStudents.filter(s => s.paces_status === 'alerta').length;
  const activeCount = filteredStudents.filter(s => s.paces_status === 'al_dia').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-800 rounded-xl border border-slate-700 min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mb-4" />
        <p className="text-slate-300 font-medium animate-pulse">Cargando registros académicos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-800 rounded-xl border border-red-900/50 min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-bold text-red-400 mb-2">Error de Conexión</h3>
        <p className="text-slate-300 mb-6 max-w-md">{error}</p>
        <button 
          onClick={loadData} 
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-center">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Estudiantes</p>
          <p className="text-3xl font-bold text-white">{totalStudents}</p>
        </div>
        <div className="bg-emerald-900/20 p-5 rounded-xl border border-emerald-900/50 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 text-emerald-500">
            <CheckCircle className="w-24 h-24" />
          </div>
          <p className="text-emerald-400 text-sm font-medium mb-1">Al Día (Grados Recientes)</p>
          <p className="text-3xl font-bold text-emerald-400">{activeCount}</p>
        </div>
        <div className="bg-red-900/20 p-5 rounded-xl border border-red-900/50 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 text-red-500">
            <AlertCircle className="w-24 h-24" />
          </div>
          <p className="text-red-400 text-sm font-medium mb-1">Alertas (Sin notas &gt;21d)</p>
          <p className="text-3xl font-bold text-red-400">{alertCount}</p>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-800/80">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white appearance-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="all">Todos los Hubs</option>
                {hubs.map(hub => (
                  <option key={hub.id} value={hub.id}>{hub.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={loadData} 
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg border border-slate-600 transition-colors shrink-0"
              title="Refrescar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-300 font-medium">No se encontraron estudiantes</p>
              <p className="text-slate-500 text-sm mt-1">Ajusta tus filtros de búsqueda e intenta nuevamente.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300 whitespace-nowrap">
              <thead className="bg-slate-900/60 text-slate-400 font-medium border-b border-slate-700 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Nombre del Estudiante</th>
                  <th className="px-6 py-4">Nivel / Grade</th>
                  <th className="px-6 py-4">Hub</th>
                  <th className="px-6 py-4">Programa</th>
                  <th className="px-6 py-4">Estado PACES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {student.first_name} {student.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-medium border border-slate-600">
                        {student.grade_level || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {student.hub_name}
                    </td>
                    <td className="px-6 py-4 text-slate-400 capitalize">
                      {student.program_type || 'Off Campus'}
                    </td>
                    <td className="px-6 py-4">
                      {student.paces_status === 'al_dia' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                          <span className="text-emerald-400 font-medium text-xs uppercase tracking-wide">Al Día</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>
                          <span className="text-red-400 font-medium text-xs uppercase tracking-wide">Alerta</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
