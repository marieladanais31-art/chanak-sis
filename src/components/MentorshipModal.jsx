
import React, { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2, CreditCard, Mail, User, Phone, Info } from 'lucide-react';

export default function MentorshipModal({ studentId, studentProgram, onComplete }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const mentorType = studentProgram?.mentor_type;

  const handlePadreTutorComplete = () => {
    console.log('✅ [MentorshipModal] PADRE_TUTOR confirmed');
    onComplete();
  };

  const handleHubPayment = () => {
    console.log('💳 [MentorshipModal] Redirecting to Hub payment');
    toast({ title: "Redirigiendo...", description: "Iniciando pago de hub." });
    onComplete();
  };

  const handleExternalTutorSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({ title: "Campos requeridos", description: "El nombre y correo son obligatorios.", variant: "destructive" });
      return;
    }

    setLoading(true);
    console.log(`📧 [MentorshipModal] Sending invitation to external tutor: ${formData.email}`);

    try {
      // 1. Update student_programs
      const { error: spError } = await supabase
        .from('student_programs')
        .update({
          external_tutor_name: formData.name,
          external_tutor_email: formData.email,
          external_tutor_phone: formData.phone
        })
        .eq('student_id', studentId);

      if (spError) throw spError;

      // 2. Create mentor_access record
      const { error: maError } = await supabase
        .from('mentor_access')
        .upsert({
          student_id: studentId,
          mentor_type: 'TUTOR_EXTERNO',
          mentor_email: formData.email,
          mentor_name: formData.name,
          can_edit_pei: false,
          can_edit_grades: true
        }, { onConflict: 'student_id, mentor_email' });

      if (maError) throw maError;

      console.log('✅ [MentorshipModal] Tutor records updated successfully');
      toast({ title: "Invitación Enviada", description: "El tutor externo ha sido registrado." });
      onComplete();

    } catch (err) {
      console.error('❌ [MentorshipModal] Error saving external tutor:', err);
      toast({ title: "Error", description: "Hubo un problema guardando los datos del tutor.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!mentorType) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {mentorType === 'PADRE_TUTOR' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Padre-Tutor</h2>
              <p className="text-slate-600 mt-2">
                Como padre-tutor, tendrás acceso completo para editar el PEI y registrar las notas diarias del estudiante.
              </p>
            </div>
            <Button onClick={handlePadreTutorComplete} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              ✅ Continuar
            </Button>
          </div>
        )}

        {mentorType === 'HUB' && (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <Info className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Hub Educativo</h2>
              <p className="text-slate-600 mt-2">
                El estudiante asistirá a un Hub presencial. Para finalizar el registro, debes completar el pago correspondiente.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={handleHubPayment} className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-sm">
                💳 Pagar Gastos de Hub
              </Button>
              <Button variant="outline" onClick={onComplete} className="w-full">
                ← Continuar
              </Button>
            </div>
          </div>
        )}

        {mentorType === 'TUTOR_EXTERNO' && (
          <div className="p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Invitar Tutor Externo</h2>
              <p className="text-slate-600 text-sm mt-2">
                Ingresa los datos del tutor externo para enviarle una invitación al portal.
              </p>
            </div>
            
            <form onSubmit={handleExternalTutorSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700">Nombre Completo</label>
                <Input 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ej. María Pérez" 
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Correo Electrónico</label>
                <Input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="tutor@ejemplo.com" 
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Teléfono (Opcional)</label>
                <Input 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+1 234 567 8900" 
                  className="mt-1"
                />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4">
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Mail className="w-4 h-4 mr-2"/>}
                📧 Enviar Invitación
              </Button>
              <Button type="button" variant="ghost" onClick={onComplete} className="w-full text-slate-500">
                Saltar por ahora
              </Button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
