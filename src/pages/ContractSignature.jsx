
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import jsPDF from 'jspdf';
import SignatureCanvas from 'react-signature-canvas';
import { useToast } from '@/components/ui/use-toast';
import { 
  FileSignature, CheckCircle2, Download, AlertCircle, Loader2, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const LEGAL_FOOTER = "Florida Not-For-Profit Corporation (N25000012528) - FDOE 134620";

export default function ContractSignature({ studentId, onSignatureComplete }) {
  const { toast } = useToast();
  const sigCanvas = useRef({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState(null);
  const [family, setFamily] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const initContract = async () => {
      if (!studentId) return;
      console.log(`📋 [Contract] Initializing for student: ${studentId}`);
      try {
        setLoading(true);
        // Fetch student & family info
        const { data: stData, error: stErr } = await supabase
          .from('students')
          .select('*, families(*)')
          .eq('id', studentId)
          .single();
        
        if (stErr) throw stErr;
        setStudent(stData);
        setFamily(stData.families);

        // Fetch existing contract
        const { data: cData, error: cErr } = await supabase
          .from('contracts')
          .select('*')
          .eq('student_id', studentId)
          .eq('contract_type', 'PRESTACION_SERVICIOS_EDUCATIVOS')
          .maybeSingle();

        if (cErr) {
          console.error("Error fetching contract:", cErr);
        }

        if (cData) {
          console.log(`✅ [Contract] Existing contract found: ${cData.contract_number}`);
          setContract(cData);
        } else {
          console.log(`📝 [Contract] No existing contract. Ready to generate new one.`);
        }
      } catch (err) {
        console.error('❌ [Contract] Initialization error:', err);
      } finally {
        setLoading(false);
      }
    };
    initContract();
  }, [studentId]);

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const handleSignContract = async () => {
    if (sigCanvas.current.isEmpty()) {
      toast({ title: 'Firma requerida', description: 'Por favor, dibuje su firma antes de confirmar.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      console.log(`📝 [Contract] Processing signature...`);
      const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      const contractNumber = `CHANAK-${new Date().getFullYear()}-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
      const institutionSignature = 'Mariela Andrade';
      const today = new Date();

      // 1. Generate PDF
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFillColor(11, 45, 92); // Dark blue header
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CHANAK INTERNATIONAL ACADEMY', 105, 20, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS', 105, 45, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Nº de Contrato: ${contractNumber}`, 20, 55);
      doc.text(`Fecha: ${today.toLocaleDateString()}`, 140, 55);

      // Body
      let y = 65;
      const addText = (text, isBold = false) => {
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, 170);
        
        if (y + (lines.length * 5) > 280) {
          // Add Footer before new page
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(LEGAL_FOOTER, 105, 290, { align: 'center' });
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          
          doc.addPage();
          y = 20;
        }
        
        doc.text(lines, 20, y);
        y += lines.length * 5 + 2;
      };

      addText(`Conste por el presente documento el contrato de prestación de servicios educativos que celebran por una parte CHANAK INTERNATIONAL ACADEMY, representada por Mariela Andrade (en adelante "La Institución"), y por la otra parte el representante legal del estudiante:`);
      y += 2;
      addText(`Representante: ${family?.family_name || 'Representante Legal'}`, true);
      addText(`Estudiante: ${student?.first_name} ${student?.last_name}`, true);
      addText(`Grado: ${student?.grade_level || 'N/A'}`, true);
      
      y += 5;
      addText('CLÁUSULAS', true);
      y += 2;
      
      const clauses = [
        "1. OBJETO: La Institución se compromete a brindar servicios educativos de calidad.",
        "2. OBLIGACIONES: El estudiante y su representante aceptan cumplir el reglamento interno.",
        "3. PAGOS: El representante se compromete a abonar puntualmente los aranceles correspondientes.",
        "4. DURACIÓN: El presente contrato es válido por el año académico en curso.",
        "5. MATERIALES: Los recursos digitales y plataformas están incluidos en el acceso al sistema.",
        "6. ASISTENCIA: Se requiere un cumplimiento de asistencia virtual o presencial conforme al programa.",
        "7. EVALUACIÓN: La institución evaluará el progreso mediante el sistema de PACEs y asignaciones.",
        "8. COMPORTAMIENTO: Se exige respeto hacia docentes, coordinadores y compañeros en todo momento.",
        "9. CANCELACIÓN: Cualquiera de las partes puede rescindir el contrato con 30 días de aviso previo.",
        "10. PRIVACIDAD: Los datos personales serán protegidos según las leyes aplicables vigentes.",
        "11. COMUNICACIÓN: Se utilizarán los correos oficiales y portales para notificaciones oficiales.",
        "12. MODIFICACIONES: Cualquier cambio a las condiciones presentes requerirá un anexo por escrito.",
        "13. ACCESO AL SIS: La firma de este contrato y confirmación de pagos son requisitos obligatorios para habilitar el acceso al Sistema de Información Estudiantil (SIS).",
        "14. FIRMAS: Las partes firman de manera digital el presente documento en señal de total conformidad y aceptación de las trece cláusulas anteriores."
      ];

      clauses.forEach(c => addText(c));

      // Signatures
      if (y > 220) { 
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(LEGAL_FOOTER, 105, 290, { align: 'center' });
        doc.addPage(); 
        y = 30; 
      }
      y += 15;
      
      doc.setDrawColor(0, 0, 0);
      doc.line(30, y, 90, y);
      doc.line(120, y, 180, y);
      
      // Add signature images
      doc.addImage(signatureDataUrl, 'PNG', 30, y - 25, 50, 20);
      
      // Institutional signature font
      doc.setFont('times', 'italic');
      doc.setFontSize(24);
      doc.setTextColor(11, 45, 92);
      doc.text(institutionSignature, 150, y - 5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Firma del Representante', 60, y + 5, { align: 'center' });
      doc.text('La Institución (Mariela Andrade)', 150, y + 5, { align: 'center' });

      // Add final footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(LEGAL_FOOTER, 105, 290, { align: 'center' });

      // Save PDF to Blob
      const pdfBlob = doc.output('blob');
      const fileName = `Contract_${contractNumber}_${student.first_name}_${student.last_name}.pdf`;
      const filePath = `contracts/${studentId}/${fileName}`;

      // 2. Upload to Supabase Storage
      console.log(`📄 [Contract] Uploading PDF...`);
      const { error: uploadError } = await supabase.storage
        .from('student-documents')
        .upload(filePath, pdfBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('student-documents')
        .getPublicUrl(filePath);

      const pdfUrl = publicUrlData.publicUrl;

      // 3. Save to contracts table
      const contractRecord = {
        student_id: studentId,
        family_id: family?.id,
        contract_type: 'PRESTACION_SERVICIOS_EDUCATIVOS',
        contract_number: contractNumber,
        parent_signature_data: signatureDataUrl,
        parent_signed_at: new Date().toISOString(),
        institution_signature: institutionSignature,
        institution_signed_at: new Date().toISOString(),
        pdf_url: pdfUrl,
        status: 'FULLY_SIGNED'
      };

      console.log(`💾 [Contract] Saving to database...`);
      const { data: savedContract, error: dbError } = await supabase
        .from('contracts')
        .upsert(contractRecord, { onConflict: 'student_id, contract_type' })
        .select()
        .single();

      if (dbError) throw dbError;

      // 4. Update enrollment_status
      const { error: enrollError } = await supabase
        .from('enrollment_status')
        .upsert({
          student_id: studentId,
          contract_signed: true,
          contract_signed_at: new Date().toISOString()
        }, { onConflict: 'student_id' });

      if (enrollError) throw enrollError;

      setContract(savedContract);
      toast({ title: '¡Contrato Firmado!', description: 'El contrato ha sido generado y guardado exitosamente.' });
      
      // Dispatch event to unblock SIS if payments are also confirmed
      window.dispatchEvent(new CustomEvent('refreshSISStatus', { detail: { studentId } }));
      if (onSignatureComplete) onSignatureComplete();

    } catch (err) {
      console.error('❌ [Contract] Error signing contract:', err);
      toast({ title: 'Error', description: 'No se pudo guardar el contrato.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (contract?.pdf_url) {
      window.open(contract.pdf_url, '_blank');
    }
  };

  if (loading) return <div className="p-8 flex justify-center text-indigo-500"><Loader2 className="w-6 h-6 animate-spin"/></div>;
  if (!student) return null;

  const isSigned = contract?.status === 'FULLY_SIGNED' || contract?.status === 'ACTIVE';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-8">
      <div className={`px-6 py-4 flex justify-between items-center ${isSigned ? 'bg-[#0B2D5C] text-white' : 'bg-slate-50 border-b border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <FileSignature className={`w-6 h-6 ${isSigned ? 'text-indigo-300' : 'text-[#0B2D5C]'}`} />
          <h2 className={`text-xl font-bold ${isSigned ? 'text-white' : 'text-slate-800'}`}>
            Contrato Educativo
          </h2>
        </div>
        <div>
          {isSigned ? (
            <span className="bg-green-500/20 text-green-300 border border-green-500/30 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> ✅ Firmado
            </span>
          ) : (
            <span className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> ⏳ Pendiente Firma
            </span>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">
        
        {isSigned ? (
          <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Contrato Vigente</h3>
              <p className="text-slate-500 text-sm mt-1">
                Firmado el {new Date(contract.parent_signed_at).toLocaleDateString()} | Nº {contract.contract_number}
              </p>
            </div>
            <Button onClick={handleDownload} className="bg-[#0B2D5C] hover:bg-blue-900 text-white mt-4">
              <Download className="w-4 h-4 mr-2" /> Descargar PDF Firmado
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-3 text-sm text-blue-800">
              <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Importante: Requisito de Acceso</p>
                <p>La firma de este contrato de prestación de servicios educativos es obligatoria. Según la Cláusula 13, <strong>el acceso al sistema académico (SIS) permanecerá bloqueado</strong> hasta que firme este documento y se confirme el pago correspondiente.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 border-b pb-2">Firma del Representante Legal</h3>
              <p className="text-sm text-slate-600">
                Al firmar en el recuadro inferior, usted ({family?.family_name || 'Representante'}) acepta las 14 cláusulas del contrato educativo para el estudiante {student.first_name} {student.last_name}.
              </p>
              
              <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
                <SignatureCanvas 
                  ref={sigCanvas}
                  penColor="#0B2D5C"
                  canvasProps={{ className: 'w-full h-48 cursor-crosshair' }}
                />
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={clearSignature}
                  className="text-sm text-slate-500 hover:text-red-500 transition-colors font-medium"
                >
                  Borrar y firmar de nuevo
                </button>
                <Button 
                  onClick={handleSignContract} 
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
                  ) : (
                    <><FileSignature className="w-4 h-4 mr-2" /> Aceptar y Firmar Contrato</>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
