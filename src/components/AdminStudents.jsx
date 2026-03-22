
import React, { useState, useEffect } from 'react';
import { UserPlus, WifiOff, X, Edit, Award, Save, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { US_GRADE_LEVELS, getGradeLabel } from '@/constants/gradelevels';
import { getAllStudents, addStudent, editStudent, deleteStudent } from '@/lib/studentOperations';
import { getAllHubs } from '@/lib/hubOperations';
import HubSelectorPostReset from '@/components/HubSelectorPostReset';

export default function AdminStudents() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', grade_level: '', academic_level: '', status: 'Pending', 
    payment_status: 'pending', is_scholarship: false, passport_number: '', date_of_birth: '',
    hub_id: ''
  });
  
  const [hubRefreshCounter, setHubRefreshCounter] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showForm) {
      console.log('🔄 [AdminStudents] Form opened. Triggering hub selector refresh...');
      setHubRefreshCounter(prev => prev + 1);
    }
  }, [showForm]);

  const loadData = async () => {
    setLoading(true);
    setNetworkError(false);
    
    try {
      console.log('🔄 [AdminStudents] Fetching required data...');
      
      const [studentsRes, hubsRes] = await Promise.all([
        getAllStudents(),
        getAllHubs()
      ]);
      
      if (studentsRes.error || hubsRes.error) {
        throw new Error("Failed to load records from database");
      }
      
      setStudents(studentsRes.data || []);
      setHubs(hubsRes.data || []);
      console.log('✅ [AdminStudents] Confirmed no mock data used in student or hub lists.');
    } catch (err) {
      console.error('❌ [AdminStudents] Loading error:', err);
      setNetworkError(true);
      toast({ title: 'Error de conexión', description: 'No se pudieron cargar los datos. Verifique su conexión.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getHubName = (hubId) => {
    if (!hubId) return 'Independiente / Sin Hub';
    const hub = hubs.find(h => h.id === hubId);
    return hub ? hub.name : 'Desconocido';
  };

  const handleEditStudentClick = (student) => {
    setFormData({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      grade_level: student.grade_level || '',
      academic_level: student.academic_level || '',
      status: student.status || 'Pending',
      payment_status: student.payment_status || 'pending',
      is_scholarship: student.is_scholarship || false,
      passport_number: student.passport_number || '',
      date_of_birth: student.date_of_birth || '',
      hub_id: student.hub_id || ''
    });
    setEditingId(student.id);
    setShowForm(true);
  };

  const handleResetForm = () => {
    setFormData({ 
      first_name: '', last_name: '', grade_level: '', academic_level: '', status: 'Pending', 
      payment_status: 'pending', is_scholarship: false, passport_number: '', date_of_birth: '',
      hub_id: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      grade_level: formData.grade_level,
      academic_level: formData.academic_level,
      status: formData.status,
      payment_status: formData.payment_status,
      is_scholarship: Boolean(formData.is_scholarship),
      passport_number: formData.passport_number,
      date_of_birth: formData.date_of_birth || null,
      hub_id: formData.hub_id || null
    };

    setLoading(true);
    
    try {
      if (editingId) {
        const { error } = await editStudent(editingId, payload);
        if (error) throw error;
        toast({ title: 'Éxito', description: 'Alumno actualizado exitosamente' });
      } else {
        const { error } = await addStudent(payload);
        if (error) throw error;
        toast({ title: 'Éxito', description: 'Alumno creado exitosamente' });
      }
      
      handleResetForm();
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar el alumno', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id) => {
    if(!window.confirm('¿Está seguro de eliminar este estudiante permanentemente?')) return;
    
    setLoading(true);
    try {
      const { error } = await deleteStudent(id);
      if (error) throw error;
      
      toast({ title: 'Éxito', description: 'Alumno eliminado exitosamente' });
      await loadData();
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el alumno', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleHubSelection = (selectedIds) => {
    const selectedHubId = selectedIds.length > 0 ? selectedIds[0] : '';
    setFormData(prev => ({ ...prev, hub_id: selectedHubId }));
  };

  if (loading && students.length === 0) return <div className="p-8 flex items-center gap-3"><span className="animate-spin text-xl">⏳</span> Cargando base de datos en vivo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Directorio de Alumnos</h2>
        <Button onClick={() => { handleResetForm(); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <UserPlus className="w-4 h-4 mr-2" /> Agregar Alumno
        </Button>
      </div>

      {networkError && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 text-sm font-medium flex items-center gap-2">
          <WifiOff className="w-5 h-5" /> Problema de conexión a base de datos.
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h3 className="text-lg font-bold text-slate-800">{editingId ? 'Editar Alumno' : 'Nuevo Alumno'}</h3>
            <Button variant="ghost" size="sm" onClick={handleResetForm}><X className="w-4 h-4" /></Button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nombre</label>
              <input required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full border p-2 rounded text-slate-900 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Apellido</label>
              <input required value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full border p-2 rounded text-slate-900 bg-white" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ID / Pasaporte</label>
              <input value={formData.passport_number} onChange={e => setFormData({...formData, passport_number: e.target.value})} className="w-full border p-2 rounded text-slate-900 bg-white" placeholder="Opcional" />
            </div>
            
            <div className="md:col-span-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-2">Hub Asociado</label>
              <HubSelectorPostReset 
                selectedHubIds={formData.hub_id ? [formData.hub_id] : []} 
                onChange={handleHubSelection} 
                multiple={false} 
                forceRefresh={hubRefreshCounter}
              />
              <div className="mt-2 text-right">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setFormData(prev => ({...prev, hub_id: ''}))}
                  className="text-xs h-7"
                >
                  Desasignar Hub (Independiente)
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fecha de Nacimiento</label>
              <input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} className="w-full border p-2 rounded text-slate-900 bg-white" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Grado (US)</label>
              <select value={formData.grade_level} onChange={e => setFormData({...formData, grade_level: e.target.value})} className="w-full border p-2 rounded bg-white text-slate-900">
                <option value="">Seleccionar...</option>
                {US_GRADE_LEVELS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Estado</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border p-2 rounded bg-white text-slate-900">
                <option value="Pending">Pendiente</option><option value="Enrolled">Inscrito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pago</label>
              <select disabled={formData.is_scholarship} value={formData.payment_status} onChange={e => setFormData({...formData, payment_status: e.target.value})} className="w-full border p-2 rounded bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-500">
                {formData.is_scholarship ? (
                  <option value="scholarship">Becado/Exento</option>
                ) : (
                  <>
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                  </>
                )}
              </select>
            </div>

            <div className="md:col-span-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 p-3 border-2 rounded-xl bg-purple-50 border-purple-200 transition-colors">
                <input 
                  type="checkbox" 
                  id="scholarship" 
                  checked={formData.is_scholarship} 
                  onChange={e => setFormData({...formData, is_scholarship: e.target.checked, payment_status: e.target.checked ? 'scholarship' : 'pending'})} 
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 cursor-pointer" 
                />
                <label htmlFor="scholarship" className="text-sm font-bold text-purple-900 cursor-pointer select-none">
                  🎓 Estudiante Becado (Exento de Pago)
                </label>
              </div>
              <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto font-bold px-6">
                <Save className="w-4 h-4 mr-2" /> {editingId ? 'Actualizar Alumno' : 'Guardar Alumno'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Estudiante</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Hub Asociado</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Grado</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Estado</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Finanzas</th>
                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">
                    {s.first_name} {s.last_name}
                    {s.passport_number && <div className="text-xs font-mono text-slate-500 mt-0.5">ID: {s.passport_number}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{getHubName(s.hub_id)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{getGradeLabel(s.grade_level) || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${s.status === 'Enrolled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {s.status === 'Enrolled' ? '✅ Inscrito' : '⏳ Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {s.is_scholarship || s.payment_status === 'scholarship' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <Award className="w-3.5 h-3.5"/> Becado
                      </span>
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${s.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {s.payment_status === 'paid' ? '✅ Pagado' : '❌ Pendiente'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEditStudentClick(s)} className="text-blue-600 hover:bg-blue-50">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteStudent(s.id)} className="text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan="6" className="text-center p-8 text-slate-500">No hay alumnos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
