
import React from 'react';
import { Settings, Save, Globe, Bell, Shield, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettings() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configuración",
      description: "La función de guardado estará disponible próximamente.",
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            Configuración del Sistema
          </h2>
          <p className="text-sm text-slate-500 mt-1">Administra los parámetros generales de la plataforma</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed shadow-sm"
        >
          <Save className="w-4 h-4" />
          Guardar Cambios
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Globe className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Configuración General</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Nombre de la Institución</label>
              <input 
                type="text" 
                disabled 
                value="Chanak Academy" 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm font-medium cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Correo de Contacto</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  disabled 
                  value="admin@chanakacademy.org" 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Sistema</h3>
        </div>
        <div className="p-6 space-y-4">
          
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
            <div>
              <p className="text-sm font-bold text-slate-800">Modo de Mantenimiento</p>
              <p className="text-xs text-slate-500 mt-1">Deshabilita el acceso temporalmente.</p>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed opacity-50">
              <input type="checkbox" disabled className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-slate-400 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-slate-800">Notificaciones Activas</p>
                <p className="text-xs text-slate-500 mt-1">Habilita correos automáticos.</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-not-allowed opacity-50">
              <input type="checkbox" disabled checked readOnly className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

        </div>
      </div>
      
    </div>
  );
}
