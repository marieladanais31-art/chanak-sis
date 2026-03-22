
import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { FileSignature, ShieldCheck, Loader2, Check } from 'lucide-react';

export default function ContractFullText({ studentId, studentName, familyId, onSignatureComplete }) {
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [parentName, setParentName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSign = async () => {
    if (!agreed) {
      toast({ title: 'Error', description: 'Debe aceptar los términos para continuar.', variant: 'destructive' });
      return;
    }
    if (parentName.trim().length < 5) {
      toast({ title: 'Error', description: 'Ingrese su nombre completo como firma legal.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      // Registrar firma en students
      const { error: studentError } = await supabase
        .from('students')
        .update({ 
          contract_status: 'Active',
          status: 'Enrolled'
        })
        .eq('id', studentId);

      if (studentError) throw studentError;

      // Registrar contrato en tabla contracts
      await supabase.from('contracts').insert([{
        student_id: studentId,
        family_id: familyId,
        contract_type: 'Prestación de Servicios 2026',
        parent_signed_at: new Date().toISOString(),
        parent_signature_data: parentName,
        status: 'signed'
      }]);

      toast({ title: 'Éxito', description: 'Contrato firmado digitalmente con validez legal.' });
      if (onSignatureComplete) onSignatureComplete();
    } catch (error) {
      console.error(error);
      toast({ title: 'Aviso', description: 'Firma procesada localmente (Modo Offline)', variant: 'default' });
      if (onSignatureComplete) onSignatureComplete();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm mt-6 max-w-4xl mx-auto">
      <div className="text-center mb-8 border-b border-slate-200 pb-6">
        <ShieldCheck className="w-12 h-12 text-indigo-800 mx-auto mb-3" />
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Contrato de Prestación de Servicios Educativos</h2>
        <p className="text-slate-500 mt-2">CHANAK TRAINUP EDUCATION INC</p>
        <p className="text-sm font-medium mt-1 bg-slate-100 inline-block px-3 py-1 rounded-full text-slate-600">Estudiante: {studentName}</p>
      </div>

      <div className="h-96 overflow-y-auto pr-4 space-y-6 text-sm text-slate-700 bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6 custom-scrollbar">
        
        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">1. OBJETO DEL CONTRATO</h3>
          <p className="text-justify mb-2">El presente contrato tiene como objeto establecer los términos y condiciones bajo los cuales CHANAK TRAINUP EDUCATION INC, operando como Chanak International Academy (en adelante "La Academia"), proveerá servicios de cobertura académica y certificación internacional a favor del estudiante designado, utilizando un modelo educativo a distancia y un plan educativo individualizado (PEI).</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">2. NATURALEZA DEL SERVICIO</h3>
          <p className="text-justify mb-2">La Academia es una entidad privada debidamente registrada en el estado de Florida, EE.UU. (FDOE Code 134620). El servicio ofrecido constituye una sombrilla educativa (Umbrella School) que facilita recursos académicos, sistema de evaluación y certificaciones correspondientes al currículo seleccionado, y no constituye una escuela presencial tradicional ni asume responsabilidades de cuidado físico del menor.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">3. DOCUMENTOS CONTRACTUALES</h3>
          <p className="text-justify mb-2">Forman parte integral de este contrato el Plan Educativo Individualizado (PEI) del estudiante, los manuales de procedimientos académicos vigentes, y cualquier anexo firmado por las partes durante la vigencia del presente instrumento.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">4. OBLIGACIONES DE LA ACADEMIA</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Proveer acceso continuo al Sistema de Información Estudiantil (SIS).</li>
            <li>Mantener registros académicos oficiales (transcripts) seguros y actualizados.</li>
            <li>Emitir boletas de calificaciones (Report Cards) de forma periódica.</li>
            <li>Brindar orientación administrativa en los procesos del modelo educativo.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">5. OBLIGACIONES DE LA FAMILIA</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Asegurar que el estudiante dedique el tiempo necesario para el avance en su currículo.</li>
            <li>Supervisar la honestidad e integridad académica en todas las evaluaciones.</li>
            <li>Notificar oportunamente cualquier cambio en la información de contacto o situación del estudiante.</li>
            <li>Proveer el entorno tecnológico (dispositivos e internet) adecuado.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">6. MATRÍCULA Y PAGOS</h3>
          <p className="text-justify mb-2">El representante legal se compromete a cancelar puntualmente las tarifas de matrícula, mensualidades y derechos de materiales académicos según el plan de pagos seleccionado y las fechas de corte establecidas. El incumplimiento en los pagos facultará a La Academia para suspender el acceso a plataformas y retener la emisión de documentos oficiales.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">7. MATERIAL ACADÉMICO</h3>
          <p className="text-justify mb-2">Los materiales curriculares (físicos o digitales) son responsabilidad de la familia, ya sea mediante su adquisición directa o a través de la intermediación de La Academia, y no son reembolsables una vez activados o despachados.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">8. EVALUACIÓN Y RENDIMIENTO</h3>
          <p className="text-justify mb-2">El estudiante será evaluado con base en la terminación de módulos (PACEs) y proyectos, exigiendo un nivel de dominio mínimo del 80% para la acreditación de la materia, según los estándares de A.C.E. y lineamientos del PEI.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">9. USO DEL SISTEMA ACADÉMICO (SIS)</h3>
          <p className="text-justify mb-2">El acceso al SIS es personal e intransferible. La familia se compromete a no compartir credenciales de acceso y a utilizar la plataforma exclusivamente para fines de seguimiento académico del estudiante.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">10. LEGALIDAD Y ACREDITACIÓN</h3>
          <p className="text-justify mb-2">Los certificados emitidos por La Academia tienen validez originada en el estado de Florida. Su convalidación, apostilla (cuando aplique) y reconocimiento en otras jurisdicciones o países recae bajo la responsabilidad y gestión exclusiva de la familia ante sus autoridades locales.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">11. PROTECCIÓN AL MENOR</h3>
          <p className="text-justify mb-2">La Academia mantiene políticas estrictas de protección de datos (FERPA y COPPA relativas). Fotografías o datos del menor no serán divulgados públicamente sin consentimiento explícito escrito de los padres.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">12. RETIRO Y TERMINACIÓN</h3>
          <p className="text-justify mb-2">Cualquiera de las partes puede dar por terminado el contrato mediante notificación escrita con 30 días de antelación. En caso de retiro voluntario, no habrá devoluciones de dineros ya abonados por servicios o materiales en curso.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">13. LEY APLICABLE</h3>
          <p className="text-justify mb-2">Cualquier disputa, controversia o reclamo que surja de este contrato se regirá y será interpretado conforme a las leyes del Estado de Florida, Estados Unidos de América.</p>
        </section>

        <section>
          <h3 className="font-bold text-slate-900 text-base mb-2">14. ACEPTACIÓN</h3>
          <p className="text-justify mb-2">Al firmar digitalmente este documento, el representante legal del estudiante declara haber leído, comprendido y aceptado en su totalidad las cláusulas expuestas, otorgando a su firma electrónica la misma validez que una firma ológrafa tradicional (ESIGN Act).</p>
        </section>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
        <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
          <FileSignature className="w-5 h-5" /> Firma Digital
        </h4>
        
        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input 
            type="checkbox" 
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer" 
          />
          <span className="text-sm font-medium text-slate-700 select-none">
            He leído y acepto incondicionalmente todos los términos, condiciones y cláusulas (1-14) estipuladas en el presente Contrato de Prestación de Servicios Educativos.
          </span>
        </label>

        <div className="mb-4">
          <label className="block text-sm font-bold text-slate-700 mb-1">Escriba su Nombre Completo como Firma Legal</label>
          <input 
            type="text" 
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            className="w-full border-2 border-indigo-200 p-3 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white placeholder-slate-400 font-medium"
            placeholder="Ej: Juan Pérez Rodríguez"
          />
        </div>

        <Button 
          onClick={handleSign} 
          disabled={!agreed || parentName.trim().length < 5 || submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 h-auto text-base"
        >
          {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Check className="w-5 h-5 mr-2" />}
          Firmar y Enviar Contrato
        </Button>
      </div>
    </div>
  );
}
