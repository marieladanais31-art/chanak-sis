
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Upload, Save, Info, Image as ImageIcon, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import InstitutionalSettings from '@/components/InstitutionalSettings';

export default function AdminConfiguracion() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [configTab, setConfigTab] = useState('general'); // 'general' | 'institucional'
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(localStorage.getItem('app_logo') || '');

  useEffect(() => {
    // Read from profiles table on component mount to ensure it persists
    const loadProfileData = async () => {
      if (profile?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', profile.id)
            .single();
            
          if (!error && data) {
            setForm({
              first_name: data.first_name || '',
              last_name: data.last_name || ''
            });
          }
        } catch (err) {
          console.error("Error loading profile settings", err);
        }
      }
    };
    
    loadProfileData();
  }, [profile]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let logoUrl = logoPreview;

      // Upload new logo if selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, { upsert: true });
          
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(fileName);
          logoUrl = publicUrl;
        } else {
          console.error('Error uploading logo:', uploadError);
        }
      }

      // Update admin profile
      if (profile?.id) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ first_name: form.first_name, last_name: form.last_name })
          .eq('id', profile.id);

        if (updateError) throw updateError;
      }

      // Save logo to localStorage and dispatch event
      if (logoUrl) {
        localStorage.setItem('app_logo', logoUrl);
        window.dispatchEvent(new Event('logo-updated'));
      }

      toast({ title: 'Éxito', description: 'Configuración guardada correctamente en el sistema.' });
    } catch (err) {
      console.error('Error saving config:', err);
      toast({ title: 'Error', description: 'No se pudo guardar la configuración.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configuración</h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Ajustes globales y personalización</p>
      </div>

      {/* Config tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-fit">
        <button
          onClick={() => setConfigTab('general')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${configTab === 'general' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          Perfil y Logo
        </button>
        <button
          onClick={() => setConfigTab('institucional')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${configTab === 'institucional' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Building className="w-3.5 h-3.5" /> Datos Institucionales
        </button>
      </div>

      {configTab === 'institucional' && <InstitutionalSettings />}
      {configTab === 'general' && (
        <>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-blue-800 mb-6">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">Información Importante</h4>
          <p className="text-sm mt-1">Los cambios realizados en el logo se aplican en toda la plataforma y persisten entre sesiones para todos los usuarios. Asegúrese de subir un logo con buena resolución (PNG, JPG o SVG).</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Datos del Administrador</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={e => setForm({...form, first_name: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  placeholder="Ej. Admin"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Apellidos</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={e => setForm({...form, last_name: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white"
                  placeholder="Ej. Chanak"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Branding de la Plataforma</h3>
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <span className="text-xs font-medium">Sin Logo</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-3">
                <label className="block text-sm font-bold text-slate-700">Logo Institucional</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <label 
                  htmlFor="logo-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-sm font-bold text-slate-700 cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Seleccionar Imagen
                </label>
                <p className="text-xs text-slate-500 font-medium">
                  Recomendado: Imagen cuadrada o rectangular con fondo transparente. Tamaño máximo 2MB.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </div>
        </>
      )}
    </div>
  );
}
