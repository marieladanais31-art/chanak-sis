
import React from 'react';
import { Users, FileSignature, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdmissionsDashboard() {
  const stats = [
    { label: 'Prospectos Totales', value: '142', icon: Users, color: 'border-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Nuevas Inscripciones', value: '38', icon: FileSignature, color: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Tasa de Conversión', value: '26.7%', icon: TrendingUp, color: 'border-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pendientes Revisión', value: '15', icon: Clock, color: 'border-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Panel de Admisiones</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`bg-white rounded-xl shadow-sm border-l-4 border-y border-r border-slate-200 p-6 flex items-center justify-between ${stat.color}`}>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <h3 className={`text-3xl font-black ${stat.text}`}>{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <Icon className={`w-6 h-6 ${stat.text}`} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Acciones de Admisión</h3>
        <div className="flex gap-4">
          <Button className="bg-purple-600 hover:bg-purple-700">Registrar Prospecto</Button>
          <Button variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">Enviar Recordatorios</Button>
        </div>
      </div>
    </div>
  );
}
