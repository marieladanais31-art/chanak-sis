
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { FileText, Download, Loader2, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function StudentGrades({ studentId }) {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingBulletin, setGeneratingBulletin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (studentId) {
      loadGrades();
    }
  }, [studentId]);

  const loadGrades = async () => {
    setLoading(true);
    try {
      // Assuming a general structure from schema where we fetch from student_grades joined with subjects
      const { data, error } = await supabase
        .from('student_grades')
        .select(`
          id, grade_1, grade_2, grade_3, grade_4, final_grade, teacher_comments, term,
          subjects ( id, name, category )
        `)
        .eq('student_id', studentId);

      if (error && error.code !== 'PGRST116') throw error;
      setGrades(data || []);
    } catch (error) {
      console.error('Error loading grades:', error);
      toast({ title: 'Error', description: 'No se pudieron cargar las calificaciones.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateGradeBulletin = async () => {
    setGeneratingBulletin(true);
    try {
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable'); // Ensure autotable is imported

      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('full_name, first_name, last_name, current_grade, fdoe_code')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      const studentName = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Estudiante';
      const gradeLvl = student.current_grade || 'N/A';
      const enrollmentNo = student.fdoe_code || 'N/A';
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header: "CHANAK INTERNATIONAL ACADEMY"
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(25, 61, 109); // Dark Blue #193D6D
      doc.text('CHANAK INTERNATIONAL ACADEMY', pageWidth / 2, 20, { align: 'center' });

      // Subheader: "FLDOE #134620"
      doc.setFontSize(10);
      doc.setTextColor(32, 178, 170); // Aquamarine #20B2AA
      doc.text('FLDOE #134620', pageWidth / 2, 26, { align: 'center' });

      // Title: "BOLETÍN DE CALIFICACIONES"
      doc.setFontSize(14);
      doc.setTextColor(25, 61, 109); 
      doc.text('BOLETÍN DE CALIFICACIONES', pageWidth / 2, 40, { align: 'center' });

      // Student Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Nombre: ${studentName}`, 14, 55);
      doc.text(`Grado: ${gradeLvl}`, 14, 62);
      doc.text(`Número de Matrícula: ${enrollmentNo}`, 120, 55);
      doc.text(`Año Académico: 2024-2025`, 120, 62);

      // Group Grades by Section
      const coreGrades = grades.filter(g => g.subjects?.category === 'Core/ACE');
      const localGrades = grades.filter(g => g.subjects?.category === 'Local Subjects');
      const electivesGrades = grades.filter(g => g.subjects?.category === 'Electives' || g.subjects?.category === 'Life Skills');

      let startY = 75;

      const buildTable = (title, gradeList) => {
        if (!gradeList || gradeList.length === 0) return;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(25, 61, 109);
        doc.text(title, 14, startY);
        
        const tableData = gradeList.map(g => [
          g.subjects?.name || 'N/A',
          g.grade_1 || '-',
          g.grade_2 || '-',
          g.grade_3 || '-',
          g.grade_4 || '-',
          g.final_grade || '-',
          g.teacher_comments || ''
        ]);

        doc.autoTable({
          startY: startY + 5,
          head: [['Área/Subject', 'G1', 'G2', 'G3', 'G4', 'Final Grade', 'Comments']],
          body: tableData,
          headStyles: { fillColor: [25, 61, 109], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          styles: { font: 'helvetica', fontSize: 9 },
          margin: { left: 14, right: 14 }
        });
        
        startY = doc.lastAutoTable.finalY + 15;
      };

      buildTable('Core/ACE Subjects', coreGrades);
      buildTable('Local Subjects', localGrades);
      buildTable('Electives/Life Skills', electivesGrades);

      if (grades.length === 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text('No hay calificaciones registradas para este periodo.', pageWidth / 2, startY, { align: 'center' });
        startY += 20;
      }

      // Footer
      const footerY = doc.internal.pageSize.height - 20;
      doc.setDrawColor(32, 178, 170); // Aquamarine #20B2AA
      doc.setLineWidth(0.5);
      doc.line(14, footerY - 5, pageWidth - 14, footerY - 5);
      
      const dateStr = new Date().toLocaleDateString('es-ES');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Chanak International Academy - Generado el ${dateStr}`, pageWidth / 2, footerY, { align: 'center' });

      // Save PDF
      doc.save(`Boletin_Calificaciones_${studentName.replace(/\s+/g, '_')}.pdf`);
      toast({ title: 'Éxito', description: 'Boletín generado correctamente.' });

    } catch (error) {
      console.error('Error generating bulletin PDF:', error);
      toast({ title: 'Error', description: 'No se pudo generar el boletín. Verifique la consola para detalles.', variant: 'destructive' });
    } finally {
      setGeneratingBulletin(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: '#193D6D' }}>
            <BookOpen className="w-6 h-6" style={{ color: '#20B2AA' }} /> Calificaciones y Boletín
          </h2>
          <p className="text-sm text-slate-500 mt-1">Consulta y descarga el récord académico oficial del estudiante.</p>
        </div>
        <button 
          onClick={generateGradeBulletin}
          disabled={generatingBulletin || loading}
          className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
          style={{ backgroundColor: '#193D6D' }}
        >
          {generatingBulletin ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Descargar Boletín de Calificaciones
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#20B2AA' }} />
          </div>
        ) : grades.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-500">
            No hay registros de calificaciones disponibles en este momento.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="text-white" style={{ backgroundColor: '#193D6D' }}>
                <tr>
                  <th className="p-3 font-bold">Materia</th>
                  <th className="p-3 font-bold">G1</th>
                  <th className="p-3 font-bold">G2</th>
                  <th className="p-3 font-bold">G3</th>
                  <th className="p-3 font-bold">G4</th>
                  <th className="p-3 font-bold text-[#20B2AA]">Final</th>
                  <th className="p-3 font-bold">Comentarios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {grades.map((grade) => (
                  <tr key={grade.id} className="hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{grade.subjects?.name || 'Materia Desconocida'}</td>
                    <td className="p-3 text-slate-600">{grade.grade_1 || '-'}</td>
                    <td className="p-3 text-slate-600">{grade.grade_2 || '-'}</td>
                    <td className="p-3 text-slate-600">{grade.grade_3 || '-'}</td>
                    <td className="p-3 text-slate-600">{grade.grade_4 || '-'}</td>
                    <td className="p-3 font-bold" style={{ color: '#193D6D' }}>{grade.final_grade || '-'}</td>
                    <td className="p-3 text-slate-500 text-xs">{grade.teacher_comments || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
