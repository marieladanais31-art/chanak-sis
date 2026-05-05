
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  Settings,
  LogOut,
  ChevronRight,
  FileText,
  GraduationCap,
  BookOpen,
  FileSignature,
  Shield,
  ClipboardList,
  ScrollText,
  Building,
  Mail,
  Calendar,
  CalendarDays
} from 'lucide-react';
import { useAuth, ROLES } from '@/context/AuthContext';

export default function AdminSidebar({ currentSection, onNavigate }) {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [localLogo, setLocalLogo] = useState(localStorage.getItem('app_logo'));

  useEffect(() => {
    const updateLogo = () => {
      setLocalLogo(localStorage.getItem('app_logo'));
      setLogoError(false); // Reset error state to retry new image
    };
    
    window.addEventListener('logo-updated', updateLogo);
    return () => window.removeEventListener('logo-updated', updateLogo);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isSuperAdmin = profile?.role === ROLES.SUPER_ADMIN || profile?.role === 'admin';

  if (!isSuperAdmin) {
    return null;
  }

  const NavItem = ({ section, icon: Icon, label }) => {
    const isActive = currentSection === section;
    
    return (
      <button 
        onClick={() => onNavigate(section)}
        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold transition-all group mb-1 ${
          isActive 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-blue-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
          {label}
        </div>
        {isActive && <ChevronRight className="w-4 h-4 text-blue-200" />}
      </button>
    );
  };

  const displayName = profile?.first_name || 'Admin';
  const displayRole = profile?.role ? profile.role.replace('_', ' ').toUpperCase() : 'SUPER ADMIN';

  return (
    <aside className="w-72 bg-white flex flex-col shrink-0 min-h-screen border-r border-slate-200 shadow-sm">
      <div className="h-32 flex flex-col items-center justify-center border-b border-slate-100 shrink-0 p-4">
        {!logoError ? (
          <img 
            src={localLogo || "https://horizons-cdn.hostinger.com/fecf9528-708e-4a5b-9228-805062d89fe9/d9778ccb909ddc8597ac3c64740796e6.png"}
            alt="Chanak Academy" 
            onError={() => setLogoError(true)} 
            className="w-16 h-16 object-contain mb-2 drop-shadow-sm"
          />
        ) : (
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30 mb-2">
            CA
          </div>
        )}
        <p className="text-slate-800 text-xs font-black uppercase tracking-widest text-center leading-tight">
          Chanak International<br/><span className="text-blue-600">Academy</span>
        </p>
      </div>
      
      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Menú Principal</div>
        
        {isSuperAdmin && (
          <>
            <NavItem section="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem section="estudiantes" icon={GraduationCap} label="Estudiantes" />
            <NavItem section="hubs" icon={Building2} label="Hubs" />
            <NavItem section="academico" icon={BookOpen} label="Académico" />
            <NavItem section="pagos" icon={CreditCard} label="Pagos" />
            <NavItem section="pei" icon={FileText} label="PEI" />
            <NavItem section="contratos" icon={FileSignature} label="Contratos" />
            <NavItem section="users" icon={Users} label="Usuarios" />
            <NavItem section="boletines" icon={ScrollText} label="Boletines" />
            <NavItem section="asignaciones" icon={Calendar} label="Asignaciones y PACEs" />
            <NavItem section="calendario" icon={CalendarDays} label="Calendario Escolar" />
            <NavItem section="cartas" icon={Mail} label="Cartas" />
            <NavItem section="revision-notas" icon={ClipboardList} label="Revisión de Notas" />
            <NavItem section="seguridad" icon={Shield} label="Seguridad" />
            <NavItem section="settings" icon={Settings} label="Configuración" />
            <NavItem section="config-institucional" icon={Building} label="Inst. Config." />
          </>
        )}
      </nav>
      
      <div className="p-5 border-t border-slate-100 bg-slate-50 mt-auto">
        <div className="flex items-center gap-3 mb-5 px-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider leading-none mb-1">
              Conectado como
            </p>
            <p className="text-slate-800 text-sm font-bold truncate leading-tight">
              {displayName}
            </p>
            <p className="text-blue-600 text-xs truncate font-black tracking-wider mt-0.5">
              {displayRole}
            </p>
          </div>
        </div>

        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-sm font-bold transition-all border border-red-200 hover:border-red-600 shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
