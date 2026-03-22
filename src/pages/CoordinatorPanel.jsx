
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { LogOut, Users, Upload, FileText, Download, Loader2, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { calculateTrimestralPACES, QUARTERS, isValidQuarter } from '@/utils/schoolCalendar';

export default function CoordinatorPanel() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [formData, setFormData] = useState({ subject: '', score: '', quarter: QUARTERS.Q1, date: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);

  const loadData = async () => {
    if (!profile?.hub_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: studentsData, error: sError } = await supabase.from('students').select('*').eq('hub_id', profile.hub_id);
      if (sError) throw sError;
      setStudents(studentsData || []);

      const studentIds = (studentsData || []).map(s => s.id);

      if (studentIds.length > 0) {
        const { data: gradesData, error: gError } = await supabase.from('student_grades').select('*').in('student_id', studentIds);
        if (gError) throw gError;
        setGrades(gradesData || []);
      }

      const { data: subjectsData } = await supabase.from('subjects').select('*');
      setSubjects(subjectsData || []);
      if (subjectsData?.length > 0) setFormData(prev => ({ ...prev, subject: subjectsData[0].name }));

    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Error al cargar datos del Hub', variant: 'destructive' });
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
      toast({ title: 'Error', description: 'Trimestre inválido. Debe ser Q1, Q2 o Q3.', variant: 'destructive' });
      return;
    }

    console.log(`📝 Guardando nota: Estudiante=${selectedStudentId}, Materia=${formData.subject}, Score=${formData.score}, Trimestre=${formData.quarter}`);
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
      loadData();
    } catch (err) {
      console.error("❌ Error al guardar nota:", err);
      toast({ title: 'Error', description: 'Ocurrió un error al guardar la nota.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadPEI = async (studentId, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingId(studentId);
    try {
      const fileName = `${studentId}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('pei_files').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('pei_files').getPublicUrl(fileName);
      
      const { error: updateError } = await supabase.from('students').update({ pei_url: publicUrl }).eq('id', studentId);
      if (updateError) throw updateError;

      toast({ title: 'Éxito', description: 'PEI subido correctamente' });
      loadData();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo subir el archivo PEI', variant: 'destructive' });
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-indigo-900 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Portal del Coordinador</h1>
            <p className="text-sm text-indigo-200">{profile?.first_name || 'Coordinador'} | Hub ID: {profile?.hub_id?.substring(0,8) || 'N/A'}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-indigo-800 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors font-semibold">
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-black text-slate-800">Estudiantes del Hub</h2>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map(student => {
              const studentGrades = grades.filter(g => g.student_id === student.id);
              const projection = calculateTrimestralPACES(student.created_at, studentGrades);
              
              return (
                <div key={student.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 flex-1">
                    <h3 className="font-bold text-lg text-slate-800">{student.first_name} {student.last_name}</h3>
                    <p className="text-sm text-slate-500 mb-4">{student.grade_level || 'Sin grado'}</p>

                    <div className={`p-3 rounded-lg border ${projection.isOnTrack ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-start gap-2">
                        {projection.isOnTrack ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />}
                        <div>
                          <p className={`text-sm font-bold ${projection.isOnTrack ? 'text-emerald-800' : 'text-red-800'}`}>
                            {projection.quarterName}
                          </p>
                          <p className={`text-xs ${projection.isOnTrack ? 'text-emerald-600' : 'text-red-600'}`}>
                            {projection.isOnTrack 
                              ? `Al día: ${projection.actualPACES} PACES completados` 
                              : `Atraso: faltan ${projection.deficit} PACES`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 flex flex-wrap gap-2">
                    <button 
                      onClick={() => { setSelectedStudentId(student.id); setIsGradeModalOpen(true); }}
                      className="flex-1 min-w-[120px] py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" /> Notas
                    </button>
                    
                    {student.pei_url ? (
                      <a 
                        href={student.pei_url} target="_blank" rel="noreferrer"
                        className="flex-1 min-w-[120px] py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      >
                        <Download className="w-4 h-4" /> Ver PEI
                      </a>
                    ) : (
                      <label className="flex-1 min-w-[120px] py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        {uploadingId === student.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Subir PEI
                        <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => handleUploadPEI(student.id, e)} disabled={uploadingId === student.id} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isGradeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg">Ingresar Nota Trimestral</h3>
            </div>
            <form onSubmit={handleSaveGrade} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Trimestre</label>
                <select value={formData.quarter} onChange={e => setFormData({...formData, quarter: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value={QUARTERS.Q1}>Q1 (Sept-Dic)</option>
                  <option value={QUARTERS.Q2}>Q2 (Ene-Mar)</option>
                  <option value={QUARTERS.Q3}>Q3 (Abr-Jun)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Materia</label>
                <select required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                  {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Score (0-100)</label>
                  <input required type="number" min="0" max="100" value={formData.score} onChange={e => setFormData({...formData, score: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Fecha</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsGradeModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold flex justify-center items-center">
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
