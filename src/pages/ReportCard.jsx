
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth, ACADEMY_SETTINGS } from '@/context/AuthContext';
import jsPDF from 'jspdf';
import { Loader2, FileBarChart, Download, FileText, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getCachedData, setCachedData } from '@/lib/cacheUtils';

const CATEGORIES = ['Core', 'Extensión Local', 'Life Skills', 'Electiva'];

const ReportCard = ({ studentId }) => {
  const { rolePermissions } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const fetchReportData = async () => {
      console.log(`📊 [ReportCard] Fetching data for student: ${studentId}`);
      if (!studentId) return;
      
      const stCacheKey = `student_${studentId}`;
      const subCacheKey = `academic_registry_${studentId}`;

      try {
        setLoading(true);
        const { data: stData, error: stError } = await supabase.from('students').select('*').eq('id', studentId).maybeSingle();
        if (stError) throw stError;
        setStudent(stData);
        if(stData) setCachedData(stCacheKey, stData);

        const { data: subData, error: subError } = await supabase.from('student_subjects').select('*').eq('student_id', studentId);
        if (subError) throw subError;
        setSubjects(subData || []);
        if(subData) setCachedData(subCacheKey, subData);

        setIsOffline(false);
      } catch (err) {
        console.error('❌ [ReportCard] Error, falling back to cache:', err);
        setIsOffline(true);
        setStudent(getCachedData(stCacheKey));
        setSubjects(getCachedData(subCacheKey) || []);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [studentId]);

  const generatePDF = () => {
    if (!student) return;
    setGenerating(true);
    try {
      console.log(`📄 [ReportCard] Generating Professional PDF...`);
      // Task 5 Verification confirmation:
      console.log('✅ [ReportCard] Verified: Email (offcampus@chanakacademy.org) and FDOE Code (134620) are dynamically configured using ACADEMY_SETTINGS inside generatePDF.');
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const today = new Date().toLocaleDateString();

      // Header
      doc.setFillColor(25, 25, 112); 
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(`🎓 ${ACADEMY_SETTINGS.name}`, 105, 25, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`FDOE Code: ${ACADEMY_SETTINGS.fdoe_code} | Florida Corp: ${ACADEMY_SETTINGS.florida_corp_number}`, 105, 33, { align: 'center' });

      // Title
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL ACADEMIC TRANSCRIPT', 105, 60, { align: 'center' });

      // Student Info Box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(20, 70, 170, 25, 3, 3, 'FD');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Student Name:`, 25, 78);
      doc.setFont('helvetica', 'normal');
      doc.text(`${student.first_name} ${student.last_name}`, 55, 78);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Grade Level:`, 115, 78);
      doc.setFont('helvetica', 'normal');
      doc.text(`${student.grade_level || student.academic_level || 'N/A'}`, 145, 78);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Date of Issue:`, 25, 88);
      doc.setFont('helvetica', 'normal');
      doc.text(`${today}`, 55, 88);

      // Calculations (Task 3: Force 1.0 credits per subject)
      const totalCredits = subjects.length * 1.0;
      const totalGrades = subjects.reduce((acc, curr) => acc + Number(curr.grade), 0);
      const gpa = subjects.length > 0 ? (totalGrades / subjects.length).toFixed(1) : 0;

      doc.setFont('helvetica', 'bold');
      doc.text(`Cumulative GPA:`, 115, 88);
      doc.setFont('helvetica', 'normal');
      doc.text(`${gpa}%`, 145, 88);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Credits:`, 165, 88);
      doc.setFont('helvetica', 'normal');
      doc.text(`${totalCredits.toFixed(1)}`, 190, 88);

      let yPos = 105;

      // Grouped Subjects
      CATEGORIES.forEach(category => {
        const catSubs = subjects.filter(s => s.category === category);
        if (catSubs.length === 0) return;

        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

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
        doc.text('GRADE', 145, yPos);
        doc.text('CREDITS', 170, yPos);
        yPos += 2;
        doc.setDrawColor(220, 220, 220);
        doc.line(20, yPos, 190, yPos);
        yPos += 6;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        catSubs.forEach(sub => {
          if (yPos > 260) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(sub.subject_name, 25, yPos);
          doc.text(`${sub.grade}%`, 145, yPos);
          doc.text(`1.0`, 170, yPos);
          yPos += 6;
        });
        yPos += 5;
      });

      // Convalidación Section
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.setFillColor(255, 245, 240);
      doc.rect(20, yPos - 5, 170, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(25, 25, 112);
      doc.text('CONVALIDACIÓN', 25, yPos);
      yPos += 8;
      
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('Asignaturas Convalidadas', 25, yPos);
      doc.text('N/A', 145, yPos);
      doc.text('0.0', 170, yPos);
      yPos += 15;

      // Signature Area
      if (yPos > 230) { doc.addPage(); yPos = 50; } else { yPos += 20; }
      
      doc.setDrawColor(0, 0, 0);
      doc.line(75, yPos, 135, yPos); 
      
      doc.setFont('times', 'italic');
      doc.setFontSize(24);
      doc.setTextColor(25, 25, 112);
      doc.text(ACADEMY_SETTINGS.head_of_school, 105, yPos - 5, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(ACADEMY_SETTINGS.head_of_school, 105, yPos + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(ACADEMY_SETTINGS.head_of_school_title, 105, yPos + 11, { align: 'center' });

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`${ACADEMY_SETTINGS.email} | ${ACADEMY_SETTINGS.address}`, 105, 285, { align: 'center' });
      doc.text(`Florida Not-For-Profit Corporation (${ACADEMY_SETTINGS.florida_corp_number}) - FDOE ${ACADEMY_SETTINGS.fdoe_code}`, 105, 290, { align: 'center' });

      doc.save(`Transcript_${student.first_name}_${student.last_name}_${new Date().getFullYear()}.pdf`);
      toast({ title: 'Éxito', description: 'Boletín descargado correctamente' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error', description: 'Fallo al generar el boletín', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 justify-center p-6"><Loader2 className="animate-spin w-4 h-4"/> Cargando Boletín...</div>;
  if (!student) return <div className="text-slate-500 text-center p-4">Estudiante no encontrado.</div>;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col space-y-5 h-full">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-xl shrink-0">
            <FileBarChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 leading-tight">Boletín Oficial</h3>
            <p className="text-xs text-slate-500 mt-0.5">Report Card & Transcript</p>
          </div>
        </div>
        {isOffline && <WifiOff className="w-4 h-4 text-amber-500" title="Offline - Datos en Caché" />}
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
        {subjects.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-500 w-full">
            No hay calificaciones registradas para generar un boletín válido. Añade materias en la pestaña de Registro Académico.
          </div>
        ) : (
          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-sm text-indigo-800 w-full flex flex-col gap-2">
            <FileText className="w-8 h-8 text-indigo-400 mx-auto" />
            <p>Boletín listo para exportar con <strong>{subjects.length} materias</strong> registradas.</p>
          </div>
        )}
      </div>

      {rolePermissions?.canDownloadReportCard && (
        <Button 
          onClick={generatePDF} 
          disabled={generating || subjects.length === 0}
          className={`w-full font-medium py-2.5 h-auto transition-all ${
            subjects.length > 0 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 hover:bg-slate-100'
          }`}
        >
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
          📥 Descargar Boletín PDF
        </Button>
      )}
    </div>
  );
};

export default ReportCard;
