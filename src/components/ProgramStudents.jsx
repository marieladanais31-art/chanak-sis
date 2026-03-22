
import React from 'react';

export default function ProgramStudents({ programId }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Alumnos del Programa</h2>
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold border border-green-200">
          Programa: {programId || 'General'}
        </span>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
        No hay alumnos registrados en este programa académico actualmente.
      </div>
    </div>
  );
}
