
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Search, Plus, Edit, Trash2, X, ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StudentFicha from '@/components/StudentFicha';

export default function AdminEstudiantes() {
  const [students, setStudents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [parentUsers, setParentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Ficha Modal
  const [fichaStudentId, setFichaStudentId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    grade_level: '',
    hub_id: '',
    family_id: '',
    program: 'Off Campus'
  });

  const { toast } = useToast();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    grade_level: '9th Grade',
    hub_id: '',
    parent_id: '',
    program: 'Off Campus'
  });

  useEffect(() => {
    loadData();
    loadParentUsers();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: orgsData, error: orgsError } = await supabase.from('organizations').select('id, name');
      if (orgsError) throw orgsError;
      setHubs(orgsData || []);

      if (orgsData?.length > 0) {
        setForm(prev => ({ ...prev, hub_id: orgsData[0].id }));
      }

      console.log("Fetching all students from public.students...");
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, full_name, grade_level, hub_id, parent_id, program')
        .order('first_name', { ascending: true });
      
      if (studentsError) throw studentsError;
      
      console.log(`Loaded ${studentsData?.length || 0} students successfully.`);
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los estudiantes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadParentUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('role', 'parent')
        .order('first_name');
        
      if (!error && data) {
        setParentUsers(data);
      }
    } catch (error) {
      console.error('Error fetching parent users:', error);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const insertData = {
        first_name: form.first_name,
        last_name: form.last_name,
        grade_level: form.grade_level,
        hub_id: form.hub_id,
        organization_id: form.hub_id,
        program: form.program
      };
      
      if (form.parent_id) insertData.parent_id = form.parent_id;

      const { data: newStudent, error } = await supabase.from('students').insert([insertData]).select().single();
      if (error) throw error;
      
      if (form.parent_id && newStudent) {
        await supabase.from('family_students').insert({ family_id: form.parent_id, student_id: newStudent.id });
      }

      toast({ title: 'Éxito', description: 'Estudiante creado correctamente.' });
      setIsModalOpen(false);
      setForm({ ...form, first_name: '', last_name: '', parent_id: '', program: 'Off Campus' });
      loadData();
    } catch (err) {
      console.error('Create student error:', err);
      toast({ title: 'Error', description: 'No se pudo crear el estudiante.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditStudent = async (student) => {
    setEditingStudent(student);
    
    const { data: familyData } = await supabase
      .from('family_students')
      .select('family_id')
      .eq('student_id', student.id)
      .single();

    setEditFormData({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      grade_level: student.grade_level || '',
      hub_id: student.hub_id || '',
      family_id: familyData?.family_id || '',
      program: student.program || 'Off Campus'
    });
    
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error: studentError } = await supabase
        .from('students')
        .update({
          first_name: editFormData.first_name,
          last_name: editFormData.last_name,
          grade_level: editFormData.grade_level,
          hub_id: editFormData.hub_id,
          program: editFormData.program
        })
        .eq('id', editingStudent.id);

      if (studentError) throw studentError;

      await supabase.from('family_students').delete().eq('student_id', editingStudent.id);
      
      if (editFormData.family_id) {
        const { error: fsError } = await supabase.from('family_students').upsert(
          { family_id: editFormData.family_id, student_id: editingStudent.id },
          { onConflict: 'family_id,student_id' }
        );
        if (fsError) console.error('Error linking family:', fsError);
      }

      toast({ title: 'Éxito', description: 'Estudiante actualizado correctamente.' });
      setShowEditModal(false);
      loadData();
    } catch (err) {
      console.error('Update student error:', err);
      toast({ title: 'Error', description: 'No se pudo actualizar el estudiante.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    toast({ title: 'En desarrollo', description: '🚧 This feature isn\'t implemented yet—but don\'t worry! You can request it in your next prompt! 🚀' });
  };

  const filteredStudents = students.filter(s => {
    const fullName = s.full_name || `${s.first_name} ${s.last_name}`;
    return fullName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de Estudiantes</h2>
        <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
          <Plus className="w-4 h-4 mr-2" /> Crear Estudiante
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              type="text" 
              placeholder="Buscar estudiante..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-300 text-slate-800 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 font-bold">
              <tr>
                <th className="p-4">Nombre Completo</th>
                <th className="p-4">Grado</th>
                <th className="p-4">Programa</th>
                <th className="p-4">Hub</th>
                <th className="p-4 text-right">Ficha / Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => {
                const hub = hubs.find(h => h.id === student.hub_id);
                const displayName = student.full_name || `${student.first_name} ${student.last_name}`;
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{displayName}</td>
                    <td className="p-4 text-slate-600">{student.grade_level || 'N/A'}</td>
                    <td className="p-4 text-slate-600">{student.program || 'Off Campus'}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold">
                        {hub?.name || 'Sin Asignar'}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button onClick={() => setFichaStudentId(student.id)} variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200" title="Ver Ficha Completa">
                        <ClipboardList className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => handleEditStudent(student)} variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button onClick={handleDelete} variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">No se encontraron estudiantes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800">Crear Nuevo Estudiante</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                  <input
                    required
                    type="text"
                    value={form.first_name}
                    onChange={e => setForm({...form, first_name: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Apellidos</label>
                  <input
                    required
                    type="text"
                    value={form.last_name}
                    onChange={e => setForm({...form, last_name: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Grado Escolar</label>
                  <select
                    required
                    value={form.grade_level}
                    onChange={e => setForm({...form, grade_level: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  >
                    <option value="1st Grade">1st Grade</option>
                    <option value="2nd Grade">2nd Grade</option>
                    <option value="3rd Grade">3rd Grade</option>
                    <option value="4th Grade">4th Grade</option>
                    <option value="5th Grade">5th Grade</option>
                    <option value="6th Grade">6th Grade</option>
                    <option value="7th Grade">7th Grade</option>
                    <option value="8th Grade">8th Grade</option>
                    <option value="9th Grade">9th Grade</option>
                    <option value="10th Grade">10th Grade</option>
                    <option value="11th Grade">11th Grade</option>
                    <option value="12th Grade">12th Grade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Programa</label>
                  <select
                    required
                    value={form.program}
                    onChange={e => setForm({...form, program: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  >
                    <option value="Off Campus">Off Campus</option>
                    <option value="Dual Diploma">Dual Diploma</option>
                    <option value="Presencial/Hub">Presencial/Hub</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Hub Asignado</label>
                <select
                  required
                  value={form.hub_id}
                  onChange={e => setForm({...form, hub_id: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                >
                  <option value="" disabled>Seleccione un hub...</option>
                  {hubs.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tutor / Padre Asignado</label>
                <select
                  value={form.parent_id}
                  onChange={e => setForm({...form, parent_id: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                >
                  <option value="">Seleccione el padre/tutor de la lista...</option>
                  {parentUsers.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.first_name || ''} {parent.last_name || ''} ({parent.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 font-bold text-slate-700">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Estudiante'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" /> Editar Estudiante
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                  <input
                    required
                    type="text"
                    value={editFormData.first_name}
                    onChange={e => setEditFormData({...editFormData, first_name: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Apellidos</label>
                  <input
                    required
                    type="text"
                    value={editFormData.last_name}
                    onChange={e => setEditFormData({...editFormData, last_name: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Grado Escolar</label>
                  <select
                    required
                    value={editFormData.grade_level}
                    onChange={e => setEditFormData({...editFormData, grade_level: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  >
                    <option value="1st Grade">1st Grade</option>
                    <option value="2nd Grade">2nd Grade</option>
                    <option value="3rd Grade">3rd Grade</option>
                    <option value="4th Grade">4th Grade</option>
                    <option value="5th Grade">5th Grade</option>
                    <option value="6th Grade">6th Grade</option>
                    <option value="7th Grade">7th Grade</option>
                    <option value="8th Grade">8th Grade</option>
                    <option value="9th Grade">9th Grade</option>
                    <option value="10th Grade">10th Grade</option>
                    <option value="11th Grade">11th Grade</option>
                    <option value="12th Grade">12th Grade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Programa</label>
                  <select
                    required
                    value={editFormData.program}
                    onChange={e => setEditFormData({...editFormData, program: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  >
                    <option value="Off Campus">Off Campus</option>
                    <option value="Dual Diploma">Dual Diploma</option>
                    <option value="Presencial/Hub">Presencial/Hub</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Hub Asignado</label>
                <select
                  required
                  value={editFormData.hub_id}
                  onChange={e => setEditFormData({...editFormData, hub_id: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                >
                  <option value="" disabled>Seleccione un hub...</option>
                  {hubs.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Tutor / Padre Asignado</label>
                <select
                  value={editFormData.family_id}
                  onChange={e => setEditFormData({...editFormData, family_id: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                >
                  <option value="">Seleccione el padre/tutor de la lista...</option>
                  {parentUsers.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.first_name || ''} {parent.last_name || ''} ({parent.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button type="button" onClick={() => setShowEditModal(false)} variant="outline" className="flex-1 font-bold text-slate-700">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha Modal */}
      {fichaStudentId && (
        <StudentFicha
          studentId={fichaStudentId}
          onClose={() => { setFichaStudentId(null); loadData(); }}
        />
      )}
    </div>
  );
}
