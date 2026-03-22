
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckSquare } from 'lucide-react';

export default function PEIValidation() {
  const peis = [
    { id: 1, student: 'Anais Vidal', program: 'Arts', status: 'Pendiente de Validación' },
    { id: 2, student: 'Daniel Vidal', program: 'STEM', status: 'Validado' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Validación de PEI</h2>
      <div className="grid gap-4">
        {peis.map(pei => (
          <div key={pei.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">{pei.student}</h3>
              <p className="text-sm text-slate-500">Programa: {pei.program}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pei.status === 'Validado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {pei.status}
              </span>
              {pei.status !== 'Validado' && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckSquare className="w-4 h-4 mr-2" /> Validar
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
