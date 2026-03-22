
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, Search, Shield, Mail, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminSeguridad() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingReset, setSendingReset] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role, created_at')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar los usuarios.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email) => {
    if (!email) return;
    setSendingReset(email);
    console.log(`[AdminSeguridad] Solicitando restablecimiento para: ${email}`);
    
    try {
      // Using safe client-side auth method as required
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('[AdminSeguridad] Error en Supabase Auth:', error);
        throw error;
      }
      
      console.log(`[AdminSeguridad] Éxito: Correo enviado a ${email}`);
      toast({ title: 'Correo Enviado', description: `Se enviaron instrucciones a ${email}` });
    } catch (error) {
      console.error('[AdminSeguridad] Excepción Capturada:', error);
      toast({ 
        title: 'Error de Seguridad', 
        description: 'No se pudo enviar el correo de recuperación. Verifique la configuración de Supabase Auth.', 
        variant: 'destructive' 
      });
    } finally {
      setSendingReset(null);
    }
  };

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'super_admin':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-bold tracking-wider">ADMINISTRADOR</span>;
      case 'parent':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold tracking-wider">PADRE</span>;
      case 'coordinator':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold tracking-wider">COORDINADOR</span>;
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold tracking-wider uppercase">{role?.replace('_', ' ') || 'USUARIO'}</span>;
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" /> Módulo de Seguridad
          </h2>
          <p className="text-sm text-slate-500 font-medium">Gestión de accesos y recuperación de contraseñas</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-blue-800">
        <Key className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <h4 className="font-bold">Proceso de Recuperación de Contraseñas</h4>
          <p className="text-sm mt-1">
            Al hacer clic en "Enviar Correo de Recuperación", el sistema enviará un enlace seguro al usuario para que pueda establecer una nueva contraseña. El enlace expirará según la configuración de seguridad de Supabase.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-slate-300 text-slate-800 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 font-bold">
              <tr>
                <th className="p-4">Nombre</th>
                <th className="p-4">Email</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Registrado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">
                    {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}` : 'Sin nombre'}
                  </td>
                  <td className="p-4 text-slate-600">{user.email}</td>
                  <td className="p-4">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="p-4 text-slate-500 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <Button 
                      onClick={() => handleResetPassword(user.email)} 
                      variant="outline" 
                      size="sm" 
                      disabled={sendingReset === user.email || !user.email}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 font-bold"
                    >
                      {sendingReset === user.email ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 mr-2" />
                      )}
                      Recuperar
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 font-medium">No se encontraron usuarios.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
