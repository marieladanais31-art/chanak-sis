
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { FileCheck, Info, CheckCircle2, Clock, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ACADEMY_SETTINGS } from '@/context/AuthContext';

export default function EnrolmentDeclaration({ 
  studentId, 
  paymentStatus, 
  studentName = 'Student', 
  studentLastName = '', 
  gradeLevel = 'N/A', 
  academicLevel = 'N/A' 
}) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const isPaid = paymentStatus?.toLowerCase() === 'paid' || paymentStatus?.toLowerCase() === 'active';

  const generateEnrolmentPDF = () => {
    console.log(`📄 [EnrolmentDeclaration] Generating PDF for ${studentName} ${studentLastName}...`);
    try {
      setGenerating(true);
      const doc = new jsPDF('p', 'mm', 'a4');
      const today = new Date().toLocaleDateString();

      // Dark Blue Header
      doc.setFillColor(25, 25, 112); 
      doc.rect(0, 0, 210, 45, 'F');

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`🎓 ${ACADEMY_SETTINGS.name}`, 105, 25, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Homeschool Program  |  FDOE Code: ${ACADEMY_SETTINGS.fdoe_code}`, 105, 33, { align: 'center' });

      // Main Title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('DECLARATION OF ENROLMENT', 105, 65, { align: 'center' });

      // Document Details
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Document No.: ${ACADEMY_SETTINGS.florida_corp_number}`, 20, 85);
      doc.text(`Date: ${today}`, 20, 93);

      // Student Information Section
      doc.setFont('helvetica', 'bold');
      doc.text('Student Information:', 20, 110);
      doc.setFont('helvetica', 'normal');

      doc.text(`• Full Name: ${studentName} ${studentLastName}`, 25, 120);
      doc.text(`• Grade Level: ${gradeLevel}`, 25, 127);
      doc.text(`• Academic Level: ${academicLevel}`, 25, 134);

      // Body Text
      const bodyText = `To whom it may concern,\n\nThis document officially certifies that the above-named student is currently enrolled at ${ACADEMY_SETTINGS.name} Homeschool Program for the present academic year.\n\nThis institution is committed to providing excellent educational services in accordance with established academic standards. This certificate is issued upon the request of the interested party for whatever legal purpose it may serve.`;

      const splitText = doc.splitTextToSize(bodyText, 170);
      doc.text(splitText, 20, 155);

      // Signature Area
      const sigY = 220;
      doc.setDrawColor(0, 0, 0);
      doc.line(75, sigY, 135, sigY); 
      
      doc.setFont('times', 'italic');
      doc.setFontSize(24);
      doc.setTextColor(25, 25, 112);
      doc.text(ACADEMY_SETTINGS.head_of_school, 105, sigY - 5, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(ACADEMY_SETTINGS.head_of_school, 105, sigY + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(ACADEMY_SETTINGS.head_of_school_title, 105, sigY + 14, { align: 'center' });
      doc.text(`Date: ${today}`, 105, sigY + 20, { align: 'center' });

      // Legal Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${ACADEMY_SETTINGS.email} | ${ACADEMY_SETTINGS.address}`, 105, 285, { align: 'center' });
      const footerText = `Florida Not-For-Profit Corporation (${ACADEMY_SETTINGS.florida_corp_number}) - FDOE ${ACADEMY_SETTINGS.fdoe_code}`;
      doc.text(footerText, 105, 290, { align: 'center' });

      doc.save(`Enrolment_Declaration_${studentName}_${studentLastName}_${new Date().getFullYear()}.pdf`);
      console.log(`📄 [EnrolmentDeclaration] PDF Downloaded successfully.`);
      toast({ title: "Éxito", description: "Documento descargado correctamente." });
    } catch (error) {
      console.error('📄 [EnrolmentDeclaration] Error generating PDF:', error);
      toast({ title: "Error", description: "Hubo un problema al generar el PDF.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-5 h-full">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-xl shrink-0">
          <FileCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 leading-tight">Enrolment Declaration</h3>
          <p className="text-xs text-slate-500 mt-0.5">Official proof of enrollment</p>
        </div>
      </div>
      
      <div className="flex-1 space-y-4">
        {isPaid ? (
          <div className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-50 p-3 rounded-xl border border-green-100">
            <CheckCircle2 className="w-4 h-4" />
            ✅ Document available for download
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm font-bold text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
            <Clock className="w-4 h-4" />
            ⏳ Document will be available once payment is confirmed
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-700 space-y-2">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                This document certifies that <strong>{studentName} {studentLastName}</strong> is officially enrolled.
              </p>
              <ul className="text-xs text-slate-500 list-disc pl-4 mt-2">
                <li>Grade Level: {gradeLevel}</li>
                <li>Academic Level: {academicLevel}</li>
              </ul>
            </div>
          </div>
          <div className="mt-3 pl-8 space-y-1 text-[11px] text-slate-400 font-mono">
            <p>Florida Corp ({ACADEMY_SETTINGS.florida_corp_number}) - FDOE Code {ACADEMY_SETTINGS.fdoe_code}</p>
          </div>
        </div>
      </div>

      <Button 
        onClick={generateEnrolmentPDF} 
        disabled={generating || !isPaid}
        className={`w-full font-medium py-2.5 h-auto transition-all ${
          isPaid 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 hover:bg-slate-100'
        }`}
      >
        {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        📥 Exportar Declaration
      </Button>
    </div>
  );
}
