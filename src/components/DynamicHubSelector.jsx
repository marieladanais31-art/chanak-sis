import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Building2, AlertCircle } from 'lucide-react';

export default function DynamicHubSelector({ selectedHubIds = [], onChange, multiple = true }) {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHubs = async () => {
      console.log('DynamicHubSelector: Fetching hubs...');
      try {
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('id, name, location, address, type')
          .eq('type', 'hub');

        if (fetchError) throw fetchError;
        
        console.log(`DynamicHubSelector: Retrieved ${data?.length || 0} hubs`, data);
        setHubs(data || []);
      } catch (err) {
        console.error('DynamicHubSelector: Error fetching hubs:', err);
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
      onChange([hubId]); // Always wrap in array for consistency or adjust based on parent needs
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center gap-3 text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        <span className="spinner-emoji">⏳</span> Cargando hubs dinámicamente...
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
      <div className="p-4 text-sm text-amber-600 bg-amber-50 rounded-xl border border-amber-200">
        ⚠️ No se encontraron hubs en la base de datos (type = 'hub').
      </div>
    );
  }

  const selectedArray = Array.isArray(selectedHubIds) ? selectedHubIds : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {hubs.map((hub) => {
        const isSelected = selectedArray.includes(hub.id);
        return (
          <label 
            key={hub.id} 
            className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-interactive ${
              isSelected 
                ? 'bg-indigo-50 border-indigo-400 shadow-sm ring-1 ring-indigo-400/20' 
                : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
            }`}
          >
            <div className="mt-0.5">
              <input 
                type={multiple ? "checkbox" : "radio"}
                name="dynamic_hub_selection"
                checked={isSelected}
                onChange={() => handleToggle(hub.id)}
                className={`w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 ${multiple ? 'rounded' : 'rounded-full'}`}
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{hub.name}</span>
              </span>
              {(hub.location || hub.address) && (
                <span className="text-xs text-slate-500 mt-0.5 truncate">
                  📍 {hub.location || hub.address}
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}