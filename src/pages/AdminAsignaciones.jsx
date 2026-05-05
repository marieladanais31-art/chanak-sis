import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Calendar, AlertTriangle, BookOpen, Clipboard } from 'lucide-react';
import MonthlyAssignments from '@/components/MonthlyAssignments';
import { ACTIVE_SCHOOL_YEAR } from '@/lib/academicUtils';

const PACE_STATUS_META = {
  pending:     { label: 'Pendiente',    color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'En progreso',  color: 'bg-blue-100 text-blue-700' },
  submitted:   { label: 'Entregado',    color: 'bg-amber-100 text-amber-800' },
  approved:    { label: 'Aprobado',     color: 'bg-green-100 text-green-700' },
  delivered:   { label: 'Entregado',    color: 'bg-green-100 text-green-700' },
  evaluated:   { label: 'Evaluado',     color: 'bg-emerald-100 text-emerald-700' },
  cancelled:   { label: 'Cancelado',    color: 'bg-slate-100 text-slate-400' },
};

const SUBJECT_TABS = ['Proyectos mensuales', 'Trabajos locales'];
const LOCAL_SUBJECTS_1 = ['Español', 'Life Skills', 'Physical Education', 'Arts'];
const LOCAL_SUBJECTS_2 = ['Historia y Geografía Local', 'Formación en Valores', 'Proyecto Integrador'];

export default function AdminAsignaciones() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [schoolYear, setSchoolYear] = useState(ACTIVE_SCHOOL_YEAR);
  const [mainTab, setMainTab] = useState('paces');

  // PACE state
  const [paces, setPaces] = useState([]);
  const [overduePaces, setOverduePaces] = useState([]);
  const [pacesLoading, setPacesLoading] = useState(false);

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

  const loadPaces = useCallback(async (studentId) => {
    if (!studentId) { setPaces([]); setOverduePaces([]); return; }
    setPacesLoading(true);
    const [pacesRes, overdueRes] = await Promise.all([
      supabase
        .from('pei_pace_projections')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_year', schoolYear)
        .order('subject_name')
        .order('pace_number'),
      supabase.rpc('get_overdue_paces', { p_student_id: studentId }),
    ]);
    if (!pacesRes.error) setPaces(pacesRes.data || []);
    if (!overdueRes.error) setOverduePaces(overdueRes.data || []);
    setPacesLoading(false);
  }, [schoolYear]);

  useEffect(() => {
    if (mainTab === 'paces' && selected) {
      loadPaces(selected.id);
    }
  }, [mainTab, selected, loadPaces]);

  const filtered = students.filter(s => {
    const name = `${s.first_name} ${s.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const pacesBySubject = paces.reduce((acc, p) => {
    if (!acc[p.subject_name]) acc[p.subject_name] = [];
    acc[p.subject_name].push(p);
    return acc;
  }, {});

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

      {/* Main tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: 'paces',     label: 'PACEs',               icon: BookOpen },
          { id: 'proyectos', label: 'Proyectos mensuales',  icon: Calendar },
          { id: 'locales',   label: 'Trabajos locales',     icon: Clipboard },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMainTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors -mb-px ${
              mainTab === id
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
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

        {/* Right panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Calendar className="w-12 h-12 opacity-30 mb-3" />
              <p className="font-bold">Selecciona un estudiante</p>
              <p className="text-sm mt-1">para ver sus asignaciones</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-slate-800">
                  {selected.first_name} {selected.last_name}
                  <span className="ml-2 text-xs font-medium text-slate-500">· {schoolYear}</span>
                </h3>
              </div>

              {/* ── PACEs tab ── */}
              {mainTab === 'paces' && (
                <div className="p-4 space-y-4">
                  {pacesLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                  ) : (
                    <>
                      {overduePaces.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                          <p className="font-black text-red-700 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> {overduePaces.length} PACE(s) vencido(s)
                          </p>
                          {overduePaces.map(op => (
                            <p key={op.pace_id} className="text-xs text-red-600 pl-6">
                              {op.subject_name} PACE {op.pace_number} — {op.days_overdue} días de retraso
                            </p>
                          ))}
                        </div>
                      )}

                      {Object.keys(pacesBySubject).length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <BookOpen className="w-10 h-10 mx-auto opacity-30 mb-2" />
                          <p className="font-bold">No hay PACEs registrados</p>
                          <p className="text-sm mt-1">Los PACEs se registran desde el módulo PEI.</p>
                        </div>
                      ) : (
                        Object.entries(pacesBySubject).map(([subject, list]) => (
                          <div key={subject} className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-slate-800 text-white text-xs font-black uppercase tracking-wider">
                              {subject}
                            </div>
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase">
                                <tr>
                                  <th className="px-3 py-2 text-left">PACE</th>
                                  <th className="px-3 py-2 text-center">Trimestre</th>
                                  <th className="px-3 py-2 text-center">Entrega est.</th>
                                  <th className="px-3 py-2 text-center">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {list.map(p => {
                                  const isOverdue = overduePaces.some(op => op.pace_id === p.id);
                                  const meta = isOverdue
                                    ? { label: 'Vencido', color: 'bg-red-100 text-red-700' }
                                    : (PACE_STATUS_META[p.status] || PACE_STATUS_META.pending);
                                  return (
                                    <tr key={p.id} className={`${isOverdue ? 'bg-red-50/30' : 'hover:bg-slate-50'} transition-colors`}>
                                      <td className="px-3 py-2 font-bold text-slate-800">#{p.pace_number}</td>
                                      <td className="px-3 py-2 text-center text-slate-500">{p.quarter || '—'}</td>
                                      <td className="px-3 py-2 text-center text-slate-500 text-xs">{p.estimated_delivery_date || '—'}</td>
                                      <td className="px-3 py-2 text-center">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${meta.color}`}>{meta.label}</span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Proyectos mensuales tab ── */}
              {mainTab === 'proyectos' && (
                <div className="p-4">
                  <p className="text-xs text-slate-400 mb-4">Español · Life Skills · Physical Education · Arts</p>
                  <MonthlyAssignments
                    studentId={selected.id}
                    studentName={`${selected.first_name} ${selected.last_name}`}
                    schoolYear={schoolYear}
                    subjectFilter={LOCAL_SUBJECTS_1}
                    canEdit
                  />
                </div>
              )}

              {/* ── Trabajos locales tab ── */}
              {mainTab === 'locales' && (
                <div className="p-4">
                  <p className="text-xs text-slate-400 mb-4">Historia y Geografía Local · Formación en Valores · Proyecto Integrador</p>
                  <MonthlyAssignments
                    studentId={selected.id}
                    studentName={`${selected.first_name} ${selected.last_name}`}
                    schoolYear={schoolYear}
                    subjectFilter={LOCAL_SUBJECTS_2}
                    canEdit
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
