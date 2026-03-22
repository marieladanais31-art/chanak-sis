
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { ShieldCheck, CheckCircle2, AlertCircle, Info, X, Download, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function LegalDocuments({ studentId, parentId, parentName }) {
  const [checkingSignature, setCheckingSignature] = useState(true);
  const [existingSignature, setExistingSignature] = useState(null);
  const [saving, setSaving] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingEnrollmentPDF, setGeneratingEnrollmentPDF] = useState(false);
  const { toast } = useToast();

  const CONTRACT_VERSION = "2025";

  useEffect(() => {
    if (studentId && parentId) {
      checkExistingSignature();
    }
  }, [studentId, parentId]);

  const checkExistingSignature = async () => {
    setCheckingSignature(true);
    try {
      console.log(`🔍 [LegalDocuments] Checking signatures for student: ${studentId} & parent: ${parentId}`);
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('student_id', studentId)
        .eq('contract_version', CONTRACT_VERSION)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data && data.full_name_signature) {
        console.log(`✅ [LegalDocuments] Signature found:`, data);
        setExistingSignature(data);
        setSignatureName(data.full_name_signature);
      } else {
        setExistingSignature(null);
        setSignatureName('');
      }
    } catch (error) {
      console.error(`❌ [LegalDocuments] Error checking signature:`, error);
    } finally {
      setCheckingSignature(false);
    }
  };

  const handleSign = async () => {
    if (!signatureName.trim()) {
      toast({ title: 'Atención', description: 'Debe ingresar su nombre completo para firmar.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    console.log(`✍️ [LegalDocuments] Saving signature for ${signatureName}... parentId: ${parentId}`);
    
    try {
      const { data, error } = await supabase.from('signatures').insert([{
        student_id: studentId,
        parent_id: parentId,
        full_name_signature: signatureName.trim(),
        signature_date: new Date().toISOString(),
        contract_version: CONTRACT_VERSION
      }]).select().single();

      if (error) {
        console.error(`❌ [LegalDocuments] Supabase Insert Error:`, error);
        throw error;
      }

      console.log(`✅ [LegalDocuments] Signature saved successfully.`);
      toast({ title: 'Éxito', description: 'Contrato firmado exitosamente' });
      setExistingSignature(data);
    } catch (error) {
      console.error(`❌ [LegalDocuments] Error saving signature:`, error);
      toast({ title: 'Error', description: 'No se pudo guardar la firma. Verifique que tenga permisos suficientes.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const generateDeclarationPDF = async () => {
    setGeneratingPDF(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { data: student, error } = await supabase
        .from('students')
        .select('first_name, last_name, full_name, passport_number, grade_level, current_grade')
        .eq('id', studentId)
        .single();

      if (error) throw error;

      const studentName = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim();
      const passport = student.passport_number || 'N/A';
      const grade = student.current_grade || student.grade_level || 'N/A';

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(25, 61, 109); // #193D6D
      doc.text('CHANAK INTERNATIONAL ACADEMY - FDOE 134620', pageWidth / 2, 30, { align: 'center' });

      // Title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('DECLARATION OF ENROLMENT', pageWidth / 2, 50, { align: 'center' });

      // Body
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);

      const bodyText = `This letter confirms that ${studentName} is duly enrolled and registered with Chanak International Academy for the academic year 2026-2027. [ID/Passport: ${passport}]. Academic Level: ${grade}.`;
      
      const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
      doc.text(splitBody, 20, 80);

      // Footer
      const footerY = 150;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(20, footerY, 100, footerY);
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Mariela Andrade (Head of School) - EIN 36-5154011', 20, footerY + 10);

      // Save
      doc.save(`Declaration_of_Enrolment_${studentName.replace(/\s+/g, '_')}.pdf`);
      toast({ title: 'Éxito', description: 'Declaration of Enrolment generada correctamente.' });

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({ title: 'Error', description: 'No se pudo generar el documento.', variant: 'destructive' });
    } finally {
      setGeneratingPDF(false);
    }
  };

  const generateEnrollmentConfirmationPDF = async () => {
    setGeneratingEnrollmentPDF(true);
    try {
      const { jsPDF } = await import('jspdf');
      const { data: student, error } = await supabase
        .from('students')
        .select('full_name, first_name, last_name, passport_number, current_grade, grade_level')
        .eq('id', studentId)
        .single();

      if (error) throw error;

      const studentName = student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Estudiante';
      const passport = student.passport_number || 'N/A';
      const grade = student.current_grade || student.grade_level || 'N/A';

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;

      // Header: "CHANAK INTERNATIONAL ACADEMY" (bold, 12pt, dark blue #193D6D)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(25, 61, 109); 
      doc.text('CHANAK INTERNATIONAL ACADEMY', pageWidth / 2, 30, { align: 'center' });

      // Subheader: "FDOE Code: 134620 | Florida Not-For-Profit Corporation" (9pt, Aquamarine #20B2AA or Gray)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(32, 178, 170); // #20B2AA
      doc.text('FDOE Code: 134620 | Florida Not-For-Profit Corporation', pageWidth / 2, 38, { align: 'center' });

      // Title: "CONFIRMACIÓN OFICIAL DE MATRÍCULA" (16pt, bold, dark blue)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(25, 61, 109); 
      doc.text('CONFIRMACIÓN OFICIAL DE MATRÍCULA', pageWidth / 2, 60, { align: 'center' });

      // Student Data
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0); // Black
      doc.text(`Nombre: ${studentName} | ID / Pasaporte: ${passport} | Nivel Académico (US): ${grade}`, pageWidth / 2, 80, { align: 'center' });

      // Body Text - EXACTLY as requested
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(30, 30, 30);
      
      const bodyText = `Por medio de la presente, la dirección de Chanak International Academy certifica que el estudiante mencionado anteriormente se encuentra oficialmente matriculado en nuestra institución. Esta certificación acredita el registro formal bajo la normativa internacional correspondiente. El estudiante cursa su plan de estudios mediante un Plan Educativo Individualizado (PEI).`;
      
      const splitBody = doc.splitTextToSize(bodyText, pageWidth - 40);
      doc.text(splitBody, 20, 100);

      // Signature & Footer
      const footerY = 240;
      doc.setDrawColor(25, 61, 109);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - 40, footerY, pageWidth / 2 + 40, footerY); // Signature line
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Mariela Andrade', pageWidth / 2, footerY + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Director / Head of School', pageWidth / 2, footerY + 14, { align: 'center' });

      // Footer details
      const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      const formattedDate = new Date().toLocaleDateString('es-ES', dateOptions);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`EIN 36-5154011 - Certificado emitido el ${formattedDate}`, pageWidth / 2, 280, { align: 'center' });

      // Save
      doc.save(`Confirmacion_Matricula_${studentName.replace(/\s+/g, '_')}.pdf`);
      toast({ title: 'Éxito', description: 'Confirmación de matrícula generada correctamente.' });

    } catch (error) {
      console.error('Error generating Enrollment Confirmation PDF:', error);
      toast({ title: 'Error', description: 'No se pudo generar la confirmación de matrícula.', variant: 'destructive' });
    } finally {
      setGeneratingEnrollmentPDF(false);
    }
  };

  if (checkingSignature) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#193D6D]" />
        <span className="font-bold text-sm">Verificando firma...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2" style={{ color: '#193D6D' }}>
            <ShieldCheck className="w-6 h-6" style={{ color: '#20B2AA' }} />
            Contrato OFF Campus - 2025
          </h2>
          <p className="text-sm text-slate-500 mt-1">Por favor, lea atentamente las cláusulas antes de firmar.</p>
        </div>
        <button 
          onClick={() => setShowPrivacyModal(true)}
          className="text-sm font-bold flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-200"
          style={{ color: '#193D6D' }}
        >
          <Info className="w-4 h-4" /> Política de Privacidad
        </button>
      </div>

      <div className="p-8 max-h-[500px] overflow-y-auto space-y-6 text-sm text-slate-700 bg-white">
        
        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 1: Objeto - Homeschool Guiado</h3>
          <p>Chanak International Academy provee un currículo digital, acompañamiento y validación académica bajo la modalidad de educación en casa (homeschooling). La institución actúa como un paraguas educativo (umbrella school) registrado en el estado de Florida, Estados Unidos.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 2: Partes Contratantes</h3>
          <p>Este acuerdo legal se establece entre Chanak International Academy (institución registrada bajo las leyes del Estado de Florida) y el padre, madre o tutor legal que suscribe el presente documento en representación del estudiante menor de edad.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 3: Duración</h3>
          <p>El presente contrato tiene una vigencia correspondiente al año escolar matriculado. Su renovación está sujeta a la revisión académica y financiera del estudiante y no es de carácter automático.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 4: Obligaciones Chanak</h3>
          <p>La institución se compromete a proporcionar acceso a la plataforma educativa, brindar asesoría general a través de coordinadores, y emitir la documentación académica (report cards, transcripciones) conforme a las regulaciones del Estado de Florida.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 5: Obligaciones Familia</h3>
          <p>Los padres o tutores legales asumen la responsabilidad directa de la instrucción diaria, supervisión de tareas y avance constante del estudiante utilizando la plataforma provista y asegurando la integridad académica.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 6: Compromiso de Pago</h3>
          <p>El representante legal se compromete a cancelar puntualmente la matrícula y colegiaturas según el plan de pagos elegido. El incumplimiento superior a 30 días resultará en la suspensión del acceso a la plataforma académica y la retención de documentos oficiales.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 7: Evaluación</h3>
          <p>Las evaluaciones deben realizarse bajo la estricta supervisión de los padres para garantizar la integridad académica. Chanak se reserva el derecho de auditar calificaciones y solicitar evidencias de trabajo.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 8: Disciplina</h3>
          <p>Cualquier acto de plagio, alteración de notas, comportamiento indebido en los foros de la institución o falta de respeto hacia el personal de la academia será causal de expulsión inmediata sin derecho a reembolso.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 9: Confidencialidad</h3>
          <p>La institución manejará la información personal y académica bajo estrictas normas de confidencialidad, alineadas con FERPA (Family Educational Rights and Privacy Act), protegiendo la privacidad del estudiante.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 10: Responsabilidad Familia</h3>
          <p>Los padres asumen total responsabilidad sobre la legalidad y reconocimiento del homeschooling en su país de residencia. Chanak International Academy otorga acreditación estadounidense, quedando la homologación o convalidación a cargo exclusivo de la familia frente a las autoridades educativas locales.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 11: Limitación de Responsabilidad</h3>
          <p>Chanak International Academy no será responsable por interrupciones del servicio originadas por problemas de conectividad de la familia, equipos defectuosos o fallas ajenas a nuestra infraestructura tecnológica directa.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 12: Resolución de Disputas</h3>
          <p>Ambas partes acuerdan que cualquier conflicto o desavenencia surgida en el marco de este contrato será tratada de buena fe y mediante mediación directa entre la administración y los padres antes de tomar acciones legales.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 13: Ley Aplicable</h3>
          <p>Este contrato se rige e interpreta de acuerdo con las leyes del Estado de Florida, Estados Unidos de América. Cualquier disputa legal se someterá a la jurisdicción de los tribunales competentes en dicho estado.</p>
        </div>

        <div className="p-5 bg-white border-l-4 rounded-r-xl shadow-sm" style={{ borderLeftColor: '#20B2AA' }}>
          <h3 className="font-bold text-slate-800 text-base mb-2">Cláusula 14: Enmiendas</h3>
          <p>Chanak International Academy se reserva el derecho de modificar sus políticas internas, tarifas y regulaciones con previo aviso de 30 días a las familias. El uso continuado del servicio implica la aceptación de dichos cambios.</p>
        </div>

      </div>

      {existingSignature && (
        <div className="p-6 bg-slate-50 border-y border-slate-200 text-center shadow-inner grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-white border rounded-xl text-center shadow-sm h-full flex flex-col justify-center" style={{ borderColor: '#193D6D' }}>
            <h4 className="font-black mb-2" style={{ color: '#193D6D' }}>Declaración en Inglés</h4>
            <p className="text-sm text-slate-600 mb-4">Descargue su declaración de inscripción en inglés para trámites internacionales.</p>
            
            <button
              onClick={generateDeclarationPDF}
              disabled={generatingPDF}
              className="flex w-full items-center justify-center gap-2 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md disabled:opacity-70 mt-auto"
              style={{ backgroundColor: '#193D6D' }}
            >
              {generatingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              Declaration of Enrolment
            </button>
          </div>

          <div className="p-5 bg-white border rounded-xl text-center shadow-sm h-full flex flex-col justify-center" style={{ borderColor: '#20B2AA' }}>
            <h4 className="font-black mb-2" style={{ color: '#193D6D' }}>Confirmación Oficial (Español)</h4>
            <p className="text-sm text-slate-600 mb-4">Descargue el certificado oficial que acredita la matrícula del estudiante en Chanak.</p>
            
            <button
              onClick={generateEnrollmentConfirmationPDF}
              disabled={generatingEnrollmentPDF}
              className="flex w-full items-center justify-center gap-2 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-md disabled:opacity-70 mt-auto"
              style={{ backgroundColor: '#20B2AA' }}
            >
              {generatingEnrollmentPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Descargar Confirmación de Matrícula
            </button>
          </div>
        </div>
      )}

      <div className="p-6 bg-slate-50 border-t border-slate-200">
        {!existingSignature ? (
          <div className="max-w-xl mx-auto text-center space-y-4">
            <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4 text-left">
              <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0" />
              <div>
                <p className="font-bold text-yellow-800">Firma requerida</p>
                <p className="text-sm text-yellow-700">Aún no se ha encontrado una firma para este estudiante. Debe firmar el contrato para confirmar su aceptación.</p>
              </div>
            </div>

            <h4 className="font-black text-slate-800 text-lg">Firma Digital del Representante Legal</h4>
            <div className="text-left">
              <label className="block text-sm font-bold text-slate-700 mb-1">Escriba su Nombre Completo para aceptar:</label>
              <input 
                type="text" 
                placeholder="Ej: Juan Pérez Rodríguez" 
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl outline-none text-slate-800 font-medium focus:border-[#20B2AA]"
              />
            </div>
            <button 
              onClick={handleSign}
              disabled={saving}
              className="w-full py-3.5 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center shadow-md"
              style={{ backgroundColor: '#193D6D' }}
            >
              {saving ? 'Procesando...' : 'Firmar Contrato'}
            </button>
            <p className="text-xs text-slate-500">Al hacer clic en "Firmar Contrato", usted declara bajo juramento ser el tutor legal y aceptar los términos.</p>
          </div>
        ) : (
          <div className="max-w-xl mx-auto">
            <div className="p-6 bg-white border rounded-xl text-center shadow-sm" style={{ borderColor: '#20B2AA' }}>
              <div className="flex justify-center mb-3">
                <div className="p-2 rounded-full bg-slate-50">
                  <CheckCircle2 className="w-8 h-8" style={{ color: '#20B2AA' }} />
                </div>
              </div>
              <h3 className="font-black text-lg mb-1" style={{ color: '#193D6D' }}>Contrato Firmado Exitosamente</h3>
              <p className="text-sm text-slate-600">
                Firmado por: <strong>{existingSignature.full_name_signature}</strong> (Versión {CONTRACT_VERSION})
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg flex items-center gap-2" style={{ color: '#193D6D' }}>
                <ShieldCheck className="w-5 h-5" style={{ color: '#20B2AA' }} /> Política de Privacidad
              </h3>
              <button onClick={() => setShowPrivacyModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] text-slate-700 text-sm space-y-4">
              <p><strong>Cumplimiento FERPA:</strong><br/>
              La Ley de Derechos Educativos y Privacidad Familiar (FERPA) es una ley federal de EE. UU. que protege la privacidad de los registros educativos de los estudiantes. Chanak International Academy garantiza que los registros académicos y personales no serán divulgados a terceros sin el consentimiento expreso y por escrito del padre o tutor legal, a menos que la ley lo exija.</p>
              
              <p><strong>Leyes del Estado de Florida:</strong><br/>
              Como institución registrada en Florida, cumplimos con el Estatuto de Florida § 1002.22, garantizando el derecho de acceso de los padres a los registros de sus hijos y protegiendo la información biométrica y de identificación personal contra usos no autorizados.</p>

              <p><strong>Uso de Datos:</strong><br/>
              La información recopilada en esta plataforma se utiliza exclusivamente para fines de gestión académica, emisión de boletines, procesamiento de pagos y comunicación institucional.</p>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setShowPrivacyModal(false)} className="w-full py-2.5 text-white rounded-xl font-bold shadow-sm" style={{ backgroundColor: '#193D6D' }}>Entendido</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
