
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Upload, FileText, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function AdminPEI() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('students').select('id, first_name, last_name, pei_url').order('first_name');
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      toast({ title: 'Error', description: 'Error al cargar estudiantes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, studentId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(studentId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('pei_files').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('pei_files').getPublicUrl(filePath);

      const { error: updateError } = await supabase.from('students').update({ pei_url: publicUrl }).eq('id', studentId);
      if (updateError) throw updateError;

      toast({ title: 'Éxito', description: 'Archivo PEI subido correctamente.' });
      loadStudents();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'No se pudo subir el archivo.', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestión de PEI (Plan Educativo Individualizado)</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 font-bold">
            <tr>
              <th className="p-4">Estudiante</th>
              <th className="p-4">Estado PEI</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map(student => (
              <tr key={student.id} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                <td className="p-4">
                  {student.pei_url ? (
                    <span className="flex items-center gap-2 text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-1 rounded w-fit">
                      <FileText className="w-3 h-3" /> Subido
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs bg-slate-100 px-2 py-1 rounded">Pendiente</span>
                  )}
                </td>
                <td className="p-4 text-right flex items-center justify-end gap-2">
                  {student.pei_url && (
                    <a href={student.pei_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                      <Button variant="outline" size="sm" className="h-8">
                        <Download className="w-4 h-4 mr-2" /> Ver PEI
                      </Button>
                    </a>
                  )}
                  <div className="relative">
                    <Button variant="outline" size="sm" className="h-8 relative overflow-hidden" disabled={uploading === student.id}>
                      {uploading === student.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      {uploading === student.id ? 'Subiendo...' : 'Subir Archivo'}
                      <input 
                        type="file" 
                        accept=".pdf,.doc,.docx" 
                        onChange={(e) => handleFileUpload(e, student.id)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
