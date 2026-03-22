
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AdminSettings() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: 'Configuración Guardada', description: 'Los cambios se han aplicado exitosamente.' });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold text-slate-800">Configuración del Sistema</h2>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Información de la Academia</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Institucional</label>
              <input type="text" defaultValue="Chanak International Academy" className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">FDOE Code</label>
              <input type="text" defaultValue="134620" className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" readOnly />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Florida Corporation Number</label>
              <input type="text" defaultValue="N25000012528" className="w-full px-4 py-2 border rounded-lg bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none" readOnly />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4">Información del Director</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
              <input type="text" defaultValue="Mariela Andrade" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cargo / Título</label>
              <input type="text" defaultValue="Head of School" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800" />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
