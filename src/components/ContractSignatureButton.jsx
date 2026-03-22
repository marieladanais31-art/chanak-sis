
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import { FileSignature, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export default function ContractSignatureButton({ studentId, studentName, parentId, parentName }) {
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const { toast } = useToast();

  const handleSignContract = async () => {
    if (!studentId || !parentId) {
      toast({ title: 'Error', description: 'Faltan datos del estudiante o padre.', variant: 'destructive' });
      return;
    }
    setSigning(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const todayDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      doc.text('CONTRATO DE MATRÍCULA Y SERVICIOS EDUCATIVOS', 105, 20, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setFont('times', 'normal');
      doc.text(`Fecha: ${todayDate}`, 180, 30, { align: 'right' });
      
      doc.text(`Representante/Padre: ${parentName || '________________'}`, 20, 40);
      doc.text(`Estudiante: ${studentName || '________________'}`, 20, 48);
      
      const clausesText = [
        "1. Objeto: Prestación de servicios educativos internacionales bajo el currículo de Chanak International Academy.",
        "2. Modalidad: Educación a distancia e híbrida con apoyo de Hubs locales cuando aplique.",
        "3. Obligaciones Académicas: El estudiante deberá cumplir con el avance establecido en su Plan Educativo Individualizado (PEI).",
        "4. Costos y Pagos: El representante asume la responsabilidad del pago oportuno de matrículas y mensualidades.",
        "5. Uso de Plataforma: Se otorga acceso personal e intransferible a los sistemas de gestión académica.",
        "6. Evaluaciones: Las calificaciones estarán sujetas a la entrega de evidencias (paces, exámenes).",
        "7. Certificaciones: La institución emitirá certificaciones oficiales al finalizar satisfactoriamente los niveles.",
        "8. Políticas de Convivencia: Compromiso de respeto mutuo hacia docentes y personal administrativo.",
        "9. Propiedad Intelectual: El material didáctico provisto es para uso exclusivo del estudiante.",
        "10. Comunicación: Todo aviso oficial se realizará por los canales de comunicación registrados.",
        "11. Suspensión del Servicio: El atraso prolongado en pagos o incumplimiento académico podrá derivar en suspensión.",
        "12. Cancelación: Cualquier parte puede terminar el acuerdo con 30 días de preaviso por escrito.",
        "13. Privacidad de Datos: Los datos del estudiante serán protegidos bajo normativas internacionales.",
        "14. Aceptación: La firma de este documento ratifica la conformidad absoluta con todas las cláusulas."
      ];

      let yPos = 60;
      doc.setFontSize(10);
      clausesText.forEach(clause => {
        const lines = doc.splitTextToSize(clause, 170);
        doc.text(lines, 20, yPos);
        yPos += (lines.length * 6);
      });

      doc.setFont('times', 'bold');
      doc.text('Firma Digital del Representante', 20, yPos + 20);
      doc.setFont('times', 'italic');
      doc.setFontSize(14);
      doc.text(parentName || 'Firma no registrada', 20, yPos + 35);
      doc.line(20, yPos + 37, 80, yPos + 37);

      doc.save(`Contrato_${studentName}.pdf`);

      // Guardar en la base de datos
      const { error } = await supabase.from('contract_signatures').insert([{
        parent_id: parentId,
        student_id: studentId,
        parent_name: parentName,
        student_name: studentName,
        contract_type: '14_clauses'
      }]);

      if (error) throw error;

      setSigned(true);
      toast({ title: 'Contrato Firmado', description: 'El contrato de 14 cláusulas ha sido firmado y descargado.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudo procesar la firma del contrato.', variant: 'destructive' });
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="w-10 h-10 bg-emerald-50 text-emerald-700 flex items-center justify-center rounded-xl shrink-0">
          <FileSignature className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Contrato de Servicios (14 Cláusulas)</h3>
          <p className="text-xs text-slate-500">Generación y firma digital del contrato</p>
        </div>
      </div>
      
      {signed ? (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-bold">
          <CheckCircle className="w-5 h-5" /> Contrato firmado exitosamente
        </div>
      ) : (
        <Button 
          onClick={handleSignContract} 
          disabled={signing}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold"
        >
          {signing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSignature className="w-4 h-4 mr-2" />}
          Leer, Firmar y Descargar Contrato
        </Button>
      )}
    </div>
  );
}
