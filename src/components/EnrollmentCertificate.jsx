
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Loader2, Download, FileCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getGradeLabel } from '@/constants/gradelevels';

const EnrollmentCertificate = ({ studentId, paymentStatus, studentName, studentLastName, gradeLevel, passportNumber, isScholarship }) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const canDownload = paymentStatus === 'paid' || paymentStatus === 'active' || isScholarship || paymentStatus === 'scholarship';

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const currentYear = new Date().getFullYear();
      const refNumber = `134620-${currentYear}-${studentId?.substring(0, 6) || '000000'}`;
      const academyName = 'CHANAK TRAINUP EDUCATION INC (operando como Chanak International Academy)';

      // Border frame
      doc.setDrawColor(25, 25, 112);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277);

      // Header 
      doc.setFillColor(25, 25, 112); 
      doc.rect(10, 10, 190, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('times', 'bold');
      doc.text(`🎓 Chanak International Academy`, 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`FDOE Code: 134620 | Florida Not-For-Profit Corporation`, 105, 42, { align: 'center' });

      // Document Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ref: ${refNumber}`, 20, 70);
      doc.text(`Date: ${today}`, 150, 70);

      // Body Paragraph 1 (Urbina Escobar model)
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text('DECLARATION OF ENROLLMENT', 105, 85, { align: 'center' });

      doc.setFont('times', 'normal');
      const p1 = `This letter confirms that the following student is duly enrolled and registered with ${academyName} for the academic year ${currentYear}-${currentYear + 1}:`;
      const lines1 = doc.splitTextToSize(p1, 170);
      doc.text(lines1, 20, 100);

      // Student Info Block
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(20, 115, 170, 35, 2, 2, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Student Full Name:', 25, 125);
      doc.setFont('helvetica', 'normal');
      doc.text(`${studentName} ${studentLastName}`, 75, 125);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Academic Level:', 25, 135);
      doc.setFont('helvetica', 'normal');
      doc.text(getGradeLabel(gradeLevel) || gradeLevel || 'N/A', 75, 135);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Student ID / Passport:', 25, 145);
      doc.setFont('helvetica', 'normal');
      doc.text(passportNumber || 'N/A', 75, 145);

      // Body Paragraph 2
      doc.setFontSize(12);
      doc.setFont('times', 'normal');
      const p2 = `The student is actively following an Individualized Educational Plan (IEP) based on the Accelerated Christian Education (A.C.E.) curriculum, utilizing our recognized distance learning model to fulfill all educational requirements.`;
      const lines2 = doc.splitTextToSize(p2, 170);
      doc.text(lines2, 20, 170);

      // Institutional Note
      const p3 = `${academyName} is a private international educational institution dedicated to providing individualized academic excellence.`;
      const lines3 = doc.splitTextToSize(p3, 170);
      doc.text(lines3, 20, 195);

      // Closing
      doc.text('Sincerely,', 20, 225);

      // Signature Area (Urbina Escobar block)
      let yPos = 250;
      doc.setDrawColor(0, 0, 0);
      doc.line(20, yPos, 80, yPos); 
      
      doc.setFont('times', 'italic');
      doc.setFontSize(22);
      doc.setTextColor(25, 25, 112);
      doc.text('Mariela Andrade', 20, yPos - 5);

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Mariela Andrade', 20, yPos + 6);
      doc.setFont('helvetica', 'normal');
      doc.text('Head of School', 20, yPos + 11);

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Email: offcampus@chanakacademy.org`, 105, 275, { align: 'center' });
      doc.text(`Address: 7901 4th St N, Ste 300, St. Petersburg, FL 33702, USA`, 105, 280, { align: 'center' });

      doc.save(`Declaration_of_Enrollment_${studentName}_${studentLastName}.pdf`);
      toast({ title: 'Éxito', description: 'Declaración de matrícula generada.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Fallo al generar el documento', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-5 h-full">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 bg-blue-50 text-blue-700 flex items-center justify-center rounded-xl shrink-0">
          <FileCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 leading-tight">Declaration of Enrollment</h3>
          <p className="text-xs text-slate-500 mt-0.5">Carta Formal (Modelo Urbina Escobar)</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
        {!canDownload ? (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800 w-full">
            La carta de matrícula estará disponible una vez confirmado el pago del servicio.
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-800 w-full flex flex-col gap-2 items-center">
            <CheckCircle2 className="w-8 h-8 text-blue-500" />
            <p><strong>Documento Habilitado</strong><br/>Carta oficial lista para descarga.</p>
          </div>
        )}
      </div>

      <Button 
        onClick={generatePDF} 
        disabled={generating || !canDownload}
        className={`w-full font-bold py-2.5 h-auto transition-all ${
          canDownload 
            ? 'bg-blue-700 hover:bg-blue-800 text-white shadow-sm' 
            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
        }`}
      >
        {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        📥 Descargar Carta Oficial
      </Button>
    </div>
  );
};

export default EnrollmentCertificate;
