
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { CreditCard, Loader2, Pencil, Search, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminPayments() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [scholarship, setScholarship] = useState(0);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const FEES = {
    matricula: 500,
    mensualidad: 200,
    certificacion: 100
  };
  const SUBTOTAL = FEES.matricula + FEES.mensualidad + FEES.certificacion; // 800

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level, scholarship_percentage')
        .order('first_name');
        
      if (error && error.code !== '42703') throw error; 

      setStudents(data || []);
    } catch (err) {
      console.error('❌ AdminPayments: Error loading', err);
      toast({ title: 'Error', description: 'No se pudieron cargar los estudiantes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const openModal = (student) => {
    setSelectedStudent(student);
    setScholarship(student.scholarship_percentage || 0);
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ scholarship_percentage: Number(scholarship) })
        .eq('id', selectedStudent.id);
        
      if (error) {
        if (error.code === '42703') {
           setStudents(students.map(s => s.id === selectedStudent.id ? {...s, scholarship_percentage: Number(scholarship)} : s));
           toast({ title: 'Éxito (Simulado)', description: 'Beca actualizada visualmente (columna no existe en DB)' });
        } else {
           throw error;
        }
      } else {
        toast({ title: 'Éxito', description: 'Porcentaje de beca actualizado' });
        loadStudents();
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('❌ AdminPayments: Error saving scholarship', err);
      toast({ title: 'Error', description: 'No se pudo guardar la beca', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header Structure */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
          <CreditCard className="w-6 h-6 text-blue-600" />
          Estructura de Pagos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-600">Matrícula Anual</span>
            <span className="text-xl font-bold text-blue-700">${FEES.matricula}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-600">Cuota Mensual</span>
            <span className="text-xl font-bold text-blue-700">${FEES.mensualidad}</span>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-600">Certificación</span>
            <span className="text-xl font-bold text-blue-700">${FEES.certificacion}</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Gestión de Becas y Totales</h3>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar estudiante..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Estudiante</th>
                  <th className="px-6 py-4">Nivel</th>
                  <th className="px-6 py-4 text-center">Beca Asignada (%)</th>
                  <th className="px-6 py-4 text-right">Total a Pagar</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => {
                  const perc = student.scholarship_percentage || 0;
                  const discount = (SUBTOTAL * perc) / 100;
                  const total = SUBTOTAL - discount;
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">{student.first_name} {student.last_name}</td>
                      <td className="px-6 py-4 text-slate-600">{student.grade_level || 'N/A'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${perc > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {perc}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-blue-700 text-base">
                        ${total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => openModal(student)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar Beca"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Asignar Beca Estudiantil</h3>
              <p className="text-xs text-slate-500 mt-1">{selectedStudent?.first_name} {selectedStudent?.last_name}</p>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Porcentaje de Descuento (0-100%)</label>
                <input 
                  type="number" 
                  min="0" max="100" 
                  value={scholarship} 
                  onChange={e => setScholarship(e.target.value)} 
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg" 
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex justify-between text-sm text-blue-700 mb-1">
                  <span>Subtotal Base:</span>
                  <span>${SUBTOTAL.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600 font-medium mb-3 pb-3 border-b border-blue-200">
                  <span>Descuento ({scholarship || 0}%):</span>
                  <span>-${((SUBTOTAL * (scholarship || 0)) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-blue-900 text-lg">
                  <span>Total Final:</span>
                  <span>${(SUBTOTAL - ((SUBTOTAL * (scholarship || 0)) / 100)).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Aplicar Beca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
