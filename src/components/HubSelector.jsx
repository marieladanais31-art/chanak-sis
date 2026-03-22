
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, AlertCircle, Building2 } from 'lucide-react';

export default function HubSelector({ selectedHubIds = [], onChange }) {
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHubs = async () => {
      console.log('HubSelector: Loading hubs from organizations table...');
      try {
        const { data, error: fetchError } = await supabase
          .from('organizations')
          .select('id, name, address')
          .eq('type', 'hub');

        if (fetchError) throw fetchError;
        
        console.log(`HubSelector: Loaded ${data?.length || 0} hubs.`);
        setHubs(data || []);
      } catch (err) {
        console.error('HubSelector: Error fetching hubs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHubs();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 p-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando hubs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
        <AlertCircle className="w-4 h-4" /> Error al cargar hubs: {error}
      </div>
    );
  }

  if (hubs.length === 0) {
    return (
      <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
        ⚠️ No se encontraron hubs configurados.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {hubs.map((hub) => (
        <label 
          key={hub.id} 
          className={`flex items-start gap-3 cursor-pointer p-3 rounded-xl border transition-all ${
            selectedHubIds.includes(hub.id) 
              ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
          }`}
        >
          <div className="mt-0.5">
            <input 
              type="checkbox" 
              checked={selectedHubIds.includes(hub.id)}
              onChange={() => onChange(hub.id)}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {hub.name}
            </span>
            {hub.address && <span className="text-xs text-slate-500 mt-0.5">{hub.address}</span>}
          </div>
        </label>
      ))}
    </div>
  );
}
