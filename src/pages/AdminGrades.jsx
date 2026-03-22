
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { BookOpen, Loader2, AlertCircle, Plus, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminGrades() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [formData, setFormData] = useState({
    subject: '',
    score: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: stdData, error: stdErr } = await supabase
        .from('students')
        .select('id, first_name, last_name, hub_id');
      if (stdErr) throw stdErr;

      const { data: hubsData, error: hubsErr } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('type', 'hub');
      if (hubsErr) throw hubsErr;

      const twentyOneDaysAgo = new Date();
      twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);
      
      const { data: recentGrades, error: gradesErr } = await supabase
        .from('student_grades')
        .select('student_id')
        .gte('completed_at', twentyOneDaysAgo.toISOString());
      if (gradesErr) throw gradesErr;

      const enriched = (stdData || []).map(s => {
        const hub = (hubsData || []).find(h => h.id === s.hub_id);
        const hasRecent = (recentGrades || []).some(g => g.student_id === s.id);
        return {
          ...s,
          hub_name: hub ? hub.name : 'Chanak Florida',
          hasRecentGrades: hasRecent
        };
      });

      setStudents(enriched);
    } catch (err) {
      console.error(err);
      setError('Error al cargar datos académicos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      subject: '',
      score: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.score) return;
    
    setSaving(true);
    try {
      const { error: insertErr } = await supabase
        .from('student_grades')
        .insert([{
          student_id: selectedStudent.id,
          subject: formData.subject,
          score: parseFloat(formData.score),
          pace_number: 1, 
          completed_at: new Date(formData.date).toISOString()
        }]);

      if (insertErr) throw insertErr;

      toast({
        title: "Éxito",
        description: "Calificación registrada correctamente.",
      });
      setIsModalOpen(false);
      loadData(); 
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "No se pudo guardar la calificación.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 h-full">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      <p className="text-slate-500 font-medium">Cargando módulo académico...</p>
    </div>
  );

  if (error) return (
    <div className="p-12 text-center bg-white rounded-xl border border-red-200 text-red-600">
      <AlertCircle className="w-10 h-10 mx-auto mb-2" />
      <p>{error}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Registro de PACES
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gestión de avance académico por estudiante</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map(student => (
          <div key={student.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div className="font-bold text-slate-800 line-clamp-1 flex-1 pr-2">
                {student.first_name} {student.last_name}
              </div>
              {student.hasRecentGrades ? (
                <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 mt-1 shadow-[0_0_6px_rgba(16,185,129,0.5)]" title="Al Día"></div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1 shadow-[0_0_6px_rgba(239,68,68,0.5)]" title="Alerta"></div>
              )}
            </div>
            
            <p className="text-sm text-slate-500 mb-5 flex-1">{student.hub_name}</p>
            
            <button 
              onClick={() => openModal(student)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-sm font-semibold transition-colors border border-blue-100"
            >
              <Plus className="w-4 h-4" />
              Registrar Calificación
            </button>
          </div>
        ))}
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Nueva Calificación</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Estudiante</p>
                <p className="text-slate-800 bg-slate-50 px-3 py-2 rounded-md border border-slate-200">{selectedStudent?.first_name} {selectedStudent?.last_name}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Materia</label>
                <input 
                  type="text" 
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Math, English..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Score (0-100)</label>
                  <input 
                    type="number" 
                    required min="0" max="100"
                    value={formData.score}
                    onChange={(e) => setFormData({...formData, score: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
