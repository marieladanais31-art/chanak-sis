
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Search, Loader2, AlertCircle, CheckCircle, RefreshCw, Filter, Users } from 'lucide-react';

export default function AdminStudents() {
  const [studentsData, setStudentsData] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHub, setSelectedHub] = useState('all');

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: hubsData, error: hubsError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('type', 'hub');

      if (hubsError) throw hubsError;
      setHubs(hubsData || []);

      const { data: stdData, error: stdError } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level, hub_id, status, program_type');

      if (stdError) throw stdError;

      const twentyOneDaysAgo = new Date();
      twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);
      
      const { data: recentGrades, error: gradesError } = await supabase
        .from('student_grades')
        .select('student_id, completed_at')
        .gte('completed_at', twentyOneDaysAgo.toISOString());

      if (gradesError) throw gradesError;

      const enrichedStudents = (stdData || []).map(student => {
        const hubInfo = (hubsData || []).find(h => h.id === student.hub_id);
        const hasRecentGrades = (recentGrades || []).some(g => g.student_id === student.id);
        
        return {
          ...student,
          hub_name: hubInfo ? hubInfo.name : 'Chanak Florida',
          hasRecentGrades,
          paces_status: hasRecentGrades ? 'active' : 'alert'
        };
      });

      setStudentsData(enrichedStudents);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Ocurrió un error al cargar los estudiantes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredStudents = studentsData.filter(student => {
    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesHub = selectedHub === 'all' || student.hub_id === selectedHub;
    return matchesSearch && matchesHub;
  });

  const totalStudents = filteredStudents.length;
  const alertCount = filteredStudents.filter(s => s.paces_status === 'alert').length;
  const activeCount = filteredStudents.filter(s => s.paces_status === 'active').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 h-full min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Cargando directorio de estudiantes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-red-200 min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-red-700 mb-2">Error de Conexión</h3>
        <p className="text-slate-600 mb-6 max-w-md">{error}</p>
        <button 
          onClick={loadData} 
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors border border-slate-300 font-medium"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm cursor-pointer"
              >
                <option value="all">Todos los Hubs</option>
                <option value="null">Chanak Florida (Sin Hub)</option>
                {hubs.map(hub => (
                  <option key={hub.id} value={hub.id}>{hub.name}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={loadData} 
              className="p-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 transition-colors shrink-0 shadow-sm"
              title="Actualizar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {filteredStudents.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-600 font-semibold">No se encontraron estudiantes</p>
              <p className="text-slate-400 text-sm mt-1">Ajusta tus filtros de búsqueda e intenta nuevamente.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Nombre del Estudiante</th>
                  <th className="px-6 py-4">Nivel / Grade</th>
                  <th className="px-6 py-4">Hub</th>
                  <th className="px-6 py-4">Estado PACES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                        {student.first_name} {student.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200">
                        {student.grade_level || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-600 font-medium">{student.hub_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      {student.paces_status === 'active' ? (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                          <span className="text-emerald-700 font-bold text-xs uppercase tracking-wide">Al Día</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div>
                          <span className="text-red-600 font-bold text-xs uppercase tracking-wide">Alerta</span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Estudiantes</p>
            <p className="text-2xl font-bold text-slate-800">{totalStudents}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-emerald-700/80 text-xs font-bold uppercase tracking-wider mb-1">Activos (Al día)</p>
            <p className="text-2xl font-bold text-emerald-700">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-red-700/80 text-xs font-bold uppercase tracking-wider mb-1">Alertas Académicas</p>
            <p className="text-2xl font-bold text-red-700">{alertCount}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
