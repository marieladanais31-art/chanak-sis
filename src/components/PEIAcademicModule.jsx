
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { BookOpen, AlertCircle, Loader2, Award } from 'lucide-react';

const CATEGORY_COLORS = {
  'Core A.C.E.': 'border-blue-200 bg-blue-50 text-blue-800',
  'Life Skills': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'Second Language - Castellano': 'border-amber-200 bg-amber-50 text-amber-800',
  'Local Social Studies': 'border-purple-200 bg-purple-50 text-purple-800',
  'Electivas': 'border-slate-200 bg-slate-50 text-slate-800',
  'default': 'border-slate-200 bg-slate-50 text-slate-800'
};

const normalizeCategoryName = (cat) => {
  if (!cat) return 'Electivas';
  const c = cat.toLowerCase();
  if (c.includes('core')) return 'Core A.C.E.';
  if (c.includes('life')) return 'Life Skills';
  if (c.includes('second') || c.includes('castellano')) return 'Second Language - Castellano';
  if (c.includes('social') || c.includes('local')) return 'Local Social Studies';
  return cat;
};

export default function PEIAcademicModule({ studentId, studentName }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAcademicPEI = async () => {
      if (!studentId) return;
      setLoading(true);
      try {
        const { data, error: sbError } = await supabase
          .from('student_subjects')
          .select('*')
          .eq('student_id', studentId);

        if (sbError) throw sbError;
        setSubjects(data || []);
      } catch (err) {
        console.error('Error fetching academic PEI:', err);
        setError('No se pudo cargar el módulo académico del PEI.');
      } finally {
        setLoading(false);
      }
    };
    fetchAcademicPEI();
  }, [studentId]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center gap-2 text-indigo-600 bg-white rounded-xl shadow-sm border border-slate-200">
        <Loader2 className="animate-spin w-5 h-5" /> Cargando Categorías Académicas PEI...
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

  const grouped = subjects.reduce((acc, sub) => {
    const cat = normalizeCategoryName(sub.category);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(sub);
    return acc;
  }, {});

  const totalGlobalCredits = subjects.reduce((sum, s) => sum + (parseFloat(s.credits) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" /> Módulo Académico PEI
          </h3>
          <p className="text-sm text-slate-500 mt-1">Estructura curricular individualizada para {studentName}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2 rounded-xl flex items-center gap-2 font-bold">
          <Award className="w-5 h-5" /> {totalGlobalCredits} Créditos Totales
        </div>
      </div>
      
      {Object.keys(grouped).length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-slate-600 font-medium">No hay materias asignadas en el PEI actual.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(grouped).map(([category, subs]) => {
            const totalCredits = subs.reduce((sum, s) => sum + (parseFloat(s.credits) || 0), 0);
            const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
            
            return (
              <div key={category} className={`rounded-xl border-2 shadow-sm overflow-hidden bg-white ${colorClass.split(' ')[0]}`}>
                <div className={`p-4 border-b flex justify-between items-center ${colorClass}`}>
                  <h4 className="font-bold">{category}</h4>
                  <span className="text-xs font-black bg-white/50 px-2 py-1 rounded-md shadow-sm">
                    {totalCredits} Créditos
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {subs.map(sub => (
                    <li key={sub.id} className="p-3.5 text-sm flex flex-col gap-1.5 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-800">{sub.subject_name}</span>
                        {sub.credits && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {sub.credits} cr
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                        {sub.pace_number && <span>Paces: {sub.pace_number}</span>}
                        {sub.grade && <span>Nota: {sub.grade}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
