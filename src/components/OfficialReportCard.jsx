
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import jsPDF from 'jspdf';
import { Loader2, Download, FileText, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getCachedData, setCachedData } from '@/lib/cacheUtils';
import { getGradeLabel } from '@/constants/gradelevels';

const CATEGORIES = [
  'Core (A.C.E.)', 
  'Life Skills', 
  'Second Language', 
  'Local Social Studies', 
  'Electivas'
];

const OfficialReportCard = ({ studentId, studentName, studentLastName, gradeLevel, passportNumber }) => {
  const { academySettings } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!studentId) return;
      const subCacheKey = `academic_registry_${studentId}`;
      try {
        setLoading(true);
        const { data: subData, error: subError } = await supabase
          .from('student_subjects')
          .select('*')
          .eq('student_id', studentId)
          .order('category', { ascending: true });
          
        if (subError) throw subError;
        setSubjects(subData || []);
        if(subData) setCachedData(subCacheKey, subData);
      } catch (err) {
        setSubjects(getCachedData(subCacheKey) || []);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [studentId]);

  const generatePDF = () => {
    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const today = new Date().toLocaleDateString();
      const currentYear = new Date().getFullYear();
      const refNumber = `134620-${currentYear}-${studentId?.substring(0, 6) || '000000'}`;

      // Header 
      doc.setFillColor(25, 25, 112); 
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`📊 ${academySettings?.name || 'Chanak International Academy'}`, 105, 25, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`FDOE Code: 134620 | Florida Corp: ${academySettings?.florida_corp_number || ''}`, 105, 33, { align: 'center' });

      // Title & Ref
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL REPORT CARD', 105, 60, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Ref: ${refNumber}`, 105, 66, { align: 'center' });

      // Student Info Box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(20, 72, 170, 25, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`Student Name:`, 25, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(`${studentName} ${studentLastName || ''}`, 55, 80);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Grade Level:`, 115, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(getGradeLabel(gradeLevel) || gradeLevel || 'N/A', 145, 80);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Date of Issue:`, 25, 90);
      doc.setFont('helvetica', 'normal');
      doc.text(`${today}`, 55, 90);

      doc.setFont('helvetica', 'bold');
      doc.text(`Student ID / Passport:`, 115, 90);
      doc.setFont('helvetica', 'normal');
      doc.text(passportNumber || 'N/A', 155, 90);

      // Calculations
      const mappedSubjects = subjects.map(sub => {
        let cat = sub.category;
        if (cat === 'Core' || cat === 'Core Subjects' || cat === 'Core A.C.E.') cat = 'Core (A.C.E.)';
        return { ...sub, displayCategory: cat };
      });

      const currentSubjects = mappedSubjects.filter(s => !s.is_transferred && s.displayCategory !== 'Materias Transferidas');
      const transferredSubjects = mappedSubjects.filter(s => s.is_transferred || s.displayCategory === 'Materias Transferidas');

      const totalCredits = currentSubjects.reduce((acc, curr) => acc + (Number(curr.credits) || 1.0), 0);
      const validGrades = currentSubjects.filter(s => s.grade);
      const totalGrades = validGrades.reduce((acc, curr) => acc + Number(curr.grade || 0), 0);
      const gpa = validGrades.length > 0 ? (totalGrades / validGrades.length).toFixed(1) : 0;

      // Summary Box
      doc.setFillColor(235, 240, 255);
      doc.roundedRect(20, 100, 170, 15, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Cumulative Average:`, 30, 109);
      doc.setFont('helvetica', 'normal');
      doc.text(`${gpa}%`, 70, 109);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Earned Credits:`, 115, 109);
      doc.setFont('helvetica', 'normal');
      doc.text(`${totalCredits.toFixed(1)}`, 160, 109);

      let yPos = 125;

      // Grouped Subjects (Current)
      CATEGORIES.forEach(category => {
        const catSubs = currentSubjects.filter(s => s.displayCategory === category);
        if (catSubs.length === 0) return;

        if (yPos > 220) { doc.addPage(); yPos = 20; }

        doc.setFillColor(240, 245, 255);
        doc.rect(20, yPos - 5, 170, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(25, 25, 112);
        doc.text(category.toUpperCase(), 25, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('SUBJECT', 25, yPos);
        if (category === 'Core (A.C.E.)') doc.text('PACEs', 100, yPos);
        doc.text('GRADE', 145, yPos);
        doc.text('CREDITS', 170, yPos);
        yPos += 2;
        doc.setDrawColor(220, 220, 220);
        doc.line(20, yPos, 190, yPos);
        yPos += 6;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        let catCredits = 0;
        catSubs.forEach(sub => {
          if (yPos > 240) { doc.addPage(); yPos = 20; }
          const creditVal = Number(sub.credits) || 1.0;
          catCredits += creditVal;
          doc.text(sub.subject_name.substring(0, 35), 25, yPos);
          if (category === 'Core (A.C.E.)') doc.text(sub.pace_number ? `${sub.pace_number}` : '-', 100, yPos);
          doc.text(sub.grade ? `${sub.grade}%` : '-', 145, yPos);
          doc.text(`${creditVal.toFixed(1)}`, 170, yPos);
          yPos += 6;
        });
        
        yPos += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`Subtotal Credits: ${catCredits.toFixed(1)}`, 170, yPos, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        yPos += 8;
      });

      // Transferred Credits Section
      if (transferredSubjects.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }
        
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos - 5, 170, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);
        doc.text("CRÉDITOS TRANSFERIDOS", 25, yPos);
        yPos += 8;

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("* Estas materias provienen de instituciones previas y no afectan el promedio GPA actual.", 25, yPos);
        yPos += 6;

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('SUBJECT', 25, yPos);
        doc.text('SOURCE', 85, yPos);
        doc.text('GRADE', 145, yPos);
        doc.text('CREDITS', 170, yPos);
        yPos += 2;
        doc.setDrawColor(220, 220, 220);
        doc.line(20, yPos, 190, yPos);
        yPos += 6;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        let transCredits = 0;
        transferredSubjects.forEach(sub => {
          if (yPos > 240) { doc.addPage(); yPos = 20; }
          const creditVal = Number(sub.credits) || 0;
          transCredits += creditVal;
          doc.text(sub.subject_name.substring(0, 30), 25, yPos);
          doc.text((sub.transfer_source || 'N/A').substring(0, 30), 85, yPos);
          doc.text(sub.grade ? `${sub.grade}%` : '-', 145, yPos);
          doc.text(`${creditVal.toFixed(1)}`, 170, yPos);
          yPos += 6;
        });
        
        yPos += 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`Total Transferred: ${transCredits.toFixed(1)}`, 170, yPos, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        yPos += 12;
      }

      // Signature Area
      if (yPos > 230) { doc.addPage(); yPos = 50; } else { yPos += 20; }
      
      doc.setDrawColor(0, 0, 0);
      doc.line(75, yPos, 135, yPos); 
      
      doc.setFont('times', 'italic');
      doc.setFontSize(24);
      doc.setTextColor(25, 25, 112);
      doc.text('Mariela Andrade', 105, yPos - 5, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Mariela Andrade', 105, yPos + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('Head of School', 105, yPos + 11, { align: 'center' });

      // Footer 
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Email: offcampus@chanakacademy.org | ${academySettings?.address || ''}`, 105, 285, { align: 'center' });
      doc.text(`Florida Not-For-Profit Corporation - FDOE Code: 134620`, 105, 290, { align: 'center' });

      doc.save(`Official_Report_Card_${studentName}_${studentLastName}.pdf`);
      toast({ title: 'Éxito', description: 'Boletín Oficial descargado correctamente' });
    } catch (error) {
      toast({ title: 'Error', description: 'Fallo al generar el boletín', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="animate-spin w-4 h-4"/></div>;

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col space-y-5 h-full">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-xl"><Award className="w-5 h-5" /></div>
        <div><h3 className="font-bold text-slate-800">Boletín Oficial</h3><p className="text-xs text-slate-500">Official Report Card</p></div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {subjects.length === 0 ? (
          <div className="bg-slate-50 border p-4 rounded-xl text-sm text-slate-500 w-full">Sin calificaciones registradas.</div>
        ) : (
          <div className="bg-indigo-50 border p-4 rounded-xl text-sm text-indigo-800 w-full">
            <FileText className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
            <p>Listo para exportar con <strong>{subjects.length} materias</strong>.</p>
          </div>
        )}
      </div>

      <Button onClick={generatePDF} disabled={generating || subjects.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5">
        {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        Descargar PDF Oficial
      </Button>
    </div>
  );
};

export default OfficialReportCard;
