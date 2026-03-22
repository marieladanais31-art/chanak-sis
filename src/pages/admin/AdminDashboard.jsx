
import React from 'react';
import { Users, CreditCard, FileSignature, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Estudiantes', value: '2', icon: Users, color: 'bg-blue-500' },
    { label: 'Pagos Confirmados', value: '2', icon: CreditCard, color: 'bg-emerald-500' },
    { label: 'Contratos Activos', value: '2', icon: FileSignature, color: 'bg-purple-500' },
    { label: 'Inscritos', value: '2', icon: CheckCircle2, color: 'bg-indigo-500' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard General</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className={`${stat.color} p-4 flex justify-between items-center text-white`}>
                <Icon className="w-6 h-6 opacity-80" />
                <span className="text-3xl font-bold">{stat.value}</span>
              </div>
              <div className="p-4 bg-slate-50">
                <p className="font-medium text-slate-600 text-sm uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mt-8">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Resumen del Sistema</h3>
        <p className="text-slate-600">El sistema opera correctamente. Todos los indicadores principales muestran métricas positivas para el período actual.</p>
      </div>
    </div>
  );
}
