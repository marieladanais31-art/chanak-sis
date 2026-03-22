
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-12 rounded-2xl shadow-xl text-center max-w-lg w-full border border-slate-100">
        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-4">Chanak International Academy</h1>
        <p className="text-slate-600 mb-8 font-medium">Bienvenido al sistema de gestión educativa. Por favor, inicie sesión para acceder a su portal.</p>
        
        <button 
          onClick={() => navigate('/login')}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-all shadow-md shadow-blue-600/20"
        >
          Iniciar Sesión
        </button>
      </div>
    </div>
  );
}
