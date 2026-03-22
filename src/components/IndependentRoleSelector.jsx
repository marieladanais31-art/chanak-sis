import React from 'react';
import { Shield, Users, BookOpen, GraduationCap } from 'lucide-react';

const INDEPENDENT_ROLES = [
  { 
    id: 'super_admin', 
    label: 'Super Admin', 
    description: 'Acceso total al sistema y configuraciones.',
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100',
    selectedClass: 'bg-blue-100 border-blue-400 ring-2 ring-blue-400/20',
    icon: Shield
  },
  { 
    id: 'coordinator', 
    label: 'Coordinador', 
    description: 'Gestión académica y validación de PEI.',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    selectedClass: 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400/20',
    icon: BookOpen
  },
  { 
    id: 'parent', 
    label: 'Parent (Padre/Tutor)', 
    description: 'Portal familiar para ver progreso de estudiantes.',
    colorClass: 'text-slate-700 bg-slate-50 border-slate-200 hover:bg-slate-100',
    selectedClass: 'bg-slate-200 border-slate-400 ring-2 ring-slate-400/20',
    icon: Users
  },
  { 
    id: 'student', 
    label: 'Student (Estudiante)', 
    description: 'Acceso exclusivo al progreso propio.',
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200 hover:bg-purple-100',
    selectedClass: 'bg-purple-100 border-purple-400 ring-2 ring-purple-400/20',
    icon: GraduationCap
  }
];

export default function IndependentRoleSelector({ value, onChange }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-800">Rol de Acceso (Selección Única)</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {INDEPENDENT_ROLES.map((role) => {
          const isSelected = value === role.id;
          const Icon = role.icon;
          return (
            <label 
              key={role.id} 
              className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all ${role.colorClass} ${isSelected ? role.selectedClass : 'border-transparent'}`}
            >
              <div className="flex items-center h-5 mt-0.5">
                <input
                  type="radio"
                  name="independent_role"
                  value={role.id}
                  checked={isSelected}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
              </div>
              <div className="ml-3 flex flex-col">
                <span className="text-sm font-bold flex items-center gap-1.5">
                  <Icon className="w-4 h-4" />
                  {role.label}
                </span>
                <span className="text-xs mt-1 opacity-80">{role.description}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}