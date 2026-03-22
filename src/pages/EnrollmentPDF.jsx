
import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '@/lib/customSupabaseClient';
import { Download, Loader2, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function EnrollmentPDF({ studentId, signed }) {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentId) return;
      try {
        console.log(`📥 [EnrollmentPDF] Fetching data for student: ${studentId}`);
        const { data, error } = await supabase
          .from('students')
          .select('id, first_name, last_name, full_name, grade_level, passport_number')
          .eq('id', studentId)
          .single();

        if (error) throw error;
        setStudentData(data);
        console.log(`✅ [EnrollmentPDF] Student data loaded:`, data);
      } catch (err) {
        console.error(`❌ [EnrollmentPDF] Error fetching student:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId]);

  if (!signed) return null;

  const generatePDF = () => {
    if (!studentData) {
      toast({ title: 'Error', description: 'No hay datos del estudiante disponibles.', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    const studentName = studentData.full_name || `${studentData.first_name || ''} ${studentData.last_name || ''}`.trim();
    console.log(`📥 [EnrollmentPDF] Generating PDF for ${studentName}...`);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header Text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(30, 58, 138); // Dark blue
      doc.text('CHANAK International Academy - FDOE 134620', pageWidth / 2, 30, { align: 'center' });

      // Title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('DECLARATION OF ENROLMENT', pageWidth / 2, 50, { align: 'center' });

      // Body Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);

      const grade = studentData.grade_level || 'N/A';
      const passport = studentData.passport_number || 'N/A';

      const bodyText = `This letter confirms that ${studentName} is duly enrolled and registered with Chanak International Academy for the academic year 2026-2027. [ID/Passport: ${passport}]. Academic Level: ${grade}. All students follow an Individualized Educational Plan (IEP) based on the Accelerated Christian Education (A.C.E.) curriculum.`;
      
      const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
      doc.text(splitBody, 20, 80);

      // Footer
      const footerY = 150;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(20, footerY, 100, footerY); // Signature line
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Mariela Andrade (Head of School) - EIN 36-5154011', 20, footerY + 10);

      // Save PDF
      doc.save(`Enrollment_${studentName}.pdf`);
      console.log(`✅ [EnrollmentPDF] PDF successfully generated and downloaded.`);
      toast({ title: 'Éxito', description: 'Documento generado y descargado correctamente.' });

    } catch (error) {
      console.error(`❌ [EnrollmentPDF] Error generating PDF:`, error);
      toast({ title: 'Error', description: 'No se pudo generar el documento.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500 text-sm mt-4"><Loader2 className="w-4 h-4 animate-spin"/> Preparando documento...</div>;
  }

  return (
    <button
      onClick={generatePDF}
      disabled={generating}
      className="mt-4 flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-70"
    >
      {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
      📥 Descargar Confirmación de Matrícula
    </button>
  );
}
