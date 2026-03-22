
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Users, BookOpen, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { QUARTERS, isValidQuarter } from '@/utils/schoolCalendar';

export default function TutorDashboard() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [formData, setFormData] = useState({ subject: '', score: '', quarter: QUARTERS.Q1, date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data: studentsData, error: sError } = await supabase.from('students').select('*').eq('tutor_id', profile.id);
      if (sError) throw sError;
      setStudents(studentsData || []);

      const { data: subjectsData } = await supabase.from('subjects').select('*');
      setSubjects(subjectsData || []);
      if (subjectsData?.length > 0) setFormData(prev => ({ ...prev, subject: subjectsData[0].name }));

    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Error al cargar estudiantes asignados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [profile]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    
    if (!isValidQuarter(formData.quarter)) {
      toast({ title: 'Error', description: 'Trimestre inválido. Seleccione Q1, Q2 o Q3.', variant: 'destructive' });
      return;
    }

    console.log(`👨‍🏫 Tutor guardando nota: Estudiante=${selectedStudentId}, Materia=${formData.subject}, Score=${formData.score}, Trimestre=${formData.quarter}`);
    setSaving(true);

    try {
      const { error } = await supabase.from('student_grades').insert([{
        student_id: selectedStudentId,
        subject: formData.subject,
        score: parseFloat(formData.score),
        quarter: formData.quarter,
        pace_number: 1,
        completed_at: formData.date
      }]);
      if (error) throw error;
      
      toast({ title: 'Éxito', description: 'Nota guardada correctamente.' });
      setIsGradeModalOpen(false);
      setFormData(prev => ({ ...prev, score: '', quarter: QUARTERS.Q1 })); // Reset form
    } catch (err) {
      console.error("❌ Tutor Error al guardar nota:", err);
      toast({ title: 'Error', description: 'No se pudo guardar la nota.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-teal-700 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Portal del Tutor</h1>
            <p className="text-sm text-teal-100">{profile?.first_name || 'Tutor'}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-teal-800 hover:bg-teal-900 px-4 py-2 rounded-lg transition-colors font-semibold">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-6 h-6 text-teal-600" />
          <h2 className="text-2xl font-black text-slate-800">Mis Estudiantes Asignados</h2>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
        ) : students.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
            No tienes estudiantes asignados en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {students.map(student => (
              <div key={student.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold text-lg mb-4">
                    {student.first_name.charAt(0)}
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 leading-tight">{student.first_name} {student.last_name}</h3>
                  <p className="text-sm text-slate-500">{student.grade_level || 'Sin grado'}</p>
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <button 
                    onClick={() => { setSelectedStudentId(student.id); setIsGradeModalOpen(true); }}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" /> Ingresar Nota
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {isGradeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg">Ingresar Nota para Estudiante</h3>
            </div>
            <form onSubmit={handleSaveGrade} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Trimestre</label>
                <select value={formData.quarter} onChange={e => setFormData({...formData, quarter: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
                  <option value={QUARTERS.Q1}>Q1 (Sept-Dic)</option>
                  <option value={QUARTERS.Q2}>Q2 (Ene-Mar)</option>
                  <option value={QUARTERS.Q3}>Q3 (Abr-Jun)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Materia</label>
                <select required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
                  {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Score (0-100)</label>
                  <input required type="number" min="0" max="100" value={formData.score} onChange={e => setFormData({...formData, score: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Fecha</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsGradeModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg font-bold flex justify-center items-center">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
