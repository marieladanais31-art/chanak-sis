import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Users, CreditCard, FileSignature, CheckCircle2, UserPlus, DollarSign, FileText, BarChart, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0, activeContracts: 0, enrolled: 0, scholarshipStudents: 0 });
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.from('students').select('*');
        if (error) throw error;
        
        const students = data || [];
        calculateStats(students);
      } catch (err) {
        setNetworkError(true);
        calculateStats([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const calculateStats = (students) => {
    setStats({
      total: students.length,
      paid: students.filter(s => s.payment_status === 'paid').length,
      pending: students.filter(s => s.payment_status !== 'paid' && !s.is_scholarship).length,
      activeContracts: students.filter(s => s.contract_status === 'Active').length,
      enrolled: students.filter(s => s.status === 'Enrolled').length,
      scholarshipStudents: students.filter(s => s.is_scholarship).length
    });
  };

  const statCards = [
    { label: 'Total Alumnos', value: stats.total, icon: Users, color: 'border-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Inscritos', value: stats.enrolled, icon: CheckCircle2, color: 'border-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Becados', value: stats.scholarshipStudents, icon: Award, color: 'border-purple-500', text: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pagos Confirmados', value: stats.paid, icon: CreditCard, color: 'border-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pendientes', value: stats.pending, icon: DollarSign, color: 'border-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' }
  ];

  if (loading) return <div className="p-8">Cargando dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard General</h2>
      </div>

      {networkError && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-lg border border-amber-200 text-sm font-medium">
          ⚠️ No se pudo conectar con la base de datos.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`bg-white rounded-xl shadow-sm border-l-4 border-y border-r border-slate-200 p-5 flex flex-col justify-between ${stat.color}`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <div className={`p-2 rounded-full ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.text}`} />
                </div>
              </div>
              <h3 className={`text-2xl font-black ${stat.text}`}>{stat.value}</h3>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Resumen de Conversión</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-600">Tasa de Pago</span>
                <span className="font-bold text-slate-800">{stats.total > 0 ? Math.round(((stats.paid + stats.scholarshipStudents) / stats.total) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${stats.total > 0 ? ((stats.paid + stats.scholarshipStudents) / stats.total) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-600">Tasa de Contratos</span>
                <span className="font-bold text-slate-800">{stats.total > 0 ? Math.round((stats.activeContracts / stats.total) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${stats.total > 0 ? (stats.activeContracts / stats.total) * 100 : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-600">Tasa de Inscripción Final</span>
                <span className="font-bold text-slate-800">{stats.total > 0 ? Math.round((stats.enrolled / stats.total) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${stats.total > 0 ? (stats.enrolled / stats.total) * 100 : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Acciones Rápidas</h3>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border-slate-200">
              <UserPlus className="w-4 h-4 mr-3" /> Agregar Alumno
            </Button>
            <Button variant="outline" className="w-full justify-start text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200">
              <DollarSign className="w-4 h-4 mr-3" /> Procesar Pago
            </Button>
            <Button variant="outline" className="w-full justify-start text-slate-600 hover:text-purple-700 hover:bg-purple-50 border-slate-200">
              <FileText className="w-4 h-4 mr-3" /> Firmar Contrato
            </Button>
            <Button variant="outline" className="w-full justify-start text-slate-600 hover:text-blue-700 hover:bg-blue-50 border-slate-200">
              <BarChart className="w-4 h-4 mr-3" /> Ver Reportes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}