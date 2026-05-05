import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ScrollText, Plus, Eye, FileText } from 'lucide-react';
import TranscriptGenerator from '@/components/TranscriptGenerator';
import AnnualTranscriptView from '@/components/AnnualTranscriptView';

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
  const [students, setStudents]     = useState([]);
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [viewMode, setViewMode]     = useState('trimestral');
  const [selected, setSelected]     = useState(null);
  const [annualStudent, setAnnualStudent] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studRes, trRes] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name, grade_level, student_status').order('first_name'),
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
  const countTranscripts = (studentId) => transcripts.filter(t => t.student_id === studentId).length;

  const openQuarterly = (student, tr) => setSelected({
    studentId: student.id,
    studentName: `${student.first_name} ${student.last_name}`,
    transcriptId: tr?.id || null,
  });

  const openAnnual = (student) => setAnnualStudent({
    studentId: student.id,
    studentName: `${student.first_name} ${student.last_name}`,
  });

  const handleClose = () => { setSelected(null); setAnnualStudent(null); load(); };

  if (selected) return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <TranscriptGenerator
        studentId={selected.studentId}
        studentName={selected.studentName}
        transcriptId={selected.transcriptId}
        canEdit
        onClose={handleClose}
      />
    </div>
  );

  if (annualStudent) return (
    <AnnualTranscriptView
      studentId={annualStudent.studentId}
      studentName={annualStudent.studentName}
      onClose={handleClose}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setViewMode('trimestral')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'trimestral' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <ScrollText className="w-4 h-4" />
          Boletines por Trimestre
        </button>
        <button
          onClick={() => setViewMode('anual')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'anual' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <FileText className="w-4 h-4" />
          Transcript Anual Acumulado
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              {viewMode === 'trimestral'
                ? <><ScrollText className="w-5 h-5 text-blue-600" /> Boletines por Trimestre</>
                : <><FileText className="w-5 h-5 text-indigo-600" /> Transcript Oficial Acumulado</>
              }
            </h3>
            {viewMode === 'anual' && (
              <p className="text-xs text-slate-500 mt-1">
                Historial académico completo por asignatura y año. Formato estilo King of Kings / ACE oficial.
              </p>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left">Estudiante</th>
                <th className="px-5 py-3 text-left">Grado</th>
                {viewMode === 'trimestral' ? (
                  <>
                    <th className="px-5 py-3 text-center">Boletines</th>
                    <th className="px-5 py-3 text-center">Último estado</th>
                    <th className="px-5 py-3 text-center">Acción</th>
                  </>
                ) : (
                  <>
                    <th className="px-5 py-3 text-center">Trimestres registrados</th>
                    <th className="px-5 py-3 text-center">Ver Transcript</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students
                .filter(s => !s.student_status || s.student_status === 'active')
                .map(student => {
                  const latestTr = getTranscript(student.id);
                  const count = countTranscripts(student.id);

                  if (viewMode === 'trimestral') return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{student.grade_level || '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-xs">{count}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        {latestTr ? (
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${STATUS_BADGE[latestTr.status] || STATUS_BADGE.draft}`}>
                            {latestTr.quarter} · {STATUS_LABEL[latestTr.status] || latestTr.status}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Sin boletín</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => openQuarterly(student, latestTr)}
                          className="flex items-center gap-1.5 mx-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          {latestTr ? <Eye className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                          {latestTr ? 'Ver / Editar' : 'Nuevo boletín'}
                        </button>
                      </td>
                    </tr>
                  );

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{student.grade_level || '—'}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-bold text-xs">
                          {count} trimestre{count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => openAnnual(student)}
                          className="flex items-center gap-1.5 mx-auto px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          <FileText className="w-3 h-3" /> Ver Transcript
                        </button>
                      </td>
                    </tr>
                  );
                })}
              {students.filter(s => !s.student_status || s.student_status === 'active').length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-400 font-medium">No hay estudiantes activos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
