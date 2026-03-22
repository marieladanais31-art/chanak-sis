
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { FileSignature, Loader2, CheckCircle, XCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminContracts() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: stdData } = await supabase.from('students').select('id, first_name, last_name, parent_id, hub_id');
      const parentIds = (stdData || []).map(s => s.parent_id).filter(Boolean);
      
      let profilesData = [];
      if (parentIds.length > 0) {
        const { data: profData } = await supabase.from('profiles').select('id, first_name, last_name').in('id', parentIds);
        profilesData = profData || [];
      }
      
      const { data: hubsData } = await supabase.from('organizations').select('id, name').eq('type', 'hub');
      const { data: contractsData } = await supabase.from('contracts').select('student_id, status, parent_signed_at');

      const enriched = (stdData || []).map(s => {
        const parent = profilesData.find(p => p.id === s.parent_id);
        const hub = (hubsData || []).find(h => h.id === s.hub_id);
        const contract = (contractsData || []).find(c => c.student_id === s.id);
        return {
          ...s,
          parent_name: parent ? `${parent.first_name || ''} ${parent.last_name || ''}`.trim() : 'No asignado',
          hub_name: hub ? hub.name : 'Sin Hub',
          is_signed: !!(contract?.parent_signed_at || contract?.status === 'signed')
        };
      });
      setStudents(enriched);
    } catch (err) {
      toast({ title: 'Error', description: 'Error al cargar datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDossier = (student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleSign = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('contracts').upsert({
        student_id: selectedStudent.id,
        family_id: selectedStudent.parent_id || selectedStudent.id,
        contract_type: 'dossier_14',
        status: 'signed',
        parent_signed_at: new Date().toISOString()
      }, { onConflict: 'student_id, contract_type' });
      
      if (error) {
         await supabase.from('contracts').insert({
          student_id: selectedStudent.id,
          family_id: selectedStudent.parent_id || selectedStudent.id,
          contract_type: 'dossier_14',
          status: 'signed',
          parent_signed_at: new Date().toISOString()
        });
      }
      toast({ title: 'Éxito', description: 'Dossier firmado correctamente' });
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo firmar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const legalPoints = [
    "Aceptación de Modelo Educativo P.A.C.E.S.",
    "Compromiso de Supervisión Activa del Tutor",
    "Reporte Periódico de Calificaciones",
    "Mantenimiento de Integridad Académica",
    "Uso Adecuado de la Plataforma SIS",
    "Responsabilidad en el Cumplimiento de Pagos",
    "Provisión de Documentación Requerida",
    "Aceptación de Políticas de Privacidad",
    "Cesión de Derechos de Imagen Institucional",
    "Condiciones para Certificación Internacional",
    "Adhesión al Código de Conducta",
    "Cuidado y Gestión de Material Académico",
    "Vigencia y Renovación de Matrícula",
    "Protocolo de Resolución de Conflictos"
  ];

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FileSignature className="w-6 h-6 text-blue-600" /> Contratos y Dossier
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map(student => (
          <div key={student.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-slate-800">{student.first_name} {student.last_name}</h3>
              {student.is_signed ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-400" />}
            </div>
            <p className="text-sm text-slate-500 mb-1">Padre/Tutor: <span className="font-medium text-slate-700">{student.parent_name}</span></p>
            <p className="text-sm text-slate-500 mb-5">Hub: {student.hub_name}</p>
            <button onClick={() => openDossier(student)} className="mt-auto w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-lg text-sm font-semibold transition-colors">
              Ver Dossier
            </button>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800">Dossier de 14 Puntos Legales</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-slate-700 text-sm">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                <p>Estudiante: <strong>{selectedStudent?.first_name} {selectedStudent?.last_name}</strong></p>
                <p>Tutor: <strong>{selectedStudent?.parent_name}</strong></p>
                <p>Estado: <strong>{selectedStudent?.is_signed ? 'Firmado' : 'Pendiente de firma'}</strong></p>
              </div>
              <div className="space-y-3">
                {legalPoints.map((pt, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                    <p className="pt-0.5">{pt}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-3 bg-slate-50 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium bg-white">Cerrar</button>
              {!selectedStudent?.is_signed && (
                <button onClick={handleSign} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50">
                  {saving ? 'Firmando...' : 'Firmar Dossier'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
