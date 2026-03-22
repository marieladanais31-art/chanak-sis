
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Book, GraduationCap, Building2, UserCircle, CheckCircle2, ChevronRight, Loader2, CreditCard } from 'lucide-react';

export default function PaymentSelector({ studentId, onPaymentComplete }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initiating, setInitiating] = useState(false);
  
  const [studentProgram, setStudentProgram] = useState({
    program_type: '',
    mentorship_type: 'NONE',
    hub_contact_name: '',
    hub_contact_email: '',
    hub_contact_phone: ''
  });

  const [paymentLinks, setPaymentLinks] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!studentId) return;
      console.log(`💳 [PaymentSelector] Fetching data for student: ${studentId}`);
      try {
        setLoading(true);
        // Fetch existing program
        const { data: programData, error: progErr } = await supabase
          .from('student_programs')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle();

        if (programData) {
          setStudentProgram(programData);
          setStep(3); // Jump to review if already configured
          console.log(`✅ [PaymentSelector] Found existing program config.`);
        }

        // Fetch Stripe links
        const { data: linksData, error: linkErr } = await supabase
          .from('stripe_payment_links')
          .select('*')
          .eq('is_active', true);
          
        if (linksData) setPaymentLinks(linksData);

        // Fetch existing payments
        const { data: payData, error: payErr } = await supabase
          .from('student_payments')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });
          
        if (payData) setPayments(payData);

      } catch (err) {
        console.error('❌ [PaymentSelector] Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [studentId]);

  const handleSaveProgram = async (e) => {
    if (e) e.preventDefault();
    if (!studentProgram.program_type) {
      return toast({ title: "Atención", description: "Debe seleccionar un programa.", variant: "destructive" });
    }

    setSaving(true);
    try {
      console.log(`💾 [PaymentSelector] Saving step ${step}...`);
      const { error } = await supabase
        .from('student_programs')
        .upsert({
          student_id: studentId,
          program_type: studentProgram.program_type,
          mentorship_type: studentProgram.mentorship_type,
          hub_contact_name: studentProgram.hub_contact_name,
          hub_contact_email: studentProgram.hub_contact_email,
          hub_contact_phone: studentProgram.hub_contact_phone,
        }, { onConflict: 'student_id' });

      if (error) throw error;
      setStep(step + 1);
    } catch (err) {
      console.error('❌ [PaymentSelector] Save error:', err);
      toast({ title: "Error", description: "No se pudo guardar la configuración.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleInitiatePayment = async (paymentType) => {
    setInitiating(true);
    console.log(`💳 [PaymentSelector] Initiating ${paymentType} for ${studentProgram.program_type}`);
    
    try {
      // Find the correct stripe link
      const link = paymentLinks.find(l => l.payment_type === paymentType && l.program_type === studentProgram.program_type);
      
      if (!link) {
        throw new Error('No se encontró el enlace de pago para esta configuración.');
      }

      // Create a mock session ID to track the redirect
      const mockSessionId = `mock_sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Insert pending payment
      const { data: newPayment, error: insertError } = await supabase
        .from('student_payments')
        .insert({
          student_id: studentId,
          payment_type: paymentType,
          program_type: studentProgram.program_type,
          stripe_session_id: mockSessionId,
          amount_cents: link.amount_cents,
          currency: link.currency,
          status: 'PENDING'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      console.log(`✅ [PaymentSelector] Created pending payment record.`);

      // Format redirect URL (Simulating Stripe redirect, passing session_id)
      // In production, this would be: window.location.href = link.stripe_link + "?client_reference_id=" + newPayment.id
      const redirectUrl = `${link.stripe_link}?session_id=${mockSessionId}`;
      console.log(`🔗 [PaymentSelector] Redirecting to: ${redirectUrl}`);
      
      window.location.href = redirectUrl;

    } catch (err) {
      console.error('❌ [PaymentSelector] Payment initiation error:', err);
      toast({ title: "Error de Pago", description: err.message, variant: "destructive" });
      setInitiating(false);
    }
  };

  const isCompleted = (type) => payments.some(p => p.payment_type === type && p.status === 'COMPLETED');

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-indigo-600 animate-spin" /></div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8 mb-8">
      
      {/* Header Progress */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-600" />
          Configuración y Pagos
        </h2>
        <div className="flex gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
        </div>
      </div>

      <div className="p-6 md:p-8">
        
        {/* STEP 1: Program */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-slate-800">Seleccione el Programa Académico</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => setStudentProgram({...studentProgram, program_type: 'OFF_CAMPUS'})}
                className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${studentProgram.program_type === 'OFF_CAMPUS' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
              >
                <Book className={`w-8 h-8 mb-3 ${studentProgram.program_type === 'OFF_CAMPUS' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <h4 className="font-bold text-slate-800 text-lg">Off Campus</h4>
                <p className="text-slate-500 text-sm mt-1">Programa estándar a distancia con certificación internacional.</p>
                {studentProgram.program_type === 'OFF_CAMPUS' && <div className="mt-4 flex items-center text-indigo-600 font-bold text-sm"><CheckCircle2 className="w-4 h-4 mr-1"/> Seleccionado</div>}
              </div>

              <div 
                onClick={() => setStudentProgram({...studentProgram, program_type: 'DUAL_DIPLOMA'})}
                className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${studentProgram.program_type === 'DUAL_DIPLOMA' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
              >
                <GraduationCap className={`w-8 h-8 mb-3 ${studentProgram.program_type === 'DUAL_DIPLOMA' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <h4 className="font-bold text-slate-800 text-lg">Dual Diploma</h4>
                <p className="text-slate-500 text-sm mt-1">Doble titulación simultánea, ideal para proyección internacional.</p>
                {studentProgram.program_type === 'DUAL_DIPLOMA' && <div className="mt-4 flex items-center text-indigo-600 font-bold text-sm"><CheckCircle2 className="w-4 h-4 mr-1"/> Seleccionado</div>}
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={() => handleSaveProgram()} disabled={saving || !studentProgram.program_type} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
                Continuar a Mentoría <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Mentorship */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-slate-800">Seleccione el Tipo de Mentoría</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                onClick={() => setStudentProgram({...studentProgram, mentorship_type: 'NONE'})}
                className={`cursor-pointer rounded-xl border-2 p-5 text-center transition-all ${studentProgram.mentorship_type === 'NONE' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
              >
                <h4 className="font-bold text-slate-800">Sin Mentoría</h4>
                <p className="text-slate-500 text-xs mt-1">Estudio independiente</p>
              </div>

              <div 
                onClick={() => setStudentProgram({...studentProgram, mentorship_type: 'HUB'})}
                className={`cursor-pointer rounded-xl border-2 p-5 text-center transition-all ${studentProgram.mentorship_type === 'HUB' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
              >
                <Building2 className={`w-6 h-6 mx-auto mb-2 ${studentProgram.mentorship_type === 'HUB' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <h4 className="font-bold text-slate-800">Hub Físico</h4>
                <p className="text-slate-500 text-xs mt-1">Soporte presencial</p>
              </div>

              <div 
                onClick={() => setStudentProgram({...studentProgram, mentorship_type: 'TUTOR'})}
                className={`cursor-pointer rounded-xl border-2 p-5 text-center transition-all ${studentProgram.mentorship_type === 'TUTOR' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'}`}
              >
                <UserCircle className={`w-6 h-6 mx-auto mb-2 ${studentProgram.mentorship_type === 'TUTOR' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <h4 className="font-bold text-slate-800">Tutor Virtual</h4>
                <p className="text-slate-500 text-xs mt-1">Acompañamiento online</p>
              </div>
            </div>

            {studentProgram.mentorship_type === 'HUB' && (
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Información del Hub (Opcional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600">Nombre de Contacto</label>
                    <Input value={studentProgram.hub_contact_name || ''} onChange={e => setStudentProgram({...studentProgram, hub_contact_name: e.target.value})} placeholder="Ej. Hub Centro" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Email de Contacto</label>
                    <Input type="email" value={studentProgram.hub_contact_email || ''} onChange={e => setStudentProgram({...studentProgram, hub_contact_email: e.target.value})} placeholder="hub@ejemplo.com" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
              <Button onClick={() => handleSaveProgram()} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}
                Guardar y Pagar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Payment Links */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Programa Seleccionado</p>
                <p className="font-bold text-slate-800 text-lg">{studentProgram.program_type.replace('_', ' ')}</p>
                <p className="text-slate-500 text-sm">Mentoría: {studentProgram.mentorship_type}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>Editar</Button>
            </div>

            <h3 className="text-lg font-bold text-slate-800">Pagos Requeridos</h3>
            
            <div className="grid gap-4">
              
              {/* Enrollment Fee */}
              <div className="border border-slate-200 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-800">1. Matrícula (Enrollment Fee)</h4>
                  <p className="text-slate-500 text-sm">Pago único anual para habilitar acceso al SIS.</p>
                </div>
                <div>
                  {isCompleted('ENROLLMENT_FEE') ? (
                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5"/> Pagado
                    </span>
                  ) : (
                    <Button onClick={() => handleInitiatePayment('ENROLLMENT_FEE')} disabled={initiating} className="bg-[#0B2D5C] hover:bg-blue-900 text-white w-full md:w-auto">
                      {initiating ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CreditCard className="w-4 h-4 mr-2"/>}
                      Pagar Matrícula
                    </Button>
                  )}
                </div>
              </div>

              {/* Subscription */}
              <div className="border border-slate-200 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-800">2. Mensualidad (Tuition)</h4>
                  <p className="text-slate-500 text-sm">Suscripción recurrente mensual.</p>
                </div>
                <div>
                  {isCompleted('SUBSCRIPTION') ? (
                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5"/> Configurado
                    </span>
                  ) : (
                    <Button onClick={() => handleInitiatePayment('SUBSCRIPTION')} disabled={initiating} className="bg-indigo-600 hover:bg-indigo-700 text-white w-full md:w-auto">
                      {initiating ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CreditCard className="w-4 h-4 mr-2"/>}
                      Configurar Mensualidad
                    </Button>
                  )}
                </div>
              </div>

              {/* Mentorship (Conditional) */}
              {studentProgram.mentorship_type === 'HUB' && (
                <div className="border border-slate-200 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shadow-sm">
                  <div>
                    <h4 className="font-bold text-slate-800">3. Gastos de Hub</h4>
                    <p className="text-slate-500 text-sm">Pago correspondiente al soporte presencial.</p>
                  </div>
                  <div>
                    {isCompleted('MENTORSHIP') ? (
                      <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5"/> Pagado
                      </span>
                    ) : (
                      <Button onClick={() => handleInitiatePayment('MENTORSHIP')} disabled={initiating} className="bg-slate-800 hover:bg-slate-900 text-white w-full md:w-auto">
                        {initiating ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <CreditCard className="w-4 h-4 mr-2"/>}
                        Pagar Gastos Hub
                      </Button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
