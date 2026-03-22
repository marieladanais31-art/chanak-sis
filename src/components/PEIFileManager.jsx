
import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Upload, Download, FileText, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PEIFileManager({ studentId, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}_${Date.now()}.${fileExt}`;

      console.log(`Uploading PEI to bucket 'pei_files': ${fileName}`);
      
      const { error: uploadError } = await supabase.storage
        .from('pei_files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('pei_files')
        .getPublicUrl(fileName);

      console.log(`Uploaded successfully. URL:`, publicUrlData.publicUrl);

      // Save to students table
      const { error: dbError } = await supabase
        .from('students')
        .update({ pei_url: publicUrlData.publicUrl })
        .eq('id', studentId);

      if (dbError) throw dbError;

      toast({ title: 'Éxito', description: 'Archivo PEI subido correctamente.' });
      if (onUpdate) onUpdate(publicUrlData.publicUrl);

    } catch (error) {
      console.error('Error uploading PEI:', error);
      toast({ title: 'Error', description: 'No se pudo subir el archivo PEI. Verifica el bucket "pei_files".', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (url) => {
    if (!url) return;
    setDownloading(true);
    try {
      // Extract filename from the URL assuming standard supabase storage structure
      const fileName = url.split('/').pop();
      console.log(`Downloading PEI from bucket 'pei_files': ${fileName}`);

      const { data, error } = await supabase.storage
        .from('pei_files')
        .download(fileName);

      if (error) throw error;

      // Create download link
      const blobUrl = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast({ title: 'Éxito', description: 'Descarga iniciada.' });
    } catch (error) {
      console.error('Error downloading PEI:', error);
      toast({ title: 'Error', description: 'No se pudo descargar el archivo PEI desde "pei_files".', variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-blue-600" /> Gestión de Archivo PEI
      </h3>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold cursor-pointer hover:bg-blue-100 transition-colors">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Subiendo...' : 'Subir PEI'}
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf,.doc,.docx"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        
        <button 
          onClick={() => handleDownload('dummy_url_placeholder')} // Needs actual URL passed in real scenario
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Descargar PEI
        </button>
      </div>
      <p className="text-xs text-slate-500 mt-2">Los archivos se guardan en el bucket <strong>pei_files</strong>.</p>
    </div>
  );
}
