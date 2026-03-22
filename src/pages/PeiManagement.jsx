
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Upload, 
  Link as LinkIcon, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Trash2,
  Users
} from 'lucide-react';
import { Helmet } from 'react-helmet';

export default function PeiManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [currentPei, setCurrentPei] = useState(null);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'link'
  const [file, setFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredStudents(students);
    } else {
      const lower = search.toLowerCase();
      setFilteredStudents(
        students.filter(
          s => 
            s.first_name?.toLowerCase().includes(lower) || 
            s.last_name?.toLowerCase().includes(lower) ||
            s.email?.toLowerCase().includes(lower)
        )
      );
    }
  }, [search, students]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, us_grade_level')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los estudiantes.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudentPei = async (studentId) => {
    try {
      setCurrentPei(null);
      setFile(null);
      setLinkUrl('');
      
      const { data, error } = await supabase
        .from('document_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('document_type', 'pei')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      setCurrentPei(data || null);
    } catch (error) {
      console.error('Error loading PEI:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el estado del PEI.',
        variant: 'destructive'
      });
    }
  };

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    loadStudentPei(student.id);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf') {
      toast({
        title: 'Formato inválido',
        description: 'Solo se permiten archivos PDF.',
        variant: 'destructive'
      });
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      toast({
        title: 'Archivo demasiado grande',
        description: 'El tamaño máximo es de 10MB.',
        variant: 'destructive'
      });
      return;
    }

    setFile(selected);
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    
    let finalUrl = '';

    if (uploadMode === 'link') {
      if (!linkUrl.trim()) {
        toast({ title: 'Error', description: 'Debe ingresar un enlace válido.', variant: 'destructive' });
        return;
      }
      if (!/^https?:\/\//i.test(linkUrl)) {
        toast({ title: 'Error', description: 'El enlace debe comenzar con http:// o https://', variant: 'destructive' });
        return;
      }
      finalUrl = linkUrl.trim();
    } else {
      if (!file) {
        toast({ title: 'Error', description: 'Debe seleccionar un archivo PDF.', variant: 'destructive' });
        return;
      }
    }

    setSaving(true);
    try {
      if (uploadMode === 'file') {
        const fileExt = file.name.split('.').pop();
        const fileName = `pei-${selectedStudent.id}-${Date.now()}.${fileExt}`;
        const filePath = `${selectedStudent.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pei-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('pei-documents')
          .getPublicUrl(filePath);

        finalUrl = publicUrlData.publicUrl;
      }

      const docData = {
        student_id: selectedStudent.id,
        document_type: 'pei',
        title: 'PEI',
        file_url: finalUrl,
        updated_at: new Date().toISOString()
      };

      if (currentPei?.id) {
        const { error } = await supabase
          .from('document_records')
          .update(docData)
          .eq('id', currentPei.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('document_records')
          .insert([{ ...docData, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      toast({
        title: 'PEI guardado',
        description: 'El documento ha sido actualizado correctamente.',
      });

      setFile(null);
      setLinkUrl('');
      loadStudentPei(selectedStudent.id);
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al guardar el PEI.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentPei || !window.confirm('¿Está seguro de eliminar este PEI? Esta acción no se puede deshacer.')) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('document_records')
        .delete()
        .eq('id', currentPei.id);
        
      if (error) throw error;

      toast({
        title: 'PEI eliminado',
        description: 'El registro ha sido borrado correctamente.',
      });
      
      setCurrentPei(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el PEI.',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Gestión de PEI | Chanak Academy</title>
      </Helmet>
      
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans flex flex-col md:flex-row gap-6">
        
        {/* Sidebar - Student List */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-[rgb(25,61,109)]" /> Estudiantes
            </h2>
            <div className="relative mt-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[rgb(25,61,109)]/20"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-[rgb(25,61,109)]" />
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center p-8 text-slate-500 text-sm">
                No se encontraron estudiantes.
              </div>
            ) : (
              filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex flex-col gap-1 ${
                    selectedStudent?.id === student.id 
                      ? 'bg-[rgb(25,61,109)]/5 border border-[rgb(25,61,109)]/20' 
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <span className={`font-semibold ${selectedStudent?.id === student.id ? 'text-[rgb(25,61,109)]' : 'text-slate-700'}`}>
                    {student.first_name} {student.last_name}
                  </span>
                  <span className="text-xs text-slate-500 truncate">
                    Nivel: {student.us_grade_level || 'N/A'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Main Content - PEI Manager */}
        <div className="flex-1 flex flex-col">
          {!selectedStudent ? (
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center p-12">
              <FileText className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">Gestión de PEI</h3>
              <p className="text-slate-500 max-w-sm">
                Seleccione un estudiante de la lista para gestionar su Plan Educativo Individualizado (PEI).
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 animate-in fade-in duration-300">
              
              <div className="p-6 border-b border-slate-200 bg-[rgb(25,61,109)]/5">
                <h2 className="text-2xl font-black text-[rgb(25,61,109)]">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">
                  Plan Educativo Individualizado
                </p>
              </div>

              <div className="p-6 space-y-8">
                {/* Current Status */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">Estado Actual</h3>
                  {currentPei ? (
                    <div className="flex items-start justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5" />
                        <div>
                          <p className="font-bold text-emerald-800">PEI Registrado</p>
                          <p className="text-sm text-emerald-600 mt-1">
                            Última actualización: {new Date(currentPei.updated_at || currentPei.created_at).toLocaleDateString()}
                          </p>
                          <a 
                            href={currentPei.file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-800 mt-2 underline"
                          >
                            Ver documento actual
                          </a>
                        </div>
                      </div>
                      <button 
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center"
                        title="Eliminar PEI"
                      >
                        {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                      <div>
                        <p className="font-bold text-amber-800">Sin PEI</p>
                        <p className="text-sm text-amber-700">Este estudiante no tiene un documento registrado actualmente.</p>
                      </div>
                    </div>
                  )}
                </div>

                <hr className="border-slate-100" />

                {/* Upload Section */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">
                    {currentPei ? 'Actualizar Documento' : 'Subir Nuevo Documento'}
                  </h3>
                  
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setUploadMode('file')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
                        uploadMode === 'file' 
                          ? 'bg-[rgb(25,61,109)] text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Upload className="w-4 h-4" /> Subir Archivo
                    </button>
                    <button
                      onClick={() => setUploadMode('link')}
                      className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${
                        uploadMode === 'link' 
                          ? 'bg-[rgb(25,61,109)] text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4" /> Enlace Externo
                    </button>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    {uploadMode === 'file' ? (
                      <div className="space-y-4">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 text-slate-400 mb-2" />
                            <p className="text-sm text-slate-500 font-medium">Click para seleccionar PDF (Max 10MB)</p>
                          </div>
                          <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                        </label>
                        {file && (
                          <div className="flex items-center justify-between p-3 bg-white border border-[rgb(25,61,109)]/20 rounded-lg">
                            <span className="text-sm font-medium text-[rgb(25,61,109)] truncate">{file.name}</span>
                            <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">URL del Documento</label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-[rgb(25,61,109)]"
                        />
                        <p className="text-xs text-slate-500">Asegúrese de que el enlace sea público y accesible.</p>
                      </div>
                    )}
                    
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSave}
                        disabled={saving || (uploadMode === 'file' && !file) || (uploadMode === 'link' && !linkUrl)}
                        className="px-6 py-2.5 bg-[rgb(25,61,109)] hover:bg-[#122e54] text-white font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
