
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Upload, Download, FileText, Loader2, Trash2, FolderSearch, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StudentPEI({ studentId }) {
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (studentId) {
      loadPEIFiles();
    }
  }, [studentId]);

  const loadPEIFiles = async () => {
    setLoadingFiles(true);
    try {
      console.log(`[StudentPEI] Loading PEI files from bucket: pei_files for student: ${studentId}`);
      const { data, error } = await supabase.storage
        .from('pei_files')
        .list(`${studentId}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (error) throw error;
      
      const fileList = data.filter(file => file.name !== '.emptyFolderPlaceholder');
      setFiles(fileList || []);
      console.log(`[StudentPEI] Loaded ${fileList?.length || 0} files.`);
    } catch (error) {
      console.error('[StudentPEI] Error loading files:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los archivos PEI.', variant: 'destructive' });
    } finally {
      setLoadingFiles(false);
    }
  };

  const uploadPEIFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

      console.log(`[StudentPEI] Uploading to bucket 'pei_files': ${fileName}`);
      
      const { error: uploadError } = await supabase.storage
        .from('pei_files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      console.log(`[StudentPEI] Uploaded successfully.`);
      toast({ title: 'Éxito', description: 'Archivo PEI subido correctamente.' });
      loadPEIFiles();

    } catch (error) {
      console.error('[StudentPEI] Error uploading PEI:', error);
      toast({ title: 'Error', description: 'Hubo un problema al subir el archivo PEI.', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const downloadPEIFile = async (fileName) => {
    setDownloadingId(fileName);
    try {
      console.log(`[StudentPEI] Downloading from bucket 'pei_files': ${studentId}/${fileName}`);
      const { data, error } = await supabase.storage
        .from('pei_files')
        .download(`${studentId}/${fileName}`);

      if (error) throw error;

      const blobUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName.split('_').slice(1).join('_') || fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast({ title: 'Éxito', description: 'Descarga de archivo iniciada.' });
    } catch (error) {
      console.error('[StudentPEI] Error downloading PEI:', error);
      toast({ title: 'Error', description: 'No se pudo descargar el archivo PEI.', variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  const deletePEIFile = async (fileName) => {
    if (!window.confirm('¿Está seguro de eliminar este archivo?')) return;
    
    setDeletingId(fileName);
    try {
      console.log(`[StudentPEI] Deleting from bucket 'pei_files': ${studentId}/${fileName}`);
      const { error } = await supabase.storage
        .from('pei_files')
        .remove([`${studentId}/${fileName}`]);

      if (error) throw error;

      toast({ title: 'Eliminado', description: 'El archivo PEI fue eliminado correctamente.' });
      loadPEIFiles();
    } catch (error) {
      console.error('[StudentPEI] Error deleting PEI:', error);
      toast({ title: 'Error', description: 'No se pudo eliminar el archivo.', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" /> Archivos PEI
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gestión de Plan Educativo Individualizado</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer transition-colors shadow-sm">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Subiendo...' : 'Subir Archivo PEI'}
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf,.doc,.docx"
            onChange={uploadPEIFile}
            disabled={uploading}
          />
        </label>
      </div>

      <div className="p-6">
        {loadingFiles ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="font-bold">Cargando archivos PEI...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
            <FolderSearch className="w-12 h-12 text-slate-400 mb-3" />
            <span className="font-bold text-slate-600">No hay archivos PEI disponibles</span>
            <span className="text-sm">Utilice el botón superior para subir documentos al bucket "pei_files".</span>
          </div>
        ) : (
          <div className="grid gap-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-800 text-sm truncate" title={file.name}>
                      {file.name.split('_').slice(1).join('_') || file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.metadata?.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => downloadPEIFile(file.name)}
                    disabled={downloadingId === file.name}
                    className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Descargar"
                  >
                    {downloadingId === file.name ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => deletePEIFile(file.name)}
                    disabled={deletingId === file.name}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    {deletingId === file.name ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="px-6 pb-6 text-xs text-slate-400 flex items-center gap-1.5">
        <AlertCircle className="w-4 h-4" /> 
        <span>Operaciones realizadas sobre el bucket <strong className="text-slate-600 font-mono">pei_files</strong>.</span>
      </div>
    </div>
  );
}
