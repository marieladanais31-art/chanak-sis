
import React from 'react';

export default function HubPayments({ hubId }) {
  const payments = [
    { id: 1, student: 'Lucas Martinez', amount: '€450', status: 'Pagado', date: '01/03/2026' },
    { id: 2, student: 'Sofia Rodriguez', amount: '€450', status: 'Pendiente', date: '05/03/2026' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Pagos del Hub</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Alumno</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Monto</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Estado</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{p.student}</td>
                <td className="px-6 py-4 text-slate-600">{p.amount}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">{p.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
