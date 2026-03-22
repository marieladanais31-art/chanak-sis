
import React from 'react';
import { Shield, BookOpen, Users, GraduationCap, Briefcase } from 'lucide-react';

const INDEPENDENT_ROLES = [
  {
    category: 'Administrativo',
    roles: [
      { id: 'admisiones', label: 'Admisiones', desc: 'Gestión de nuevos ingresos', icon: Briefcase, color: 'text-purple-700 bg-purple-50 border-purple-200 ring-purple-400' },
      { id: 'director', label: 'Director', desc: 'Gestión general del Hub', icon: Shield, color: 'text-amber-700 bg-amber-50 border-amber-200 ring-amber-400' }
    ]
  },
  {
    category: 'Académico',
    roles: [
      { id: 'coordinador', label: 'Coordinador', desc: 'Supervisión académica y PEI', icon: BookOpen, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 ring-emerald-400' }
    ]
  },
  {
    category: 'Familia',
    roles: [
      { id: 'parent', label: 'Parent (Padre/Tutor)', desc: 'Acceso al portal familiar', icon: Users, color: 'text-blue-700 bg-blue-50 border-blue-200 ring-blue-400' }
    ]
  },
  {
    category: 'Estudiante',
    roles: [
      { id: 'student', label: 'Student (Alumno)', desc: 'Acceso a progreso propio', icon: GraduationCap, color: 'text-pink-700 bg-pink-50 border-pink-200 ring-pink-400' }
    ]
  }
];

export default function RoleSelectorFinal({ value, onChange }) {
  const selectedRoleName = INDEPENDENT_ROLES.flatMap(c => c.roles).find(r => r.id === value)?.label;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-bold text-slate-800">Selección de Rol Independiente</h3>
        {selectedRoleName && (
          <span className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold border border-indigo-200 shadow-sm">
            Rol Confirmado: {selectedRoleName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {INDEPENDENT_ROLES.map((cat) => (
          <div key={cat.category} className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{cat.category}</h4>
            <div className="space-y-3">
              {cat.roles.map((role) => {
                const isSelected = value === role.id;
                const Icon = role.icon;
                return (
                  <label 
                    key={role.id}
                    className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? `${role.color} border-current ring-2 shadow-sm` 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="radio"
                        name="final_user_role"
                        value={role.id}
                        checked={isSelected}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                    </div>
                    <div className="ml-3 flex flex-col">
                      <span className={`text-sm font-bold flex items-center gap-1.5 ${isSelected ? '' : 'text-slate-700'}`}>
                        <Icon className="w-4 h-4" />
                        {role.label}
                      </span>
                      <span className={`text-xs mt-1 ${isSelected ? 'opacity-90' : 'text-slate-500'}`}>
                        {role.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
