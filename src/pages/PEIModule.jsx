
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Edit, Save, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PEIModule = ({ studentId }) => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pei, setPei] = useState(null);
  const [pacing, setPacing] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const isAdmin = ['admin', 'super admin', 'super_admin'].includes(userRole?.toLowerCase());

  useEffect(() => {
    const fetchPEI = async () => {
      console.log(`📄 [PEI] Fetching PEI for student: ${studentId}, year: ${currentYear}`);
      if (!studentId) return;
      try {
        let { data: peiData, error: peiError } = await supabase
          .from('pei')
          .select('*')
          .eq('student_id', studentId)
          .eq('year', currentYear)
          .single();

        if (peiError && peiError.code === 'PGRST116') {
          console.log(`ℹ️ [PEI] No PEI found, creating default...`);
          const { data: newPei, error: insertError } = await supabase
            .from('pei')
            .insert({
              student_id: studentId,
              year: currentYear,
              objectives: ['Mejorar comprensión lectora', 'Completar 3 PACEs por semana'],
              pacing_notes: 'Requiere supervisión en matemáticas'
            })
            .select()
            .single();
            
          if (insertError) throw insertError;
          peiData = newPei;

          const defaultPacing = [
            { pei_id: peiData.id, subject: 'Math', pages_per_day: 3, notes: 'Morning focus' },
            { pei_id: peiData.id, subject: 'English', pages_per_day: 4, notes: '' },
          ];
          
          await supabase.from('pei_pacing').insert(defaultPacing);
          console.log(`✅ [PEI] Default PEI created.`);
        } else if (peiError) {
          throw peiError;
        }

        setPei(peiData);
        
        const { data: pacingData, error: pacingError } = await supabase
          .from('pei_pacing')
          .select('*')
          .eq('pei_id', peiData.id);
          
        if (pacingError) throw pacingError;
        setPacing(pacingData || []);

      } catch (err) {
        console.error('❌ [PEI] Error fetching PEI:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPEI();
  }, [studentId, currentYear]);

  const handleSave = async () => {
    console.log(`💾 [PEI] Saving PEI updates...`);
    try {
      const { error: peiErr } = await supabase
        .from('pei')
        .update({ objectives: pei.objectives, pacing_notes: pei.pacing_notes })
        .eq('id', pei.id);
      if (peiErr) throw peiErr;

      for (const p of pacing) {
        if (p.id) {
          await supabase.from('pei_pacing').update({ pages_per_day: p.pages_per_day, notes: p.notes, subject: p.subject }).eq('id', p.id);
        } else {
          await supabase.from('pei_pacing').insert({ pei_id: pei.id, subject: p.subject, pages_per_day: p.pages_per_day, notes: p.notes });
        }
      }
      
      setIsEditing(false);
      console.log(`✅ [PEI] Saved successfully.`);
    } catch (err) {
      console.error('❌ [PEI] Error saving PEI:', err);
    }
  };

  const handleObjectiveChange = (index, value) => {
    const newObjs = [...pei.objectives];
    newObjs[index] = value;
    setPei({ ...pei, objectives: newObjs });
  };

  const addObjective = () => {
    setPei({ ...pei, objectives: [...pei.objectives, 'Nuevo objetivo'] });
  };

  const removeObjective = (index) => {
    const newObjs = pei.objectives.filter((_, i) => i !== index);
    setPei({ ...pei, objectives: newObjs });
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto text-indigo-500"/></div>;
  if (!pei) return <div className="p-8 text-center text-red-500">No PEI available.</div>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
      <div className="bg-[#0B2D5C] px-6 py-4 flex justify-between items-center text-white">
        <div>
          <h2 className="text-xl font-bold">Individualized Education Program (PEI)</h2>
          <p className="text-indigo-200 text-sm">{currentYear} Academic Year</p>
        </div>
        <div>
          {!isAdmin && <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Solo puedes verlo</span>}
          {isAdmin && !isEditing && (
            <Button onClick={() => setIsEditing(true)} size="sm" className="bg-white text-[#0B2D5C] hover:bg-slate-100">
              <Edit className="w-4 h-4 mr-2" /> Editar PEI
            </Button>
          )}
          {isAdmin && isEditing && (
            <Button onClick={handleSave} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
              <Save className="w-4 h-4 mr-2" /> Guardar
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Objectives */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Academic Objectives</h3>
          <ul className="space-y-3">
            {pei.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-indigo-500 font-bold mt-1">•</span>
                {isEditing ? (
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text" 
                      value={obj} 
                      onChange={(e) => handleObjectiveChange(i, e.target.value)}
                      className="flex-1 border rounded px-3 py-1 text-sm focus:outline-indigo-500"
                    />
                    <button onClick={() => removeObjective(i)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ) : (
                  <span className="text-slate-700">{obj}</span>
                )}
              </li>
            ))}
          </ul>
          {isEditing && (
            <Button onClick={addObjective} variant="outline" size="sm" className="mt-3">
              <Plus className="w-4 h-4 mr-1" /> Añadir Objetivo
            </Button>
          )}
        </div>

        {/* Pacing Table */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Subject Pacing</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-3 rounded-tl-lg font-semibold">Subject</th>
                  <th className="p-3 font-semibold text-center">Pages / Day</th>
                  <th className="p-3 rounded-tr-lg font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pacing.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">
                      {isEditing ? (
                        <input 
                          type="text" value={p.subject} 
                          onChange={(e) => {
                            const newP = [...pacing];
                            newP[i].subject = e.target.value;
                            setPacing(newP);
                          }}
                          className="w-full border rounded px-2 py-1"
                        />
                      ) : p.subject}
                    </td>
                    <td className="p-3 text-center">
                      {isEditing ? (
                        <input 
                          type="number" value={p.pages_per_day} 
                          onChange={(e) => {
                            const newP = [...pacing];
                            newP[i].pages_per_day = parseInt(e.target.value) || 0;
                            setPacing(newP);
                          }}
                          className="w-16 text-center border rounded px-2 py-1 mx-auto"
                        />
                      ) : <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-bold">{p.pages_per_day}</span>}
                    </td>
                    <td className="p-3 text-slate-600">
                      {isEditing ? (
                        <input 
                          type="text" value={p.notes} 
                          onChange={(e) => {
                            const newP = [...pacing];
                            newP[i].notes = e.target.value;
                            setPacing(newP);
                          }}
                          className="w-full border rounded px-2 py-1"
                        />
                      ) : p.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isEditing && (
            <Button 
              onClick={() => setPacing([...pacing, { subject: 'New Subject', pages_per_day: 3, notes: '' }])} 
              variant="outline" size="sm" className="mt-3"
            >
              <Plus className="w-4 h-4 mr-1" /> Añadir Asignatura
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PEIModule;
