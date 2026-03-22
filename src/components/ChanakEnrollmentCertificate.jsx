
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Download, FileCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ChanakEnrollmentCertificate = ({ studentId, paymentStatus, studentName, studentLastName, gradeLevel, passportNumber, isScholarship }) => {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const canDownload = paymentStatus === 'paid' || paymentStatus === 'active' || isScholarship || paymentStatus === 'scholarship';

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const currentYear = new Date().getFullYear();
      
      // Theme colors
      const primaryColor = [25, 25, 112]; // Midnight Blue

      // Border
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.rect(15, 15, 180, 267);
      doc.setLineWidth(0.2);
      doc.rect(17, 17, 176, 263);

      // Header Area
      doc.setFillColor(...primaryColor);
      doc.rect(15, 15, 180, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('times', 'bold');
      doc.setFontSize(24);
      doc.text('CHANAK INTERNATIONAL ACADEMY', 105, 35, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('FDOE Code: 134620 | Florida Not-For-Profit Corporation', 105, 45, { align: 'center' });

      // Document Title
      doc.setTextColor(0, 0, 0);
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.text('CERTIFICATE OF ENROLLMENT', 105, 75, { align: 'center' });
      doc.setLineWidth(0.5);
      doc.line(75, 78, 135, 78);

      // Date
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date of Issue: ${today}`, 165, 90, { align: 'right' });

      // Body Text
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      
      const bodyText = `This document certifies that the student named below is officially enrolled as a full-time student at Chanak International Academy for the ${currentYear}-${currentYear+1} academic year. The student is participating in our accredited distance learning program utilizing the Accelerated Christian Education (A.C.E.) curriculum.`;
      
      const textLines = doc.splitTextToSize(bodyText, 150);
      doc.text(textLines, 30, 110);

      // Student Details Box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(30, 135, 150, 45, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.text('Student Name:', 40, 150);
      doc.setFont('helvetica', 'normal');
      doc.text(`${studentName} ${studentLastName}`, 85, 150);

      doc.setFont('helvetica', 'bold');
      doc.text('Grade Level:', 40, 162);
      doc.setFont('helvetica', 'normal');
      doc.text(gradeLevel || 'N/A', 85, 162);

      doc.setFont('helvetica', 'bold');
      doc.text('ID/Passport:', 40, 174);
      doc.setFont('helvetica', 'normal');
      doc.text(passportNumber || 'N/A', 85, 174);

      // Footer Text
      doc.setFont('times', 'italic');
      doc.setFontSize(11);
      doc.text('This certificate is valid for official academic and administrative purposes.', 105, 200, { align: 'center' });

      // Signature
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.text('Sincerely,', 30, 225);
      
      doc.setFont('times', 'italic');
      doc.setFontSize(22);
      doc.setTextColor(...primaryColor);
      doc.text('Mariela Andrade', 30, 245);
      
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(30, 248, 90, 248);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Mariela Andrade', 30, 254);
      doc.setFont('helvetica', 'normal');
      doc.text('Head of School', 30, 259);

      // Footer Info
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('Email: offcampus@chanakacademy.org | Phone: +1 (727) 555-0100', 105, 270, { align: 'center' });
      doc.text('Address: 7901 4th St N, Ste 300, St. Petersburg, FL 33702, USA', 105, 275, { align: 'center' });

      doc.save(`Enrollment_Certificate_${studentName}_${studentLastName}.pdf`);
      toast({ title: 'Éxito', description: 'Certificado generado correctamente.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Fallo al generar el certificado.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-5 h-full">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-700 flex items-center justify-center rounded-xl shrink-0">
          <FileCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 leading-tight">Certificate of Enrollment</h3>
          <p className="text-xs text-slate-500 mt-0.5">Certificado Oficial (FDOE 134620)</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
        {!canDownload ? (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-sm text-amber-800 w-full">
            El certificado estará disponible una vez confirmado el pago de matrícula.
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-sm text-emerald-800 w-full flex flex-col gap-2 items-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            <p><strong>Documento Habilitado</strong><br/>Certificado listo para descarga.</p>
          </div>
        )}
      </div>

      <Button 
        onClick={generatePDF} 
        disabled={generating || !canDownload}
        className={`w-full font-bold py-2.5 h-auto transition-all ${
          canDownload 
            ? 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-sm' 
            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
        }`}
      >
        {generating ? <span className="spinner-emoji mr-2 text-sm">⏳</span> : <Download className="w-4 h-4 mr-2" />}
        📥 Descargar Certificado
      </Button>
    </div>
  );
};

export default ChanakEnrollmentCertificate;
