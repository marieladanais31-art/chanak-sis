import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ScrollText, Plus, Eye } from 'lucide-react';
import TranscriptGenerator from '@/components/TranscriptGenerator';

const STATUS_BADGE = {
  draft:     'bg-slate-100 text-slate-700',
  in_review: 'bg-amber-100 text-amber-800',
  approved:  'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
};
const STATUS_LABEL = {
  draft: 'Borrador', in_review: 'En revisión', approved: 'Aprobado', published: 'Publicado',
};

export default function AdminBoletines() {
  const { toast } = useToast();
  const [students, setStudents]   = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null); // { studentId, studentName, transcriptId }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studRes, trRes] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name, grade_level').order('first_name'),
        supabase.from('transcript_records')
          .select('id, student_id, school_year, quarter, language, status, updated_at')
          .order('updated_at', { ascending: false }),
      ]);
      if (studRes.error) throw studRes.error;
      setStudents(studRes.data || []);
      setTranscripts(trRes.data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo cargar la lista.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getTranscript = (studentId) => transcripts.find(t => t.student_id === studentId);

  const open = (student, tr) => setSelected({
    studentId: student.id,
    studentName: `${student.first_name} ${student.last_name}`,
    transcriptId: tr?.id || null,
  });

  const handleClose = () => { setSelected(null); load(); };

  if (selected) return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <TranscriptGenerator
        studentId={selected.studentId}
        studentName={selected.studentName}
        transcriptId={selected.transcriptId}
        canEdit={true}
        onClose={handleClose}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-teal-600" /> Boletines Académicos
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">Gestión y publicación de reportes trimestrales</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="p-4">Estudiante</th>
                <th className="p-4">Grado</th>
                <th className="p-4">Boletín</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => {
                const tr = getTranscript(student.id);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                    <td className="p-4 text-slate-500 text-xs">{student.grade_level || '—'}</td>
                    <td className="p-4 text-slate-500 text-xs">
                      {tr ? `${tr.school_year} · ${tr.quarter} · ${tr.language?.toUpperCase() || 'ES'}` : '—'}
                    </td>
                    <td className="p-4">
                      {tr ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[tr.status] || 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABEL[tr.status] || tr.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin boletín</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => open(student, tr)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border ${
                          tr
                            ? 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {tr ? <Eye className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {tr ? 'Ver / Editar' : 'Crear boletín'}
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
