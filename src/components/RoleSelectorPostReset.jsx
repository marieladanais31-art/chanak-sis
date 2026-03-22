
import React from 'react';
import { Shield, BookOpen, Users, GraduationCap, Briefcase, CheckCircle2 } from 'lucide-react';

const SYSTEM_ROLES = [
  { id: 'parent', label: 'Parent / Familia', desc: 'Acceso a hijos y portal familiar', icon: Users, color: 'text-blue-700 bg-blue-50 border-blue-200 ring-blue-400' },
  { id: 'student', label: 'Student / Alumno', desc: 'Acceso a progreso propio', icon: GraduationCap, color: 'text-pink-700 bg-pink-50 border-pink-200 ring-pink-400' },
  { id: 'coordinador', label: 'Coordinador', desc: 'Gestión académica PEI', icon: BookOpen, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 ring-emerald-400' },
  { id: 'admisiones', label: 'Admisiones', desc: 'Inscripciones y matrículas', icon: Briefcase, color: 'text-purple-700 bg-purple-50 border-purple-200 ring-purple-400' },
  { id: 'director', label: 'Director Hub', desc: 'Administración de sede', icon: Shield, color: 'text-amber-700 bg-amber-50 border-amber-200 ring-amber-400' }
];

export default function RoleSelectorPostReset({ value, onChange }) {
  const selectedRole = SYSTEM_ROLES.find(r => r.id === value);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Asignación de Rol Único</h3>
          <p className="text-xs text-slate-500">Seleccione solo un rol para la cuenta</p>
        </div>
        {selectedRole && (
          <div className="flex items-center gap-1.5 text-sm px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-bold border border-indigo-200">
            <CheckCircle2 className="w-4 h-4" />
            {selectedRole.label}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {SYSTEM_ROLES.map((role) => {
          const isSelected = value === role.id;
          const Icon = role.icon;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onChange(role.id)}
              className={`flex flex-col items-start text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                isSelected 
                  ? `${role.color} border-current ring-2 ring-offset-1 shadow-sm` 
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex w-full justify-between items-center mb-2">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/50' : 'bg-slate-100'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-current' : 'border-slate-300'}`}>
                  {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                </div>
              </div>
              <span className="font-bold text-sm">{role.label}</span>
              <span className={`text-xs mt-1 ${isSelected ? 'opacity-90' : 'text-slate-500'}`}>
                {role.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
