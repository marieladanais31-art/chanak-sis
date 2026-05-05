import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Calendar } from 'lucide-react';
import MonthlyAssignments from '@/components/MonthlyAssignments';
import { ACTIVE_SCHOOL_YEAR } from '@/lib/academicUtils';

export default function AdminAsignaciones() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [schoolYear, setSchoolYear] = useState(ACTIVE_SCHOOL_YEAR);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('id, first_name, last_name, grade_level, student_status')
      .in('student_status', ['active', null])
      .order('first_name');
    if (!error) setStudents(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
            placeholder="Buscar estudiante…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 font-bold"
          value={schoolYear}
          onChange={e => setSchoolYear(e.target.value)}
        >
          <option value="2024-2025">2024-2025</option>
          <option value="2025-2026">2025-2026</option>
          <option value="2026-2027">2026-2027</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" /> Estudiantes
            </h3>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {filtered.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selected?.id === s.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                >
                  <p className="font-bold text-slate-800 text-sm">{s.first_name} {s.last_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.grade_level || 'Sin grado'}</p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-4 py-8 text-center text-slate-400 text-sm">No hay estudiantes.</p>
              )}
            </div>
          )}
        </div>

        {/* Monthly assignments panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {selected ? (
            <>
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-slate-800">
                  {selected.first_name} {selected.last_name}
                  <span className="ml-2 text-xs font-medium text-slate-500">· {schoolYear}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Asignaciones mensuales: Español, Life Skills, Physical Education, Arts</p>
              </div>
              <div className="p-4">
                <MonthlyAssignments
                  studentId={selected.id}
                  studentName={`${selected.first_name} ${selected.last_name}`}
                  schoolYear={schoolYear}
                  canEdit
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Calendar className="w-12 h-12 opacity-30 mb-3" />
              <p className="font-bold">Selecciona un estudiante</p>
              <p className="text-sm mt-1">para ver sus asignaciones mensuales</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
