import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, UserPlus } from 'lucide-react';
import RoleSelectorPostReset from './RoleSelectorPostReset';
import HubSelectorPostReset from './HubSelectorPostReset';

export default function CreateUserForm({ onSuccess, onCancel }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: '', 
    hubs: []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.role) {
      toast({ title: 'Atención', description: 'Debe seleccionar un rol para el usuario.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: formData.email,
        password: formData.password,
        email_confirm: true,
        user_metadata: {
          full_name: formData.fullName,
          role: formData.role
        }
      });

      if (authError) throw authError;

      if (authData?.user) {
        const { error: dbError } = await supabase.from('users').insert([{
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: formData.role,
          active: true
        }]);
        if (dbError) throw dbError;

        if (formData.hubs.length > 0) {
          const hubInserts = formData.hubs.map(hubId => ({
            user_id: authData.user.id,
            hub_id: hubId,
            role_in_hub: formData.role
          }));
          await supabase.from('hub_staff').insert(hubInserts);
        }
      }

      toast({ title: 'Usuario Creado', description: 'El usuario ha sido creado exitosamente.' });
      if (onSuccess) onSuccess();
      
      setFormData({ email: '', password: '', fullName: '', role: '', hubs: [] });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({ 
        title: 'Error', 
        description: 'No se pudo crear el usuario. Verifique la conexión y permisos.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Información Básica</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
            <input 
              required 
              type="text" 
              value={formData.fullName} 
              onChange={e => setFormData({...formData, fullName: e.target.value})} 
              className="w-full border p-2.5 rounded-lg text-slate-900 bg-white" 
              placeholder="Ej. Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input 
              required 
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              className="w-full border p-2.5 rounded-lg text-slate-900 bg-white" 
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña Inicial</label>
            <input 
              required 
              type="text" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              className="w-full border p-2.5 rounded-lg text-slate-900 bg-white" 
              minLength={6} 
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <RoleSelectorPostReset 
          value={formData.role} 
          onChange={(val) => setFormData({...formData, role: val})} 
        />
      </div>

      {formData.role && ['coordinador', 'director', 'admisiones'].includes(formData.role) && (
        <div className="pt-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Asignación de Hub (Opcional)</h3>
          <HubSelectorPostReset 
            selectedHubIds={formData.hubs}
            onChange={(hubs) => setFormData({...formData, hubs})}
            multiple={true}
          />
        </div>
      )}

      <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
          Crear Usuario
        </Button>
      </div>
    </form>
  );
}