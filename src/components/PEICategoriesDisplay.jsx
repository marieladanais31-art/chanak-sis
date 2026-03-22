
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';

export default function PEICategoriesDisplay({ studentId }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!studentId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('student_subjects')
          .select('*')
          .eq('student_id', studentId);

        if (error) throw error;
        setSubjects(data || []);
      } catch (err) {
        console.error('Error fetching subjects:', err);
        setError('Error al cargar las materias.');
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, [studentId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center gap-2 text-indigo-600 bg-white rounded-xl shadow-sm border border-slate-200">
        <Loader2 className="animate-spin w-5 h-5" /> Cargando categorías PEI...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" /> {error}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
        <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-slate-600 font-medium">No hay materias asignadas en el PEI.</p>
      </div>
    );
  }

  const grouped = subjects.reduce((acc, sub) => {
    const cat = sub.category || 'Electivas';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sub);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-indigo-600" /> Categorías Académicas
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(grouped).map(([category, subs]) => {
          const totalCredits = subs.reduce((sum, s) => sum + (parseFloat(s.credits) || 0), 0);
          return (
            <div key={category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                <h4 className="font-bold text-slate-700">{category}</h4>
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">
                  {totalCredits} Créditos
                </span>
              </div>
              <ul className="divide-y divide-slate-100">
                {subs.map(sub => (
                  <li key={sub.id} className="p-3 text-sm flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <span className="font-medium text-slate-800">{sub.subject_name}</span>
                    <div className="text-xs text-slate-500 space-x-2 text-right">
                      {sub.pace_number && <span>Pace: {sub.pace_number}</span>}
                      {sub.grade && <span>Nota: {sub.grade}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
