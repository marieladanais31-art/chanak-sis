import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Search, Link2, Loader2, User, AlertCircle } from 'lucide-react';

export default function StudentSearchAndLink({ onLinked }) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [linkingId, setLinkingId] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (currentUser?.id) {
        const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        setUserProfile(data);
      }
    };
    fetchProfile();
  }, [currentUser]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim() || searchTerm.length < 3) {
      toast({ title: 'Aviso', description: 'Ingrese al menos 3 caracteres para buscar.', variant: 'default' });
      return;
    }

    setSearching(true);
    setHasSearched(true);
    try {
      // Search by name or passport
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,passport_number.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
      toast({ title: 'Error', description: 'Fallo al buscar estudiantes.', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const handleLinkStudent = async (studentId) => {
    if (!currentUser?.id) return;
    setLinkingId(studentId);
    
    try {
      // For student_guardians, we need a hub_id. Fallback to a dummy uuid if user has none.
      const userHubId = userProfile?.hub_id || '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase.from('student_guardians').insert([{
        student_id: studentId,
        parent_id: currentUser.id,
        guardian_id: currentUser.id,
        hub_id: userHubId
      }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('El estudiante ya está vinculado a su cuenta.');
        }
        throw error;
      }

      toast({ title: '¡Éxito!', description: 'Estudiante vinculado correctamente a su cuenta.' });
      if (onLinked) onLinked();
      
    } catch (err) {
      console.error('Link error:', err);
      toast({ title: 'Aviso', description: err.message || 'No se pudo vincular el estudiante.', variant: 'destructive' });
    } finally {
      setLinkingId(null);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto w-full">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-indigo-50 flex items-center justify-center rounded-full mx-auto mb-4">
          <Link2 className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Vincular Estudiante</h2>
        <p className="text-slate-500 mt-2">Busque a su estudiante por nombre, apellido o número de pasaporte/ID para agregarlo a su portal familiar.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar estudiante..." 
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900"
          />
        </div>
        <Button type="submit" disabled={searching} className="py-3 px-6 h-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl">
          {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
        </Button>
      </form>

      {hasSearched && (
        <div className="space-y-4 animate-in fade-in">
          <h3 className="font-bold text-slate-700 mb-2 border-b pb-2">Resultados ({results.length})</h3>
          
          {results.length === 0 ? (
            <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100 text-slate-500">
              No se encontraron estudiantes que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(student => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{student.first_name} {student.last_name}</p>
                      <p className="text-xs text-slate-500">
                        {student.passport_number ? `ID: ${student.passport_number}` : 'Sin ID registrado'} • Grado: {student.grade_level || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleLinkStudent(student.id)}
                    disabled={linkingId === student.id}
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    {linkingId === student.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                    Vincular
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}