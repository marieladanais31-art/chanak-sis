
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import ProgramStudents from '@/components/ProgramStudents';
import PEIValidation from '@/components/PEIValidation';

export default function CoordinadorPanel() {
  const { currentUser, rolePermissions, programId, logout } = useAuth();
  const [currentView, setCurrentView] = useState('program_students');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <div className="font-medium text-slate-800 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wider text-white ${rolePermissions.activeColor}`}>
              {rolePermissions.label.toUpperCase()}
            </span>
            {currentUser?.email}
          </div>
          
          <Button 
            variant="ghost" 
            onClick={logout}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {currentView === 'program_students' ? <ProgramStudents programId={programId} /> : <PEIValidation />}
          </div>
        </main>
      </div>
    </div>
  );
}
