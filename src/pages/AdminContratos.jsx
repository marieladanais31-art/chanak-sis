import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileSignature, Plus, Eye } from 'lucide-react';
import ContractManager from '@/components/ContractManager';

const STATUS_BADGE = {
  draft:    'bg-slate-100 text-slate-700',
  sent:     'bg-amber-100 text-amber-800',
  signed:   'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-slate-200 text-slate-600',
};
const STATUS_LABEL = {
  draft: 'Borrador', sent: 'Enviado', signed: 'Firmado', published: 'Publicado', archived: 'Archivado',
};

export default function AdminContratos() {
  const { toast } = useToast();
  const [students, setStudents]     = useState([]);
  const [contracts, setContracts]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null); // { studentId, studentName, contractId }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [studRes, conRes] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name, grade_level').order('first_name'),
        supabase.from('enrollment_contracts')
          .select('id, student_id, school_year, status, updated_at')
          .order('updated_at', { ascending: false }),
      ]);
      if (studRes.error) throw studRes.error;
      setStudents(studRes.data || []);
      setContracts(conRes.data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo cargar la lista.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getContract = (studentId) => contracts.find(c => c.student_id === studentId);

  const open = (student, contract) => setSelected({
    studentId: student.id,
    studentName: `${student.first_name} ${student.last_name}`,
    contractId: contract?.id || null,
  });

  const handleClose = () => { setSelected(null); load(); };

  if (selected) return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <ContractManager
        studentId={selected.studentId}
        studentName={selected.studentName}
        contractId={selected.contractId}
        canEdit={true}
        onClose={handleClose}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-blue-600" /> Contratos de Matrícula
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">Gestión de contratos de matrícula y servicios educativos</p>
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
                <th className="p-4">Año</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => {
                const con = getContract(student.id);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                    <td className="p-4 text-slate-500 text-xs">{student.grade_level || '—'}</td>
                    <td className="p-4 text-slate-500 text-xs">{con?.school_year || '—'}</td>
                    <td className="p-4">
                      {con ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_BADGE[con.status] || 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABEL[con.status] || con.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Sin contrato</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => open(student, con)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors border ${
                          con
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {con ? <Eye className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {con ? 'Ver / Editar' : 'Crear contrato'}
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
