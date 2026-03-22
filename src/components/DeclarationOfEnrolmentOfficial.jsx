import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { Download, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function DeclarationOfEnrolmentOfficial({ studentName, passportNumber, gradeLevel }) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const primaryColor = [25, 25, 112];

      // Border
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(1);
      doc.rect(15, 15, 180, 267);
      
      // Header Area
      doc.setFillColor(...primaryColor);
      doc.rect(15, 15, 180, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('times', 'bold');
      doc.setFontSize(22);
      doc.text('CHANAK INTERNATIONAL ACADEMY', 105, 30, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('FDOE Code: 134620 | Florida Not-For-Profit Corporation', 105, 40, { align: 'center' });

      // Title
      doc.setTextColor(0, 0, 0);
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      doc.text('DECLARATION OF ENROLMENT', 105, 70, { align: 'center' });
      doc.setLineWidth(0.5);
      doc.line(75, 72, 135, 72);

      // Date
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${today}`, 175, 85, { align: 'right' });

      // Student Info Box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(25, 95, 160, 40, 3, 3, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.text('Student Details', 30, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(`Name: ${studentName || '________________________'}`, 30, 115);
      doc.text(`Passport / ID: ${passportNumber || '________________________'}`, 30, 122);
      doc.text(`Grade Level: ${gradeLevel || '________________________'}`, 110, 115);

      // Text Block
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      
      const bodyText = `This document formally declares that the student mentioned above is officially enrolled at Chanak International Academy. Based on the academic assessment and diagnosis, an Individualized Educational Plan (PEI) has been established to ensure academic progress aligned with international standards.`;
      
      const legalText = `In accordance with the guidelines established by Urbina Escobar and international education frameworks, this Individualized Educational Plan guarantees a customized pacing tailored to the student's unique vocational goals and learning capabilities.`;

      const splitBody = doc.splitTextToSize(bodyText, 160);
      const splitLegal = doc.splitTextToSize(legalText, 160);
      
      doc.text(splitBody, 25, 150);
      doc.text(splitLegal, 25, 175);

      // Signature
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.text('Sincerely,', 25, 215);
      
      doc.setFont('times', 'italic');
      doc.setFontSize(22);
      doc.setTextColor(...primaryColor);
      doc.text('Mariela Andrade', 25, 235);
      
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(25, 238, 85, 238);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Mariela Andrade', 25, 244);
      doc.setFont('helvetica', 'normal');
      doc.text('Head of School', 25, 249);

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text('Email: offcampus@chanakacademy.org', 105, 270, { align: 'center' });
      doc.text('Address: 7901 4th St N, Ste 300, St. Petersburg, FL 33702, USA', 105, 275, { align: 'center' });

      doc.save(`Declaration_${studentName || 'Student'}.pdf`);
      toast({ title: 'Éxito', description: 'Declaración generada y descargada correctamente.' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Fallo al generar PDF.', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-4">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-700 flex items-center justify-center rounded-xl shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Declaración Oficial de Matrícula</h3>
          <p className="text-xs text-slate-500">Documento certificado bajo FDOE 134620</p>
        </div>
      </div>
      
      <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        <p>Certifica la inscripción y el PEI activo del estudiante bajo lineamientos oficiales.</p>
      </div>

      <Button 
        onClick={generatePDF} 
        disabled={generating}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
      >
        {generating ? <span className="animate-spin inline-block mr-2">⏳</span> : <Download className="w-4 h-4 mr-2" />}
        Generar Declaración PDF
      </Button>
    </div>
  );
}