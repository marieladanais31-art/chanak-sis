import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Building2, AlertCircle, Loader2 } from 'lucide-react';

export default function HubSelectorFinal({ selectedHubIds = [], onChange, multiple = true }) {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHubs = async () => {
      console.log('🏢 [HubSelectorFinal] Fetching hubs dynamically...');
      try {
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('id, name, location, code')
          .eq('type', 'hub')
          .order('name');

        if (fetchError) throw fetchError;
        
        console.log(`🏢 [HubSelectorFinal] Fetched ${data?.length || 0} hubs:`, data);
        setHubs(data || []);
      } catch (err) {
        console.error('🏢 [HubSelectorFinal] Error fetching hubs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHubs();
  }, []);

  const handleToggle = (hubId) => {
    if (multiple) {
      const current = Array.isArray(selectedHubIds) ? selectedHubIds : [];
      if (current.includes(hubId)) {
        onChange(current.filter(id => id !== hubId));
      } else {
        onChange([...current, hubId]);
      }
    } else {
      onChange([hubId]);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center gap-3 text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        <Loader2 className="animate-spin w-5 h-5 text-indigo-500" /> Verificando Hubs Disponibles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
        <AlertCircle className="w-4 h-4 shrink-0" /> 
        <span>Error al cargar hubs: {error}</span>
      </div>
    );
  }

  if (hubs.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-600 bg-slate-50 rounded-xl border border-slate-200">
        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-bold">No se encontraron Hubs</p>
        <p className="text-xs mt-1">Verifique la tabla organizations donde type='hub'.</p>
      </div>
    );
  }

  const selectedArray = Array.isArray(selectedHubIds) ? selectedHubIds : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {hubs.map((hub) => {
        const isSelected = selectedArray.includes(hub.id);
        return (
          <label 
            key={hub.id} 
            className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-all ${
              isSelected 
                ? 'bg-blue-50 border-blue-400 shadow-sm ring-1 ring-blue-400/20' 
                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <div className="mt-0.5">
              <input 
                type={multiple ? "checkbox" : "radio"}
                name="final_hub_selection"
                checked={isSelected}
                onChange={() => handleToggle(hub.id)}
                className={`w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 ${multiple ? 'rounded' : 'rounded-full'}`}
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{hub.name}</span>
              </span>
              {hub.location && (
                <span className="text-xs text-slate-500 mt-0.5 truncate">
                  📍 {hub.location}
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}