
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Settings, 
  LogOut,
  Menu,
  X,
  GraduationCap,
  CreditCard,
  FileText,
  Loader2,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

const AdminLayout = ({ children }) => {
  const { currentUser, logout, userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = async () => {
    setIsLoggingOut(true);
    console.log('🔧 [AdminLayout] User initiating logout...');
    await logout();
  };

  const isActive = (path) => location.pathname === path;

  // Hardcoded Modules exactly as requested
  const adminModules = [
    { path: '/admin/users', icon: Users, label: 'Usuarios' },
    { path: '/admin/hubs', icon: Building2, label: 'Hubs' },
    { path: '/admin/enrollment', icon: GraduationCap, label: 'Matrículas' },
    { path: '/admin/academico', icon: BookOpen, label: 'Académico' },
    { path: '/admin/payments', icon: CreditCard, label: 'Pagos' },
    { path: '/admin/pei', icon: FileText, label: 'PEI' },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#0B2D5C] via-[#1a3c6e] to-[#244b85]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-black/20 backdrop-blur-sm border-r border-white/10 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <img 
              src="https://horizons-cdn.hostinger.com/fecf9528-708e-4a5b-9228-805062d89fe9/4c172acccfd6da3811a3ad56c254d1fc.png" 
              alt="CHANAK International Academy logo"
              className="h-12 w-auto mb-2"
            />
            <p className="text-white/60 text-xs font-mono tracking-wider">CODE: 134620</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="mb-4 px-2">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Admin Modules</p>
            </div>
            {adminModules.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'bg-[#2F80ED]/20 text-white border border-[#2F80ED]/30 shadow-sm'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Current User Info & Logout */}
          <div className="p-4 border-t border-white/10 space-y-2">
            <div className="px-4 py-2 bg-black/20 rounded-lg">
              <p className="text-xs text-white/50 uppercase">Role</p>
              <p className="text-sm text-white font-medium capitalize">{userRole || 'Admin'}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-red-500/20 hover:text-red-400 transition-all w-full disabled:opacity-50"
            >
              {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
              <span className="text-sm font-medium">{isLoggingOut ? 'Saliendo...' : 'Cerrar Sesión'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:bg-white/10"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              <div className="hidden sm:block">
                <p className="text-white/60 text-sm">Bienvenido,</p>
                <p className="text-white font-semibold">{currentUser?.email}</p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-80 transition-opacity ring-2 ring-transparent focus:ring-white/50 rounded-full">
                  <Avatar className="border border-white/20 shadow-sm">
                    <AvatarFallback className="bg-[#2F80ED] text-white font-bold">
                      {currentUser?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-white border-slate-200">
                <DropdownMenuLabel className="text-slate-800">
                  <span className="block text-sm font-medium truncate">{currentUser?.email}</span>
                  <span className="block text-xs text-slate-500 font-normal uppercase mt-0.5">{userRole || 'Admin'}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100" />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
