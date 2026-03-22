import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, WifiOff, BookOpen, Calculator, Hash, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getCachedData, setCachedData } from '@/lib/cacheUtils';

const BLOCK_ORDER = [
  'Core A.C.E.',
  'Extensión Local',
  'Life Skills',
  'Core Credits',
  'Local Validation / Foreign Language',
  'Life Skills & Leadership',
  'Electives',
  'OTROS',
];

export default function AcademicRegistry({ studentId }) {
  const { toast } = useToast();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    if (studentId) fetchSubjects();
  }, [studentId]);

  const normalizeBlock = (block) => {
    if (!block) return 'OTROS';
    if (BLOCK_ORDER.includes(block)) return block;

    const b = String(block).toUpperCase();

    if (b.includes('CORE A.C.E')) return 'Core A.C.E.';
    if (b.includes('CORE CREDIT')) return 'Core Credits';
    if (b.includes('EXTENSIÓN LOCAL') || b.includes('EXTENSION LOCAL')) return 'Extensión Local';
    if (b.includes('LOCAL VALIDATION') || b.includes('FOREIGN LANGUAGE')) {
      return 'Local Validation / Foreign Language';
    }
    if (b.includes('LIFE SKILLS & LEADERSHIP')) return 'Life Skills & Leadership';
    if (b.includes('LIFE SKILLS')) return 'Life Skills';
    if (b.includes('ELECT')) return 'Electives';

    return 'OTROS';
  };

  const fetchSubjects = async () => {
    const cacheKey = `academic_registry_${studentId}`;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_year', '2025-2026')
        .eq('quarter', 'Q1')
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
      setCachedData(cacheKey, unique);
      setIsOffline(false);
    } catch (err) {
      console.error('Error fetching academic registry:', err);
      setIsOffline(true);
      setSubjects(getCachedData(cacheKey) || []);
      toast({
        title: 'Aviso',
        description: 'Modo offline activo. Mostrando datos en caché si existen.',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSubjectField = async (id, field, value) => {
    const normalizedValue =
      field === 'grade'
        ? value === ''
          ? null
          : Number(value)
        : value;

    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: normalizedValue } : s))
    );

    setSavingId(id);

    try {
      const payload = {
        [field]: normalizedValue,
        submitted_at: new Date().toISOString(),
      };

      if (field === 'grade') {
        payload.approval_status =
          normalizedValue === null ? 'pending' : 'submitted';
      }

      const { error } = await supabase
        .from('student_subjects')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating subject:', err);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el cambio.',
        variant: 'destructive',
      });
      fetchSubjects();
    } finally {
      setSavingId(null);
    }
  };

  const groupedSubjects = useMemo(() => {
    const grouped = {};
    BLOCK_ORDER.forEach((block) => {
      grouped[block] = [];
    });

    subjects.forEach((sub) => {
      const block = normalizeBlock(sub.academic_block);
      grouped[block].push(sub);
    });

    return grouped;
  }, [subjects]);

  const totalCredits = subjects.reduce(
    (acc, curr) => acc + Number(curr.credit_value || 0),
    0
  );

  const gradedSubjects = subjects.filter(
    (s) => s.grade !== null && s.grade !== undefined && s.grade !== ''
  );

  const gpa =
    gradedSubjects.length > 0
      ? (
          gradedSubjects.reduce((acc, curr) => acc + Number(curr.grade || 0), 0) /
          gradedSubjects.length
        ).toFixed(1)
      : '0.0';

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOffline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex gap-2 items-center">
          <WifiOff className="w-4 h-4" />
          Modo offline activo
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border flex gap-4">
          <Calculator className="w-8 h-8 text-blue-500" />
          <div>
            <p className="text-xs font-bold text-slate-500">GPA</p>
            <p className="text-2xl font-black">{gpa}%</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border flex gap-4">
          <BookOpen className="w-8 h-8 text-emerald-500" />
          <div>
            <p className="text-xs font-bold text-slate-500">CRÉDITOS</p>
            <p className="text-2xl font-black">{Number(totalCredits).toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border flex gap-4">
          <Hash className="w-8 h-8 text-purple-500" />
          <div>
            <p className="text-xs font-bold text-slate-500">MATERIAS</p>
            <p className="text-2xl font-black">{subjects.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="bg-indigo-900 text-white p-6">
          <h2 className="text-xl font-bold">Módulo Académico</h2>
          <p className="text-indigo-200 text-sm mt-1">
            Registro real desde student_subjects
          </p>
        </div>

        <div className="p-6">
          {subjects.length === 0 ? (
            <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
              <p className="mb-2 text-sm font-medium">
                No hay materias registradas para este estudiante en Q1 2025-2026.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {BLOCK_ORDER.map((block) => {
                const blockSubjects = groupedSubjects[block] || [];
                if (blockSubjects.length === 0) return null;

                return (
                  <div key={block}>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 border-b pb-2">
                      {block}
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="p-3">Materia</th>
                            <th className="p-3 text-center">Nota</th>
                            <th className="p-3 text-center">Estado</th>
                            <th className="p-3 text-center">Convalidación</th>
                            <th className="p-3 text-center">Créditos</th>
                            <th className="p-3 text-center">Guardar</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {blockSubjects.map((sub) => (
                            <tr key={sub.id} className="hover:bg-slate-50">
                              <td className="p-3">
                                <div className="font-medium text-slate-800">
                                  {sub.subject_name}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                  {sub.category || 'General'}
                                </div>
                              </td>

                              <td className="p-3 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={sub.grade ?? ''}
                                  onChange={(e) =>
                                    updateSubjectField(sub.id, 'grade', e.target.value)
                                  }
                                  className="w-20 text-center border border-slate-300 rounded px-2 py-1"
                                  placeholder="--"
                                />
                              </td>

                              <td className="p-3 text-center">
                                <select
                                  value={sub.approval_status || 'pending'}
                                  onChange={(e) =>
                                    updateSubjectField(sub.id, 'approval_status', e.target.value)
                                  }
                                  className="border border-slate-300 rounded px-2 py-1 bg-white"
                                >
                                  <option value="pending">Pendiente</option>
                                  <option value="submitted">Enviado</option>
                                  <option value="approved">Aprobado</option>
                                </select>
                              </td>

                              <td className="p-3 text-center">
                                {sub.convalidation_required ? (
                                  <select
                                    value={sub.convalidation_status || 'pending'}
                                    onChange={(e) =>
                                      updateSubjectField(
                                        sub.id,
                                        'convalidation_status',
                                        e.target.value
                                      )
                                    }
                                    className="border border-slate-300 rounded px-2 py-1 bg-white"
                                  >
                                    <option value="pending">Pendiente</option>
                                    <option value="in_review">En revisión</option>
                                    <option value="approved">Convalidado</option>
                                    <option value="rejected">Rechazado</option>
                                  </select>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              <td className="p-3 text-center">
                                {Number(sub.credit_value || 0).toFixed(2)}
                              </td>

                              <td className="p-3 text-center">
                                {savingId === sub.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600 mx-auto" />
                                ) : (
                                  <Save className="w-4 h-4 text-slate-400 mx-auto" />
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
          )}
        </div>
      </div>
    </div>
  );
}