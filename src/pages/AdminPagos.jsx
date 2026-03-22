
import React, { useState } from 'react';
import { Plus, Edit, Trash2, CreditCard, Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function AdminPagos() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState([
    { id: 1, name: 'Matrícula', originalAmount: 500, scholarshipType: 'Ninguna', discount: 0, finalAmount: 500, type: 'Pago Único', status: 'Activo' },
    { id: 2, name: 'Mensualidad (Beca Parcial)', originalAmount: 300, scholarshipType: 'Parcial', discount: 50, finalAmount: 150, type: 'Mensual', status: 'Activo' },
    { id: 3, name: 'Mensualidad Especial', originalAmount: 300, scholarshipType: 'Completa', discount: 100, finalAmount: 0, type: 'Especial', status: 'Activo' },
  ]);

  const [form, setForm] = useState({
    name: '',
    originalAmount: '',
    scholarshipType: 'Ninguna',
    discount: 0,
    type: 'Mensual',
  });

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: null, totalCost: 0, scholarship: 0, balance: 0 });

  const calculateFinalAmount = (original, disc) => {
    const orig = parseFloat(original) || 0;
    const d = parseFloat(disc) || 0;
    const final = orig - (orig * d / 100);
    return Math.max(0, final);
  };

  const handleScholarshipChange = (type) => {
    let newDiscount = form.discount;
    if (type === 'Ninguna') newDiscount = 0;
    if (type === 'Completa') newDiscount = 100;
    setForm(prev => ({ ...prev, scholarshipType: type, discount: newDiscount }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      const newPayment = {
        id: Date.now(),
        name: form.name,
        originalAmount: parseFloat(form.originalAmount),
        scholarshipType: form.scholarshipType,
        discount: parseFloat(form.discount),
        finalAmount: calculateFinalAmount(form.originalAmount, form.discount),
        type: form.type,
        status: 'Activo'
      };
      setPayments([newPayment, ...payments]);
      setSaving(false);
      setIsModalOpen(false);
      setForm({ name: '', originalAmount: '', scholarshipType: 'Ninguna', discount: 0, type: 'Mensual' });
      toast({ title: 'Éxito', description: 'Estructura de pago creada correctamente.' });
    }, 800);
  };

  const handleDelete = () => {
    toast({ title: 'En desarrollo', description: '🚧 This feature isn\'t implemented yet—but don\'t worry! You can request it in your next prompt! 🚀' });
  };

  const handleEditClick = (payment) => {
    const scholarshipAmount = payment.originalAmount * (payment.discount / 100);
    setEditForm({
      id: payment.id,
      totalCost: payment.originalAmount,
      scholarship: scholarshipAmount,
      balance: payment.originalAmount - scholarshipAmount
    });
    setEditModalOpen(true);
  };

  const handleEditChange = (field, value) => {
    const numVal = parseFloat(value) || 0;
    setEditForm(prev => {
      const updated = { ...prev, [field]: numVal };
      updated.balance = Math.max(0, updated.totalCost - updated.scholarship);
      return updated;
    });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setPayments(payments.map(p => {
      if (p.id === editForm.id) {
        const discountPct = editForm.totalCost > 0 ? (editForm.scholarship / editForm.totalCost) * 100 : 0;
        return {
          ...p,
          originalAmount: editForm.totalCost,
          discount: discountPct,
          finalAmount: editForm.balance,
          scholarshipType: editForm.scholarship > 0 && editForm.balance === 0 ? 'Completa' : editForm.scholarship > 0 ? 'Parcial' : 'Ninguna'
        };
      }
      return p;
    }));
    toast({ title: 'Éxito', description: 'Pago actualizado correctamente.' });
    setEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Estructura de Pagos</h2>
        <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Pago
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold flex items-center gap-2 text-slate-700">
            <CreditCard className="w-5 h-5 text-emerald-600" /> Planes Disponibles
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 font-bold">
              <tr>
                <th className="p-4">Concepto</th>
                <th className="p-4">Monto Original</th>
                <th className="p-4">Beca</th>
                <th className="p-4">% Descuento</th>
                <th className="p-4 bg-emerald-50 text-emerald-800">Monto Final</th>
                <th className="p-4">Frecuencia</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-800">{item.name}</td>
                  <td className="p-4 text-slate-500 line-through">${item.originalAmount.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${item.scholarshipType === 'Ninguna' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                      {item.scholarshipType}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium">{item.discount.toFixed(0)}%</td>
                  <td className="p-4 font-black text-emerald-600 text-base bg-emerald-50/30">${item.finalAmount.toFixed(2)}</td>
                  <td className="p-4 text-slate-600">{item.type}</td>
                  <td className="p-4 text-right space-x-2">
                    <Button onClick={() => handleEditClick(item)} variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-200">
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button onClick={handleDelete} variant="outline" size="sm" className="h-8 w-8 p-0 border-red-200 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-slate-500 font-medium">No hay pagos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Scholarship Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" /> Ajustar Pago y Beca
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-5">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Costo Total ($)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={editForm.totalCost} 
                  onChange={e => handleEditChange('totalCost', e.target.value)} 
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white" 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Monto de Beca Asignada ($)</label>
                <input 
                  type="number" 
                  min="0" 
                  step="0.01" 
                  value={editForm.scholarship} 
                  onChange={e => handleEditChange('scholarship', e.target.value)} 
                  className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 bg-white" 
                />
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                <span className="font-bold text-slate-700">Saldo Pendiente:</span>
                <span className={`text-2xl font-black ${editForm.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ${editForm.balance.toFixed(2)}
                </span>
              </div>

              {editForm.balance > 0 ? (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  🚨 PAGOS PENDIENTES
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-3 rounded-lg border border-emerald-200 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  Pago completado o beca total
                </div>
              )}
              
              <div className="flex gap-3 pt-2">
                <Button type="button" onClick={() => setEditModalOpen(false)} variant="outline" className="flex-1 font-bold text-slate-700">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  Guardar Ajustes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" /> Crear Nuevo Pago
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Concepto</label>
                  <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800" placeholder="Ej. Matrícula 2024" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Frecuencia</label>
                  <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-white">
                    <option value="Pago Único">Pago Único</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Monto Original ($)</label>
                  <input required type="number" min="0" step="0.01" value={form.originalAmount} onChange={e => setForm({...form, originalAmount: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800" placeholder="0.00" />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h4 className="font-bold text-sm text-slate-800 mb-2">Configuración de Becas y Descuentos</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Beca</label>
                    <select required value={form.scholarshipType} onChange={e => handleScholarshipChange(e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-white">
                      <option value="Ninguna">Ninguna</option>
                      <option value="Parcial">Parcial</option>
                      <option value="Completa">Completa</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">% Descuento</label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={form.discount} 
                      onChange={e => setForm({...form, discount: e.target.value, scholarshipType: e.target.value == 100 ? 'Completa' : e.target.value == 0 ? 'Ninguna' : 'Parcial'})} 
                      disabled={form.scholarshipType === 'Ninguna' || form.scholarshipType === 'Completa'}
                      className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 disabled:bg-slate-100 disabled:text-slate-500" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="font-bold text-emerald-800">Monto Final a Pagar:</span>
                <span className="text-2xl font-black text-emerald-600">
                  ${calculateFinalAmount(form.originalAmount, form.discount).toFixed(2)}
                </span>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button type="button" onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1 font-bold text-slate-700">
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Guardar Pago'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
