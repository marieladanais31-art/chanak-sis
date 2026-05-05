import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Plus, Eye } from 'lucide-react';
import EnrollmentLetterManager from '@/components/EnrollmentLetterManager';

const STATUS_BADGE = {
  draft:     'bg-slate-100 text-slate-700',
  sent:      'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-800',
  archived:  'bg-slate-200 text-slate-600',
};
const STATUS_LABEL = {
  draft: 'Borrador', sent: 'Enviado', published: 'Publicado', archived: 'Archivado',
};

export default function AdminCartas() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [letters, setLetters]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null); // { studentId, studentName, letterId }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studRes, letRes] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name, grade_level').order('first_name'),
        supabase.from('enrollment_letters')
          .select('id, student_id, school_year, status, updated_at')
          .order('updated_at', { ascending: false }),
      ]);
      if (studRes.error) throw studRes.error;
      setStudents(studRes.data || []);
      setLetters(letRes.data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo cargar la lista.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getLetter = (studentId) => letters.find(l => l.student_id === studentId);

  const open = (student, letter) => setSelected({
    studentId: student.id,
    studentName: `${student.first_name} ${student.last_name}`,
    letterId: letter?.id || null,
  });

  const handleClose = () => { setSelected(null); load(); };

  if (selected) return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <EnrollmentLetterManager
        studentId={selected.studentId}
        studentName={selected.studentName}
        letterId={selected.letterId}
        canEdit={true}
        onClose={handleClose}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Mail className="w-5 h-5 text-teal-600" /> Cartas de Confirmación de Matrícula
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">Gestión y publicación de cartas de confirmación para las familias</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Estudiante</th>
                <th className="p-4">Grado</th>
                <th className="p-4">Año</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => {
                const letter = getLetter(student.id);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                    <td className="p-4 text-slate-500 text-xs">{student.grade_level || '—'}</td>
                    <td className="p-4 text-slate-500 text-xs">{letter?.school_year || '—'}</td>
                    <td className="p-4">
                      {letter ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[letter.status] || 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABEL[letter.status] || letter.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin carta</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => open(student, letter)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border ${
                          letter
                            ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {letter ? <Eye className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {letter ? 'Ver / Editar' : 'Crear carta'}
                      </button>
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
