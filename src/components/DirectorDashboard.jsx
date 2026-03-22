
import React from 'react';
import { MapPin, Users, CreditCard, ShieldCheck } from 'lucide-react';

export default function DirectorDashboard({ hubId }) {
  const stats = [
    { label: 'Alumnos del Hub', value: '85', icon: Users, color: 'border-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pagos al Día', value: '72', icon: CreditCard, color: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Inscritos Formales', value: '80', icon: ShieldCheck, color: 'border-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Hub Activo', value: 'Sí', icon: MapPin, color: 'border-amber-600', text: 'text-amber-700', bg: 'bg-amber-100' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Panel del Director</h2>
        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold border border-amber-200">
          Hub ID: {hubId || 'No Asignado'}
        </span>
      </div>

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
    </div>
  );
}
