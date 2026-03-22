import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const BLOCK_ORDER = [
  'Core A.C.E.',
  'Extensión Local',
  'Life Skills',
  'Core Credits',
  'Local Validation / Foreign Language',
  'Life Skills & Leadership',
  'Electives',
  'OTROS'
];

export default function AcademicEditor({ studentId, quarter = 'Q1' }) {
  const { toast } = useToast();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (studentId) fetchSubjects();
  }, [studentId, quarter]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_year', '2025-2026')
        .eq('quarter', quarter)
        .order('subject_order', { ascending: true });

      if (error) throw error;

      const unique = [];
      const seen = new Set();

      for (const item of data || []) {
        const key = `${item.subject_name}__${item.academic_block || ''}__${item.category || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(item);
        }
      }

      setSubjects(unique);
    } catch (err) {
      console.error('Error loading subjects:', err);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las materias',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGrade = async (id, value) => {
    const numeric = value === '' ? null : Number(value);

    const { error } = await supabase
      .from('student_subjects')
      .update({
        grade: numeric,
        approval_status: numeric === null ? 'pending' : 'submitted',
        submitted_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la nota',
        variant: 'destructive'
      });
      return;
    }

    setSubjects(prev =>
      prev.map(s =>
        s.id === id
          ? {
              ...s,
              grade: numeric,
              approval_status: numeric === null ? 'pending' : 'submitted'
            }
          : s
      )
    );
  };

  const normalizeBlock = (block) => {
    if (!block) return 'OTROS';
    if (BLOCK_ORDER.includes(block)) return block;

    const b = block.toUpperCase();

    if (b.includes('CORE A.C.E')) return 'Core A.C.E.';
    if (b.includes('CORE CREDIT')) return 'Core Credits';
    if (b.includes('EXTENSIÓN LOCAL') || b.includes('EXTENSION LOCAL')) return 'Extensión Local';
    if (b.includes('LOCAL VALIDATION') || b.includes('FOREIGN LANGUAGE')) return 'Local Validation / Foreign Language';
    if (b.includes('LIFE SKILLS & LEADERSHIP')) return 'Life Skills & Leadership';
    if (b.includes('LIFE SKILLS')) return 'Life Skills';
    if (b.includes('ELECT')) return 'Electives';

    return 'OTROS';
  };

  const grouped = useMemo(() => {
    const out = {};
    BLOCK_ORDER.forEach(block => {
      out[block] = [];
    });

    subjects.forEach(sub => {
      const block = normalizeBlock(sub.academic_block);
      out[block].push(sub);
    });

    return out;
  }, [subjects]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No hay materias asignadas para este estudiante.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-900 text-white p-6">
        <h2 className="text-xl font-bold">Gestión Académica</h2>
        <p className="text-indigo-200 text-sm mt-1">
          Edición de notas basada en materias reales del sistema
        </p>
      </div>

      <div className="p-6 space-y-8">
        {Object.entries(grouped).map(([block, list]) => {
          if (!list || list.length === 0) return null;

          return (
            <div key={block}>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 border-b pb-2">
                {block}
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Materia</th>
                      <th className="px-4 py-2 text-center">Nota</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {list.map(sub => (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {sub.subject_name}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sub.grade ?? ''}
                            onChange={(e) => updateGrade(sub.id, e.target.value)}
                            className="w-20 text-center border rounded px-2 py-1"
                          />
                        </td>

                        <td className="px-4 py-3 text-center">
                          {sub.approval_status === 'approved' ? (
                            <span className="text-emerald-600 font-semibold">Aprobado</span>
                          ) : sub.approval_status === 'submitted' ? (
                            <span className="text-blue-600 font-semibold">Enviado</span>
                          ) : (
                            <span className="text-slate-400">Pendiente</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}