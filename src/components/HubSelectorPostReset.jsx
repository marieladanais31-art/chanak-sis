
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Building2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export default function HubSelectorPostReset({ selectedHubIds = [], onChange, multiple = true, forceRefresh = 0 }) {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHubsDirect = async () => {
    console.log('🏢 [HubSelectorPostReset] Fetching hubs directly from database (No Cache)...');
    console.log('🔑 [HubSelectorPostReset] Verifying Publishable Key usage...');
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('id, name, location, code')
        .eq('type', 'hub')
        .order('name');

      if (fetchError) {
        if (fetchError.code === '42501') {
           console.error('❌ [HubSelectorPostReset] RLS Permission Denied (42501): The anonymous or authenticated role lacks SELECT permissions on organizations table.');
        } else if (fetchError.code === '42703') {
           console.error('❌ [HubSelectorPostReset] Column Not Found (42703): Verify schema for organizations table (check type, name, location, code columns).');
        } else {
           console.error(`❌ [HubSelectorPostReset] Database error (${fetchError.code}): ${fetchError.message}`);
        }
        throw fetchError;
      }
      
      const hubNames = data?.map(h => h.name) || [];
      console.log(`✅ [HubSelectorPostReset] Fetched ${data?.length || 0} hubs successfully.`);
      console.log(`🏢 [HubSelectorPostReset] Names: ${hubNames.join(', ')}`);
      
      const hasEducaFe = hubNames.some(name => name.toLowerCase().includes('educafe'));
      console.log(`🔍 [HubSelectorPostReset] EducaFe presence verification: ${hasEducaFe ? 'FOUND' : 'MISSING'}`);
      
      setHubs(data || []);
    } catch (err) {
      console.error('🏢 [HubSelectorPostReset] Error fetching hubs:', err);
      setError(err.message || 'Unknown network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubsDirect();
  }, [forceRefresh]);

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

  const selectedArray = Array.isArray(selectedHubIds) ? selectedHubIds : (selectedHubIds ? [selectedHubIds] : []);

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center gap-3 text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        <Loader2 className="animate-spin w-5 h-5 text-indigo-500" /> Cargando Hubs en vivo...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center gap-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" /> 
          <span className="font-medium">Error de conexión: {error}</span>
        </div>
        <button 
          type="button"
          onClick={fetchHubsDirect}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar Conexión
        </button>
      </div>
    );
  }

  if (hubs.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-600 bg-slate-50 rounded-xl border border-slate-200">
        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="font-bold">Sin Hubs Disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hubs Disponibles</span>
        <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
          {selectedArray.length} seleccionado(s)
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hubs.map((hub) => {
          const isSelected = selectedArray.includes(hub.id);
          return (
            <label 
              key={hub.id} 
              className={`flex items-start gap-3 cursor-pointer p-3.5 rounded-xl border-2 transition-all ${
                isSelected 
                  ? 'bg-blue-50 border-blue-500 shadow-sm' 
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="mt-0.5">
                <input 
                  type={multiple ? "checkbox" : "radio"}
                  name="hub_selection_direct"
                  checked={isSelected}
                  onChange={() => handleToggle(hub.id)}
                  className={`w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 ${multiple ? 'rounded' : 'rounded-full'}`}
                />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 truncate">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{hub.name}</span>
                </span>
                <span className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                  {hub.code && <span className="bg-slate-100 px-1.5 rounded">{hub.code}</span>}
                  {hub.location && <span className="truncate">📍 {hub.location}</span>}
                </span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
