import React from 'react';
import { AlertTriangle, FileText } from 'lucide-react';

export default function LegalDocuments() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-amber-900 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-amber-700" />
        </div>
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <FileText className="w-5 h-5" /> Módulo documental legacy
            </h2>
            <p className="text-sm font-bold mt-1">
              Este módulo es legacy. Los documentos oficiales se gestionan desde Administración.
            </p>
          </div>
          <p className="text-sm leading-relaxed text-amber-800">
            Para contratos, cartas de matrícula, boletines y PEI, utiliza los paneles oficiales publicados por Administración en el Portal de Padres.
            Este componente ya no genera Declaration of Enrolment, Confirmación Oficial de Matrícula ni contratos como documentos oficiales.
          </p>
        </div>
      </div>
    </div>
  );
}
