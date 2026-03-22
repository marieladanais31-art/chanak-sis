
import React from 'react';
import { Shield, BookOpen, Users, GraduationCap } from 'lucide-react';

const ROLE_CATEGORIES = [
  {
    id: 'admin',
    title: 'Administración',
    roles: [
      { id: 'super_admin', label: 'Super Admin', desc: 'Acceso total al sistema', icon: Shield, color: 'text-red-700 bg-red-50 border-red-200 ring-red-400' }
    ]
  },
  {
    id: 'academic',
    title: 'Académico',
    roles: [
      { id: 'coordinador', label: 'Coordinador', desc: 'Gestión de PEI y reportes', icon: BookOpen, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 ring-emerald-400' }
    ]
  },
  {
    id: 'family',
    title: 'Familia',
    roles: [
      { id: 'parent', label: 'Parent (Padre/Tutor)', desc: 'Portal familiar integral', icon: Users, color: 'text-blue-700 bg-blue-50 border-blue-200 ring-blue-400' }
    ]
  },
  {
    id: 'student',
    title: 'Estudiante',
    roles: [
      { id: 'student', label: 'Student (Alumno)', desc: 'Acceso solo a progreso propio', icon: GraduationCap, color: 'text-purple-700 bg-purple-50 border-purple-200 ring-purple-400' }
    ]
  }
];

export default function UserRoleSelector({ value, onChange }) {
  const selectedRoleName = ROLE_CATEGORIES.flatMap(c => c.roles).find(r => r.id === value)?.label;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="text-lg font-bold text-slate-800">Seleccionar Rol de Usuario</h3>
        {selectedRoleName && (
          <span className="text-sm px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium border border-indigo-100">
            Rol Seleccionado: {selectedRoleName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ROLE_CATEGORIES.map((category) => (
          <div key={category.id} className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{category.title}</h4>
            <div className="space-y-3">
              {category.roles.map((role) => {
                const isSelected = value === role.id;
                const Icon = role.icon;
                return (
                  <label 
                    key={role.id}
                    className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-interactive ${
                      isSelected 
                        ? `${role.color} border-current ring-2 shadow-sm` 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        type="radio"
                        name="user_role"
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
