
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Users, Building2, UserPlus, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminHubAssignments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [hubs, setHubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  
  const [selectedHub, setSelectedHub] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('⏳ [AdminHubAssignments] Fetching hubs, students, and assignments...');
      
      const [hubsRes, studentsRes, assignmentsRes] = await Promise.all([
        supabase.from('hubs').select('*').order('name'),
        supabase.from('students').select('id, first_name, last_name, email').order('first_name'),
        supabase.from('student_hubs').select('*, hubs(name), students(first_name, last_name)')
      ]);

      if (hubsRes.error) throw hubsRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setHubs(hubsRes.data || []);
      setStudents(studentsRes.data || []);
      setAssignments(assignmentsRes.data || []);
      console.log('✅ [AdminHubAssignments] Data loaded.');
    } catch (err) {
      console.error('❌ [AdminHubAssignments] Error fetching data:', err);
      toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedHub || !selectedStudent) {
      toast({ title: "Validación", description: "Seleccione un Hub y un Estudiante", variant: "destructive" });
      return;
    }

    setAssigning(true);
    console.log(`⏳ [AdminHubAssignments] Assigning student ${selectedStudent} to hub ${selectedHub}...`);
    
    try {
      const { error } = await supabase
        .from('student_hubs')
        .insert({
          student_id: selectedStudent,
          hub_id: selectedHub
        });

      if (error) {
        if (error.code === '23505') {
          console.log(`✅ [AdminHubAssignments] Duplicate assignment detected (Code 23505). Handling gracefully.`);
          toast({ 
            title: "Información", 
            description: "Hub assignment already exists for this student.",
            className: "bg-blue-50 border-blue-200 text-blue-900"
          });
        } else {
          throw error;
        }
      } else {
        console.log(`✅ [AdminHubAssignments] Assignment successful.`);
        toast({ title: "Éxito", description: "Estudiante asignado al Hub correctamente." });
        setSelectedStudent('');
        fetchData();
      }
    } catch (err) {
      console.error('❌ [AdminHubAssignments] Assignment error:', err);
      toast({ title: "Error", description: "Ocurrió un error al asignar.", variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta asignación?')) return;
    
    try {
      console.log(`⏳ [AdminHubAssignments] Removing assignment ${id}...`);
      const { error } = await supabase.from('student_hubs').delete().eq('id', id);
      if (error) throw error;
      
      toast({ title: "Éxito", description: "Asignación eliminada." });
      fetchData();
    } catch (err) {
      console.error('❌ [AdminHubAssignments] Remove error:', err);
      toast({ title: "Error", description: "No se pudo eliminar la asignación.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="animate-spin w-10 h-10 text-indigo-600" />
        <p className="text-slate-500 font-medium">Cargando asignaciones...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-indigo-600" />
          Asignaciones a Hubs
        </h1>
        <p className="text-slate-500 text-sm mt-1">Gestione qué estudiantes pertenecen a cada Hub.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-indigo-500" />
          Nueva Asignación
        </h2>
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Hub Educativo</label>
              <select 
                value={selectedHub}
                onChange={(e) => setSelectedHub(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              >
                <option value="">Seleccione un Hub...</option>
                {hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Estudiante</label>
              <select 
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              >
                <option value="">Seleccione un Estudiante...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={assigning} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11">
            {assigning ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Plus className="w-5 h-5 mr-2" size={20} />
            )}
            Asignar Estudiante
          </Button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" /> Asignaciones Actuales
          </h3>
          <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
            {assignments.length} registros
          </span>
        </div>
        
        {assignments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No hay asignaciones registradas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-semibold">Estudiante</th>
                  <th className="p-4 font-semibold">Hub Educativo</th>
                  <th className="p-4 font-semibold">Fecha Asignación</th>
                  <th className="p-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-medium text-slate-800">
                      {a.students?.first_name} {a.students?.last_name}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {a.hubs?.name || 'Desconocido'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(a.assigned_at || a.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemove(a.id)} 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
