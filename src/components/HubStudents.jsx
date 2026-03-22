
import React from 'react';

export default function HubStudents({ hubId }) {
  const students = [
    { id: 1, name: 'Lucas Martinez', grade: '3º ESO', status: 'Enrolled', payment: 'Pagado' },
    { id: 2, name: 'Sofia Rodriguez', grade: '1º Bachillerato', status: 'Pending', payment: 'Pendiente' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Alumnos del Hub</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Nombre</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Grado</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Estado</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{s.name}</td>
                <td className="px-6 py-4 text-slate-600">{s.grade}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${s.status === 'Enrolled' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${s.payment === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {s.payment}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
