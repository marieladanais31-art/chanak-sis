import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { DollarSign, CheckCircle2, AlertCircle, Plus, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const MOCK_PAYMENTS = [
  { id: '1', student_name: 'Daniel Vidal', amount: 500, method: 'credit_card', status: 'paid', date: new Date().toISOString() },
  { id: '2', student_name: 'Anais Vidal', amount: 500, method: 'bank_transfer', status: 'pending', date: new Date().toISOString() }
];

export default function AdminPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ student_id: '', amount: '', payment_method: 'credit_card', status: 'paid' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // In a real app we'd fetch actual payments table, but requirement says fallback to mock
      const { data: stdData } = await supabase.from('students').select('id, first_name, last_name');
      setStudents(stdData || []);
      setPayments(MOCK_PAYMENTS); // Mock payments for demo
    } catch (err) {
      setPayments(MOCK_PAYMENTS);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.student_id || !formData.amount) return;
    
    const student = students.find(s => s.id === formData.student_id) || { first_name: 'Estudiante', last_name: 'Mock' };
    const newPayment = {
      id: Date.now().toString(),
      student_name: `${student.first_name} ${student.last_name}`,
      amount: formData.amount,
      method: formData.payment_method,
      status: formData.status,
      date: new Date().toISOString()
    };
    
    setPayments([newPayment, ...payments]);
    setFormData({ student_id: '', amount: '', payment_method: 'credit_card', status: 'paid' });
    setShowForm(false);
    toast({ title: 'Éxito', description: 'Pago procesado correctamente' });
  };

  if (loading) return <div className="p-8">Cargando pagos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Control de Pagos</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {showForm ? <X className="w-4 h-4 mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancelar' : 'Procesar Pago'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-in fade-in">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Registrar Nuevo Pago</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alumno</label>
              <select required value={formData.student_id} onChange={e => setFormData({...formData, student_id: e.target.value})} className="w-full border p-2 rounded">
                <option value="">Seleccionar...</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                <option value="mock-1">Daniel Vidal (Mock)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monto ($)</label>
              <input required type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full border p-2 rounded" placeholder="Ej: 500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Método</label>
              <select value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})} className="w-full border p-2 rounded">
                <option value="credit_card">Tarjeta de Crédito</option>
                <option value="bank_transfer">Transferencia</option>
                <option value="cash">Efectivo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Estado</label>
              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border p-2 rounded">
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="w-4 h-4 mr-2" /> Registrar Pago</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Alumno</th>
              <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Monto</th>
              <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Método</th>
              <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Estado</th>
              <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">{p.student_name}</td>
                <td className="px-6 py-4 font-bold text-slate-700">${p.amount}</td>
                <td className="px-6 py-4 text-slate-600 capitalize">{p.method.replace('_', ' ')}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {p.status === 'paid' ? '✅ Pagado' : '⏳ Pendiente'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">{new Date(p.date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}