
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  LayoutDashboard, 
  Users, 
  School, 
  MapPin, 
  UserPlus, 
  Shield, 
  Globe, 
  Settings, 
  LogOut,
  Loader2,
  Home,
  BookOpen,
  BarChart2,
  Library
} from 'lucide-react';

export default function Sidebar() {
  const { userRole, loading, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    console.log('🚪 [Sidebar] Initiating logout process...');
    try {
      await logout();
      navigate('/'); 
    } catch (err) {
      console.error('❌ [Sidebar] Logout failed:', err);
      toast({
        title: 'Logout Failed',
        description: 'An error occurred while logging out. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const adminLinks = [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/admin/users', icon: <Users size={20} />, label: 'User Management' },
    { to: '/admin/hubs', icon: <School size={20} />, label: 'Hubs' },
    { to: '/admin/hub-assignments', icon: <MapPin size={20} />, label: 'Hub Assignments' },
    { to: '/admin/enrollment', icon: <UserPlus size={20} />, label: 'Enrollment' },
    { to: '/admin/courses', icon: <BookOpen size={20} />, label: 'Courses' },
    { to: '/admin/gradebook', icon: <BarChart2 size={20} />, label: 'Gradebook' },
    { to: '/admin/academic', icon: <Library size={20} />, label: 'Academic Management' },
    { to: '/admin/security', icon: <Shield size={20} />, label: 'Security' },
    { to: '/admin/language', icon: <Globe size={20} />, label: 'Language' },
    { to: '/admin/config', icon: <Settings size={20} />, label: 'Configuration' },
  ];

  const parentLinks = [
    { to: '/portal-familia', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  ];

  const guestLinks = [
    { to: '/', icon: <Home size={20} />, label: 'Home' },
  ];

  if (loading) {
    return (
      <div className="w-64 bg-slate-900 min-h-screen text-white flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400 w-8 h-8 mb-4" />
        <p className="text-sm text-slate-400">Loading menu...</p>
      </div>
    );
  }

  // Normalize role safely
  let normalizedRole = 'guest';
  if (userRole && typeof userRole === 'string') {
    normalizedRole = userRole.toLowerCase().trim();
  }

  let links = guestLinks;
  let subtitle = 'Guest Portal';

  if (normalizedRole === 'parent') {
    links = parentLinks;
    subtitle = 'Family Portal';
  } else if (['admin', 'super admin', 'super_admin', 'teacher'].includes(normalizedRole)) {
    links = adminLinks;
    subtitle = 'Admin Panel';
  }

  return (
    <aside className="w-64 bg-slate-900 min-h-screen text-white flex flex-col shadow-xl border-r border-slate-800">
      <div className="p-6">
        <h2 className="text-xl font-bold tracking-tight text-indigo-400">Chanak Academy</h2>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{subtitle}</p>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-indigo-600/20 text-indigo-400 font-medium border border-indigo-500/30 shadow-sm' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
