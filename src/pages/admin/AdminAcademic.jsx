
import React from 'react';
import { BookOpen, FileCheck, FileBarChart } from 'lucide-react';

export default function AdminAcademic() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Gestión Académica</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Programas Activos</h3>
          <p className="text-slate-500 text-sm mt-2">2 programas curriculares asignados actualmente en el sistema.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
            <FileCheck className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Evaluaciones Completadas</h3>
          <p className="text-slate-500 text-sm mt-2">Registro al día de PACES y evaluaciones enviadas por tutores.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <FileBarChart className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Reportes Disponibles</h3>
          <p className="text-slate-500 text-sm mt-2">Los boletines de calificaciones están generados y listos para descargar.</p>
        </div>
      </div>
    </div>
  );
}
