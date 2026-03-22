
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import jsPDF from 'jspdf';
import { Loader2, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EnrolmentConfirmation = ({ studentId }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      console.log(`👤 [Enrolment] Fetching student info for: ${studentId}`);
      if (!studentId) return;
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single();

        if (error) throw error;
        
        console.log(`✅ [Enrolment] Loaded student: ${data.first_name} ${data.last_name}`);
        setStudent(data);
      } catch (err) {
        console.error('❌ [Enrolment] Error fetching student:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId]);

  const generatePDF = () => {
    if (!student) return;
    console.log(`📄 [Enrolment] Generating PDF for ${student.first_name}...`);

    const doc = new jsPDF('p', 'mm', 'a4');
    const today = new Date().toLocaleDateString();

    // Header Background
    doc.setFillColor(11, 45, 92); // Dark blue
    doc.rect(0, 0, 210, 40, 'F');

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CHANAK International Academy', 105, 25, { align: 'center' });

    // Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text('DECLARATION OF ENROLMENT', 105, 60, { align: 'center' });

    // Document Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Document No.: N25000012528`, 20, 80);
    doc.text(`FDOE Code: 134620`, 20, 88);
    doc.text(`Date: ${today}`, 20, 96);

    // Body Text
    const bodyText = `This document certifies that ${student.first_name} ${student.last_name} is officially enrolled as a student at CHANAK International Academy for the current academic year. The student is placed in Grade Level: ${student.grade_level || 'N/A'}.

CHANAK International Academy is committed to providing excellent educational services in accordance with established academic standards. This certificate is issued upon the request of the interested party for whatever legal purpose it may serve.`;

    const splitText = doc.splitTextToSize(bodyText, 170);
    doc.text(splitText, 20, 115);

    // Signature
    doc.text('_________________________________', 105, 180, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text('Mariela Andrade', 105, 188, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Head of School', 105, 194, { align: 'center' });

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('CHANAK International Academy | FDOE Code: 134620', 105, 280, { align: 'center' });

    doc.save(`Enrolment_Confirmation_${student.first_name}_${student.last_name}.pdf`);
    console.log(`✅ [Enrolment] PDF Downloaded.`);
  };

  if (loading) return <div className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> Loading Enrolment...</div>;
  if (!student) return <div className="text-red-500">Student not found.</div>;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 bg-blue-100 text-blue-700 flex items-center justify-center rounded-full">
        <FileCheck className="w-6 h-6" />
      </div>
      <div className="text-center">
        <h3 className="font-bold text-slate-800 text-lg">Declaration of Enrolment</h3>
        <p className="text-sm text-slate-500">Official enrolment certification document.</p>
      </div>
      <Button onClick={generatePDF} className="w-full bg-[#0B2D5C] hover:bg-blue-800 text-white">
        Generate Certificate
      </Button>
    </div>
  );
};

export default EnrolmentConfirmation;
