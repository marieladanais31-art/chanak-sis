
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  GraduationCap, 
  BookOpen, 
  CreditCard, 
  FileText,
  Menu,
  X,
  LogOut,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser, logout, userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log(`🏗️ [AdminLayout] Rendered for path: ${location.pathname}`);
  }, [location]);

  const handleLogout = async () => {
    console.log('🚪 [AdminLayout] Initiating logout...');
    await logout();
    navigate('/login');
  };

  const modules = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'Usuarios', icon: Users, path: '/admin/users' },
    { name: 'Hubs', icon: Building2, path: '/admin/hubs' },
    { name: 'Matrículas', icon: GraduationCap, path: '/admin/enrollment' },
    { name: 'Académico/Notas', icon: BookOpen, path: '/admin/academico' },
    { name: 'Pagos', icon: CreditCard, path: '/admin/payments' },
    { name: 'PEI', icon: FileText, path: '/admin/pei' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside 
        className={`${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#0B2D5C] text-white flex flex-col transition-all duration-300 z-20 fixed md:relative h-full`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          {!isCollapsed && <span className="font-bold text-lg truncate">Admin Portal</span>}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-white hover:bg-white/10 rounded-full"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </Button>
        </div>

        <div className="flex-1 py-6 overflow-y-auto px-3 space-y-1">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isActive = location.pathname.startsWith(mod.path);
            
            return (
              <Link
                key={mod.path}
                to={mod.path}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white font-medium' 
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
                title={isCollapsed ? mod.name : undefined}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{mod.name}</span>}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/10 shrink-0">
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className={`w-full text-red-400 hover:text-red-300 hover:bg-red-400/10 flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-start'} gap-3`}
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-20 md:ml-0">
        
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <span className="text-slate-500 font-medium capitalize hidden sm:block">
              Role: <span className="text-slate-800">{userRole || 'Admin'}</span>
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-700 hidden sm:block">{currentUser?.email}</span>
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
