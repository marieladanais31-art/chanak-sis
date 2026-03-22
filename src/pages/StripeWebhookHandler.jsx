
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StripeWebhookHandler() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const processPayment = async () => {
      const sessionId = searchParams.get('session_id');
      const paymentIntentId = searchParams.get('payment_intent') || `pi_mock_${Date.now()}`;

      console.log(`🔗 [StripeWebhook] Processing session_id: ${sessionId}`);

      if (!sessionId) {
        setStatus('error');
        setErrorMsg('No session ID found in URL parameters.');
        console.error('❌ [StripeWebhook] Missing session_id');
        return;
      }

      try {
        // Find the pending payment
        const { data: payment, error: fetchError } = await supabase
          .from('student_payments')
          .select('*')
          .eq('stripe_session_id', sessionId)
          .single();

        if (fetchError || !payment) {
          throw new Error('Payment record not found for this session.');
        }

        console.log(`✅ [StripeWebhook] Found payment record:`, payment.id);

        // Update payment status
        const { error: updateError } = await supabase
          .from('student_payments')
          .update({
            status: 'COMPLETED',
            stripe_payment_intent_id: paymentIntentId,
            paid_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateError) throw updateError;
        console.log(`💾 [StripeWebhook] Payment status updated to COMPLETED.`);

        // If enrollment fee, update enrollment_status table
        if (payment.payment_type === 'ENROLLMENT_FEE') {
          const { error: enrollError } = await supabase
            .from('enrollment_status')
            .upsert({
              student_id: payment.student_id,
              payment_confirmed: true,
              payment_confirmed_at: new Date().toISOString(),
              sis_access_enabled: true,
              sis_access_enabled_at: new Date().toISOString()
            }, { onConflict: 'student_id' });

          if (enrollError) throw enrollError;
          console.log(`✅ [StripeWebhook] Enrollment status updated: payment_confirmed & sis_access_enabled.`);
        }

        setStatus('success');
      } catch (err) {
        console.error('❌ [StripeWebhook] Error processing payment:', err);
        setStatus('error');
        setErrorMsg(err.message);
      }
    };

    // If it's the cancel route
    if (window.location.pathname.includes('/cancel')) {
      setStatus('pending');
      const sessionId = searchParams.get('session_id');
      if (sessionId) {
         supabase.from('student_payments').update({ status: 'CANCELLED' }).eq('stripe_session_id', sessionId).then();
      }
    } else {
      processPayment();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        
        {status === 'processing' && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
            <h2 className="text-2xl font-bold text-slate-800">Procesando Pago</h2>
            <p className="text-slate-500">Por favor espere mientras confirmamos la transacción con Stripe...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">¡Pago Exitoso!</h2>
            <p className="text-slate-600">Su transacción ha sido confirmada y procesada correctamente.</p>
            <div className="pt-4">
              <Link to="/portal-familia">
                <Button className="w-full bg-[#0B2D5C] hover:bg-blue-900 text-white">
                  Volver al Portal
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Pago Cancelado</h2>
            <p className="text-slate-600">El proceso de pago fue cancelado o no se completó.</p>
            <div className="pt-4">
              <Link to="/portal-familia">
                <Button variant="outline" className="w-full">
                  Volver al Portal
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Error en el Pago</h2>
            <p className="text-slate-600">No pudimos verificar su pago. {errorMsg}</p>
            <div className="pt-4">
              <Link to="/portal-familia">
                <Button variant="outline" className="w-full">
                  Volver al Portal
                </Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
