import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, FileText, Plus, Eye, BookOpen, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PEIFormFull from '@/components/PEIFormFull';
import AcademicAlerts from '@/components/AcademicAlerts';

const STATUS_BADGE = {
  draft:     'bg-slate-100 text-slate-700',
  in_review: 'bg-amber-100 text-amber-800',
  approved:  'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
};
const STATUS_LABEL = {
  draft: 'Borrador', in_review: 'En revisión', approved: 'Aprobado', published: 'Publicado',
};

export default function AdminPEI() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [peis, setPeis]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null); // { studentId, studentName, peiId }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studRes, peiRes] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name, grade_level').order('first_name'),
        supabase.from('individualized_education_plans')
          .select('id, student_id, school_year, quarter, status, updated_at')
          .order('updated_at', { ascending: false }),
      ]);
      if (studRes.error) throw studRes.error;
      if (peiRes.error && peiRes.error.code !== 'PGRST116') throw peiRes.error;
      setStudents(studRes.data || []);
      setPeis(peiRes.data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo cargar la lista de estudiantes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getPei = (studentId) => peis.find(p => p.student_id === studentId);

  const openNew = (student) => setSelected({ studentId: student.id, studentName: `${student.first_name} ${student.last_name}`, peiId: null });
  const openExisting = (student, pei) => setSelected({ studentId: student.id, studentName: `${student.first_name} ${student.last_name}`, peiId: pei.id });

  const handleClose = () => {
    setSelected(null);
    load();
  };

  if (selected) return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <PEIFormFull
        studentId={selected.studentId}
        studentName={selected.studentName}
        peiId={selected.peiId}
        canEdit={true}
        onClose={handleClose}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" /> Gestión de PEI
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Planes Educativos Individualizados</p>
        </div>
      </div>

      {/* Alerts panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <AcademicAlerts targetRole="admin" />
      </div>

      {/* Students table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Estudiante</th>
                <th className="p-4">Grado</th>
                <th className="p-4">PEI Actual</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => {
                const pei = getPei(student.id);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                    <td className="p-4 text-slate-500 text-xs">{student.grade_level || '—'}</td>
                    <td className="p-4 text-slate-500 text-xs">
                      {pei ? `${pei.school_year} · ${pei.quarter || ''}` : '—'}
                    </td>
                    <td className="p-4">
                      {pei ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[pei.status] || 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABEL[pei.status] || pei.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin PEI</span>
                      )}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {pei ? (
                        <button
                          onClick={() => openExisting(student, pei)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs transition-colors border border-blue-200"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver / Editar
                        </button>
                      ) : (
                        <button
                          onClick={() => openNew(student)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg font-bold text-xs transition-colors border border-slate-200"
                        >
                          <Plus className="w-3.5 h-3.5" /> Crear PEI
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
