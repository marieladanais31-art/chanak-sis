import React from 'react';
import { useAuth } from '@/context/AuthContext';
import HelpModule from '@/components/HelpModule';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function HelpPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const role = profile?.role || 'guest';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-bold text-slate-700">Ayuda · Chanak SIS</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <HelpModule role={role} />
      </main>
    </div>
  );
}
