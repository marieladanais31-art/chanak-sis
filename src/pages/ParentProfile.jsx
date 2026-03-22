
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2, User, Users, GraduationCap, Building2 } from 'lucide-react';

export default function ParentProfile() {
  const { profile } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChildren = async () => {
      if (!profile?.id) return;
      try {
        const { data, error } = await supabase
          .from('students')
          .select(`
            id, first_name, last_name, grade_level, status,
            hub:organizations(name)
          `)
          .eq('parent_id', profile.id);
          
        if (!error && data) {
          setChildren(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-6">
        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 border border-blue-100">
          <User className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{profile?.first_name || profile?.full_name || 'Perfil de Tutor'}</h2>
          <p className="text-slate-500">{profile?.email}</p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold capitalize border border-slate-200">
            Rol: {profile?.role?.replace('_', ' ')}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Estudiantes Asociados</h3>
        </div>
        
        {children.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center shadow-sm">
            <p className="text-slate-500">No hay estudiantes asociados a esta cuenta.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map(child => (
              <div key={child.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col hover:border-blue-300 transition-colors">
                <div className="font-bold text-slate-800 text-lg mb-4">{child.first_name} {child.last_name}</div>
                <div className="space-y-2 mt-auto">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <GraduationCap className="w-4 h-4 text-blue-500" />
                    <span>Nivel: {child.grade_level || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <span>Hub: {child.hub?.name || 'Chanak Florida'}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <span className="inline-flex px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                      Estado: {child.status || 'Activo'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
