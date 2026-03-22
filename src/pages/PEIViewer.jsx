
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, BookOpen, AlertCircle, FileText, Lock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import jsPDF from 'jspdf';

const LEGAL_FOOTER = "Florida Not-For-Profit Corporation (Document No. N25000012528) - FDOE 134620";

export default function PEIViewer({ studentId, readOnly = false }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pei, setPei] = useState(null);
  const [pacing, setPacing] = useState([]);
  const [student, setStudent] = useState(null);
  const [dailyNotes, setDailyNotes] = useState([]);
  
  const [newNote, setNewNote] = useState({
    date: new Date().toISOString().split('T')[0],
    subject: '',
    pages_completed: '',
    notes: ''
  });
  
  const currentYear = 2026;

  useEffect(() => {
    const fetchPEI = async () => {
      console.log(`📚 [PEIViewer] Fetching PEI for student: ${studentId} for year ${currentYear}`);
      if (!studentId) return;
      
      try {
        setLoading(true);
        
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single();

        if (studentError) {
          console.error('❌ [PEIViewer] Error fetching student:', studentError);
          throw studentError;
        }
        
        setStudent(studentData);

        let { data: peiData, error: peiError } = await supabase
          .from('pei')
          .select('*')
          .eq('student_id', studentId)
          .eq('year', currentYear)
          .maybeSingle();

        if (peiError && peiError.code !== 'PGRST116') {
          console.error('❌ [PEIViewer] Error fetching PEI record:', peiError);
        }

        if (!peiData) {
          console.log(`ℹ️ [PEIViewer] No PEI found. Creating default PEI 2026 for ${studentData.first_name}.`);
          const defaultObjectives = ['Perfil Financiero', 'Consolidar vocabulario', 'Preparación SAT'];
          
          const { data: newPei, error: insertError } = await supabase
            .from('pei')
            .insert({
              student_id: studentId,
              year: currentYear,
              objectives: defaultObjectives,
              pacing_notes: 'Ritmo recomendado: 22-25 páginas diarias'
            })
            .select()
            .single();
            
          if (insertError) {
            console.error('❌ [PEIViewer] Error creating default PEI:', insertError);
            throw insertError;
          }
          
          peiData = newPei;

          const { error: pacingInsertErr } = await supabase.from('pei_pacing').insert([
            { pei_id: peiData.id, subject: 'Mathematics 1081', pages_per_day: 12, notes: 'Enfoque en resolución de problemas' },
            { pei_id: peiData.id, subject: 'English 1076', pages_per_day: 13, notes: 'Lectura, comprensión y escritura' }
          ]);
          
          if (pacingInsertErr) console.error('❌ [PEIViewer] Error creating default pacing:', pacingInsertErr);
        }

        setPei(peiData);

        const { data: pacingData, error: pacingErr } = await supabase
          .from('pei_pacing')
          .select('*')
          .eq('pei_id', peiData.id)
          .order('subject', { ascending: true });
          
        if (pacingErr) console.error('❌ [PEIViewer] Error fetching pacing:', pacingErr);
        setPacing(pacingData || []);

        const { data: notesData, error: notesErr } = await supabase
          .from('pei_daily_notes')
          .select('*')
          .eq('pei_id', peiData.id)
          .order('date', { ascending: false });
          
        if (notesErr) console.error('❌ [PEIViewer] Error fetching daily notes:', notesErr);
        setDailyNotes(notesData || []);

        console.log(`✅ [PEIViewer] PEI data loaded successfully.`);
      } catch (err) {
        console.error('❌ [PEIViewer] Fatal error loading PEI:', err);
        toast({ title: "Error", description: "Ocurrió un problema al cargar el PEI.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPEI();
  }, [studentId]);

  const handleRegisterNote = async (e) => {
    e.preventDefault();
    if (!pei || readOnly) return;
    
    if (!newNote.subject || !newNote.pages_completed) {
      toast({ title: "Validación", description: "Materia y páginas completadas son requeridas.", variant: "destructive" });
      return;
    }

    try {
      console.log(`📝 [PEIViewer] Registering daily note: ${newNote.subject} - ${newNote.pages_completed} pages`);
      const { data: insertedNote, error } = await supabase
        .from('pei_daily_notes')
        .insert({
          pei_id: pei.id,
          date: newNote.date,
          subject: newNote.subject,
          pages_completed: parseInt(newNote.pages_completed),
          notes: newNote.notes
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Éxito", description: "Nota diaria registrada correctamente." });
      setDailyNotes([insertedNote, ...dailyNotes]);
      setNewNote({ ...newNote, pages_completed: '', notes: '' }); 
      
    } catch (err) {
      console.error('❌ [PEIViewer] Error registering daily note:', err);
      toast({ title: "Error", description: "No se pudo registrar la nota.", variant: "destructive" });
    }
  };

  const generatePEIPDF = () => {
    if (!student || !pei) return;
    console.log(`📄 [PEIViewer] Generating PEI PDF...`);
    const doc = new jsPDF('p', 'mm', 'a4');
    
    doc.setFillColor(25, 25, 112);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CHANAK INTERNATIONAL ACADEMY', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('Programa Educativo Individualizado (PEI)', 105, 30, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Estudiante: ${student.first_name} ${student.last_name}`, 20, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`Año Académico: ${currentYear}`, 140, 55);
    doc.line(20, 60, 190, 60);

    let yPos = 70;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(25, 25, 112);
    doc.text('Objetivos Educativos', 20, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    pei.objectives?.forEach(obj => {
      const splitObj = doc.splitTextToSize(`• ${obj}`, 170);
      if (yPos + (splitObj.length * 5) > 280) { doc.addPage(); yPos = 20; }
      doc.text(splitObj, 25, yPos);
      yPos += splitObj.length * 6;
    });

    yPos += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(25, 25, 112);
    doc.text('Ritmo de Aprendizaje Sugerido', 20, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Materia', 25, yPos);
    doc.text('Páginas / Día', 90, yPos);
    doc.text('Notas', 130, yPos);
    yPos += 2;
    doc.line(20, yPos, 190, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    pacing.forEach(p => {
      if (yPos > 260) { doc.addPage(); yPos = 20; }
      doc.text(p.subject, 25, yPos);
      doc.text(p.pages_per_day?.toString() || '-', 95, yPos);
      const splitNotes = doc.splitTextToSize(p.notes || '-', 60);
      doc.text(splitNotes, 130, yPos);
      yPos += Math.max(8, splitNotes.length * 5);
    });

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(LEGAL_FOOTER, 105, 290, { align: 'center' });

    doc.save(`PEI_${student.first_name}_${student.last_name}_${currentYear}.pdf`);
    console.log(`✅ [PEIViewer] PDF Generated.`);
  };

  const totalPages = pacing.reduce((sum, p) => sum + (parseInt(p.pages_per_day) || 0), 0);

  if (loading) return <div className="p-8 text-center bg-white rounded-2xl border border-slate-200"><Loader2 className="animate-spin w-6 h-6 mx-auto text-[#191970] mb-2"/> Cargando PEI...</div>;
  if (!pei) return <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 flex flex-col items-center"><BookOpen className="w-8 h-8 mb-2 opacity-50"/> El PEI aún no ha sido configurado para este periodo.</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      <div className="bg-[#191970] px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-300" />
            Programa Educativo Individualizado (PEI)
          </h2>
          <p className="text-blue-200 text-sm mt-1">Año Académico {currentYear}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Button onClick={generatePEIPDF} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-bold border border-blue-400">
            <FileText className="w-4 h-4 mr-1.5" /> Descargar PEI
          </Button>
          <span className="bg-white/10 text-blue-100 border border-white/20 px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
            <Lock className="w-3 h-3" /> Solo lectura (Objetivos)
          </span>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">
        
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex gap-3 text-sm text-slate-600">
          <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <p>
            Los objetivos y el ritmo de aprendizaje son de solo lectura. Por favor, utilice la sección inferior para registrar el progreso diario del estudiante. 
            <br />
            <strong className="text-blue-700 mt-1 block">Total Diario: {totalPages} páginas/día (Rango recomendado: 22-25 págs/día)</strong>
          </p>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
            Objetivos Educativos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pei.objectives?.map((obj, i) => {
              let emoji = "📌";
              let bgClass = "bg-slate-50 border-slate-200 text-slate-700";
              
              if (obj.includes('Mathematics') || obj.includes('Preparación SAT')) { emoji = "📐"; bgClass = "bg-blue-50 border-blue-200 text-blue-800"; } 
              else if (obj.includes('English') || obj.includes('vocabulario')) { emoji = "📖"; bgClass = "bg-blue-50 border-blue-200 text-blue-800"; }
              else if (obj.includes('Financiero')) { emoji = "💰"; bgClass = "bg-emerald-50 border-emerald-200 text-emerald-800"; }

              return (
                <div key={i} className={`p-4 rounded-xl border ${bgClass} flex items-start gap-3 opacity-90 cursor-not-allowed`}>
                  <span className="text-lg">{emoji}</span>
                  <p className="font-medium mt-0.5 text-sm">{obj}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
            Ritmo de Aprendizaje (Pacing)
          </h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="p-3 font-semibold">Asignatura</th>
                  <th className="p-3 font-semibold text-center w-32">Páginas/Día</th>
                  <th className="p-3 font-semibold">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pacing.map((p, i) => (
                  <tr key={i} className="bg-white">
                    <td className="p-3">
                      <div className="w-full border border-slate-200 rounded px-3 py-2 text-slate-500 bg-slate-50 font-medium cursor-not-allowed">{p.subject}</div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="w-16 text-center border border-slate-200 rounded px-2 py-2 mx-auto text-slate-500 bg-slate-50 font-bold cursor-not-allowed">{p.pages_per_day || '-'}</div>
                    </td>
                    <td className="p-3">
                      <div className="w-full border border-slate-200 rounded px-3 py-2 text-slate-500 bg-slate-50 cursor-not-allowed">{p.notes || '-'}</div>
                    </td>
                  </tr>
                ))}
                {pacing.length === 0 && <tr><td colSpan="3" className="p-4 text-center text-slate-500">Sin ritmo configurado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <hr className="border-slate-200" />

        <div>
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-6 bg-amber-500 rounded-full"></div>
            📝 Registro de Notas Diarias
          </h3>
          
          <form onSubmit={handleRegisterNote} className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Fecha</label>
                <Input type="date" required value={newNote.date} onChange={(e) => setNewNote({...newNote, date: e.target.value})} className="bg-white" disabled={readOnly} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Asignatura</label>
                <select 
                  required
                  value={newNote.subject} 
                  onChange={(e) => setNewNote({...newNote, subject: e.target.value})}
                  disabled={readOnly}
                  className="w-full bg-white text-slate-900 border border-slate-200 rounded-md h-10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccione...</option>
                  {pacing.map(p => <option key={p.id} value={p.subject}>{p.subject}</option>)}
                  <option value="Otra">Otra...</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Páginas Completadas</label>
                <Input type="number" required min="1" placeholder="Ej. 12" value={newNote.pages_completed} onChange={(e) => setNewNote({...newNote, pages_completed: e.target.value})} className="bg-white" disabled={readOnly} />
              </div>
              <div className="flex gap-2 h-10">
                <Button type="submit" disabled={readOnly} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
                  ➕ Registrar
                </Button>
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-bold text-slate-600 mb-1">Notas Opcionales</label>
                <Input type="text" placeholder="Observaciones sobre la sesión..." value={newNote.notes} onChange={(e) => setNewNote({...newNote, notes: e.target.value})} className="bg-white" disabled={readOnly} />
              </div>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-bold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Historial de Notas
            </div>
            {dailyNotes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No hay notas registradas todavía.</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                {dailyNotes.map(note => (
                  <div key={note.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{note.subject}</span>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{new Date(note.date).toLocaleDateString()}</span>
                      </div>
                      {note.notes && <p className="text-xs text-slate-500 mt-1">{note.notes}</p>}
                    </div>
                    <div className="bg-blue-100 text-blue-800 font-bold text-sm px-3 py-1 rounded-full shrink-0">
                      {note.pages_completed} páginas
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
