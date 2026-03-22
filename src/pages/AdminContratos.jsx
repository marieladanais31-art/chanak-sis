
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, FileSignature, Download, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function AdminContratos() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('students').select('id, first_name, last_name').order('first_name');
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Error al cargar datos.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    toast({ title: 'En desarrollo', description: '🚧 This feature isn\'t implemented yet—but don\'t worry! You can request it in your next prompt! 🚀' });
  };

  const terms = [
    "Aceptación de Modelo Educativo", "Compromiso de Supervisión Parental", "Reporte de Calificaciones", 
    "Integridad Académica", "Uso de Plataforma Digital", "Pagos y Matrícula", 
    "Documentación Requerida", "Privacidad y Datos Personales", "Derechos de Imagen", 
    "Certificación Internacional", "Código de Conducta", "Material Educativo", 
    "Vigencia del Contrato", "Resolución de Conflictos"
  ];

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Contratos y Términos</h2>
        <Button onClick={() => setShowTerms(!showTerms)} variant="outline" className="text-slate-700 bg-white">
          <Eye className="w-4 h-4 mr-2" /> {showTerms ? 'Ocultar Términos' : 'Ver Términos (14 Puntos)'}
        </Button>
      </div>

      {showTerms && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">14 Puntos del Contrato</h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-600">
            {terms.map((term, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{i+1}</span>
                {term}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 font-bold">
            <tr>
              <th className="p-4">Estudiante</th>
              <th className="p-4">Estado Contrato</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map(student => (
              <tr key={student.id} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                <td className="p-4">
                  <span className="flex items-center gap-2 text-slate-500 font-medium text-xs bg-slate-100 px-2 py-1 rounded w-fit">
                    <FileSignature className="w-3 h-3" /> Pendiente de Firma
                  </span>
                </td>
                <td className="p-4 text-right">
                  <Button onClick={handleAction} variant="outline" size="sm" className="h-8 text-blue-600">
                    <Download className="w-4 h-4 mr-2" /> Descargar PDF
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
