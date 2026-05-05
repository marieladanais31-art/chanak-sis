import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, X, User, Users, BookOpen, Shield } from 'lucide-react';

const INPUT = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const LABEL = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';
const SECTION = 'grid grid-cols-1 md:grid-cols-2 gap-4';

const TABS = [
  { id: 'personal',  label: 'Personal',  icon: User },
  { id: 'familia',   label: 'Familia',   icon: Users },
  { id: 'academico', label: 'Académico', icon: BookOpen },
  { id: 'admin',     label: 'Admin',     icon: Shield },
];

const EMPTY = {
  first_name: '', last_name: '', date_of_birth: '', nationality: 'Española',
  id_document_type: 'Pasaporte', id_document_number: '', gender: '',
  address: '', city: '', country: 'España', phone: '', student_email: '',
  parent1_name: '', parent1_relationship: 'Madre', parent1_phone: '', parent1_email: '',
  parent2_name: '', parent2_relationship: 'Padre', parent2_phone: '', parent2_email: '',
  enrollment_date: '', last_school_name: '', last_grade_completed: '',
  grade_level: '', us_grade_level: '', modality: 'Off-Campus', curriculum_base: 'ACE',
  diagnostic_notes: '', vocational_interest: '', graduation_pathway_notes: '',
  dual_diploma_enrolled: false, dual_diploma_partner_school: '', dual_diploma_country: '',
  student_status: 'active', admin_notes: '', hub_id: '', tutor_id: '',
};

export default function StudentFicha({ studentId, onClose }) {
  const { toast } = useToast();
  const [tab, setTab] = useState('personal');
  const [form, setForm] = useState(EMPTY);
  const [hubs, setHubs] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [studentRes, hubsRes, tutorsRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase.from('organizations').select('id, name').order('name'),
      supabase.from('profiles').select('id, first_name, last_name').eq('role', 'tutor').order('first_name'),
    ]);
    if (studentRes.data) {
      const s = studentRes.data;
      setForm({
        first_name: s.first_name || '',
        last_name: s.last_name || '',
        date_of_birth: s.date_of_birth || '',
        nationality: s.nationality || 'Española',
        id_document_type: s.id_document_type || 'Pasaporte',
        id_document_number: s.id_document_number || '',
        gender: s.gender || '',
        address: s.address || '',
        city: s.city || '',
        country: s.country || 'España',
        phone: s.phone || '',
        student_email: s.student_email || '',
        parent1_name: s.parent1_name || '',
        parent1_relationship: s.parent1_relationship || 'Madre',
        parent1_phone: s.parent1_phone || '',
        parent1_email: s.parent1_email || '',
        parent2_name: s.parent2_name || '',
        parent2_relationship: s.parent2_relationship || 'Padre',
        parent2_phone: s.parent2_phone || '',
        parent2_email: s.parent2_email || '',
        enrollment_date: s.enrollment_date || '',
        last_school_name: s.last_school_name || '',
        last_grade_completed: s.last_grade_completed || '',
        grade_level: s.grade_level || '',
        us_grade_level: s.us_grade_level || '',
        modality: s.modality || 'Off-Campus',
        curriculum_base: s.curriculum_base || 'ACE',
        diagnostic_notes: s.diagnostic_notes || '',
        vocational_interest: s.vocational_interest || '',
        graduation_pathway_notes: s.graduation_pathway_notes || '',
        dual_diploma_enrolled: s.dual_diploma_enrolled || false,
        dual_diploma_partner_school: s.dual_diploma_partner_school || '',
        dual_diploma_country: s.dual_diploma_country || '',
        student_status: s.student_status || 'active',
        admin_notes: s.admin_notes || '',
        hub_id: s.hub_id || '',
        tutor_id: s.tutor_id || '',
      });
    }
    setHubs(hubsRes.data || []);
    setTutors(tutorsRes.data || []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('students')
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        date_of_birth: form.date_of_birth || null,
        nationality: form.nationality,
        id_document_type: form.id_document_type || null,
        id_document_number: form.id_document_number,
        gender: form.gender || null,
        address: form.address,
        city: form.city,
        country: form.country,
        phone: form.phone,
        student_email: form.student_email,
        parent1_name: form.parent1_name,
        parent1_relationship: form.parent1_relationship,
        parent1_phone: form.parent1_phone,
        parent1_email: form.parent1_email,
        parent2_name: form.parent2_name,
        parent2_relationship: form.parent2_relationship,
        parent2_phone: form.parent2_phone,
        parent2_email: form.parent2_email,
        enrollment_date: form.enrollment_date || null,
        last_school_name: form.last_school_name,
        last_grade_completed: form.last_grade_completed,
        grade_level: form.grade_level,
        us_grade_level: form.us_grade_level,
        modality: form.modality,
        curriculum_base: form.curriculum_base,
        diagnostic_notes: form.diagnostic_notes,
        vocational_interest: form.vocational_interest,
        graduation_pathway_notes: form.graduation_pathway_notes,
        dual_diploma_enrolled: form.dual_diploma_enrolled,
        dual_diploma_partner_school: form.dual_diploma_partner_school,
        dual_diploma_country: form.dual_diploma_country,
        student_status: form.student_status,
        admin_notes: form.admin_notes,
        hub_id: form.hub_id || null,
        tutor_id: form.tutor_id || null,
      })
      .eq('id', studentId);

    setSaving(false);
    if (error) {
      toast({ title: 'Error al guardar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ficha guardada', description: 'Datos del estudiante actualizados.' });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200" style={{ background: '#193D6D' }}>
          <div>
            <h2 className="text-xl font-black text-white">Ficha del Estudiante</h2>
            <p className="text-blue-200 text-sm font-medium mt-0.5">
              {form.first_name} {form.last_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-bold transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold transition-all border-b-2 ${
                tab === id
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {tab === 'personal' && (
            <>
              <div className={SECTION}>
                <div>
                  <label className={LABEL}>Nombre</label>
                  <input className={INPUT} value={form.first_name} onChange={set('first_name')} />
                </div>
                <div>
                  <label className={LABEL}>Apellido(s)</label>
                  <input className={INPUT} value={form.last_name} onChange={set('last_name')} />
                </div>
                <div>
                  <label className={LABEL}>Fecha de nacimiento</label>
                  <input type="date" className={INPUT} value={form.date_of_birth} onChange={set('date_of_birth')} />
                </div>
                <div>
                  <label className={LABEL}>Género</label>
                  <select className={INPUT} value={form.gender} onChange={set('gender')}>
                    <option value="">— Seleccionar —</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="Other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Nacionalidad</label>
                  <input className={INPUT} value={form.nationality} onChange={set('nationality')} />
                </div>
                <div>
                  <label className={LABEL}>Tipo de documento</label>
                  <select className={INPUT} value={form.id_document_type} onChange={set('id_document_type')}>
                    <option value="DNI">DNI</option>
                    <option value="NIE">NIE</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="Other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Número de documento</label>
                  <input className={INPUT} value={form.id_document_number} onChange={set('id_document_number')} />
                </div>
                <div>
                  <label className={LABEL}>Teléfono</label>
                  <input className={INPUT} value={form.phone} onChange={set('phone')} />
                </div>
                <div>
                  <label className={LABEL}>Email del estudiante</label>
                  <input type="email" className={INPUT} value={form.student_email} onChange={set('student_email')} />
                </div>
              </div>
              <hr className="border-slate-200" />
              <div className={SECTION}>
                <div className="md:col-span-2">
                  <label className={LABEL}>Dirección</label>
                  <input className={INPUT} value={form.address} onChange={set('address')} />
                </div>
                <div>
                  <label className={LABEL}>Ciudad</label>
                  <input className={INPUT} value={form.city} onChange={set('city')} />
                </div>
                <div>
                  <label className={LABEL}>País</label>
                  <input className={INPUT} value={form.country} onChange={set('country')} />
                </div>
              </div>
            </>
          )}

          {tab === 'familia' && (
            <>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-black text-slate-800 mb-4 text-sm uppercase tracking-wider">Contacto Principal (Padre / Madre / Tutor 1)</h3>
                <div className={SECTION}>
                  <div>
                    <label className={LABEL}>Nombre completo</label>
                    <input className={INPUT} value={form.parent1_name} onChange={set('parent1_name')} />
                  </div>
                  <div>
                    <label className={LABEL}>Relación</label>
                    <select className={INPUT} value={form.parent1_relationship} onChange={set('parent1_relationship')}>
                      <option>Madre</option>
                      <option>Padre</option>
                      <option>Tutor legal</option>
                      <option>Abuela/o</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Teléfono</label>
                    <input className={INPUT} value={form.parent1_phone} onChange={set('parent1_phone')} />
                  </div>
                  <div>
                    <label className={LABEL}>Email</label>
                    <input type="email" className={INPUT} value={form.parent1_email} onChange={set('parent1_email')} />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-black text-slate-800 mb-4 text-sm uppercase tracking-wider">Contacto Secundario (Padre / Madre / Tutor 2)</h3>
                <div className={SECTION}>
                  <div>
                    <label className={LABEL}>Nombre completo</label>
                    <input className={INPUT} value={form.parent2_name} onChange={set('parent2_name')} />
                  </div>
                  <div>
                    <label className={LABEL}>Relación</label>
                    <select className={INPUT} value={form.parent2_relationship} onChange={set('parent2_relationship')}>
                      <option>Padre</option>
                      <option>Madre</option>
                      <option>Tutor legal</option>
                      <option>Abuela/o</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className={LABEL}>Teléfono</label>
                    <input className={INPUT} value={form.parent2_phone} onChange={set('parent2_phone')} />
                  </div>
                  <div>
                    <label className={LABEL}>Email</label>
                    <input type="email" className={INPUT} value={form.parent2_email} onChange={set('parent2_email')} />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'academico' && (
            <>
              <div className={SECTION}>
                <div>
                  <label className={LABEL}>Fecha de inscripción</label>
                  <input type="date" className={INPUT} value={form.enrollment_date} onChange={set('enrollment_date')} />
                </div>
                <div>
                  <label className={LABEL}>Último colegio</label>
                  <input className={INPUT} value={form.last_school_name} onChange={set('last_school_name')} />
                </div>
                <div>
                  <label className={LABEL}>Último grado completado</label>
                  <input className={INPUT} placeholder="6.º Primaria" value={form.last_grade_completed} onChange={set('last_grade_completed')} />
                </div>
                <div>
                  <label className={LABEL}>Grado actual (español)</label>
                  <input className={INPUT} placeholder="1.º ESO" value={form.grade_level} onChange={set('grade_level')} />
                </div>
                <div>
                  <label className={LABEL}>Grado actual (US)</label>
                  <input className={INPUT} placeholder="7th Grade" value={form.us_grade_level} onChange={set('us_grade_level')} />
                </div>
                <div>
                  <label className={LABEL}>Modalidad</label>
                  <select className={INPUT} value={form.modality} onChange={set('modality')}>
                    <option value="Off-Campus">Off-Campus</option>
                    <option value="Dual Diploma">Dual Diploma</option>
                    <option value="On-Campus">On-Campus</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Currículo base</label>
                  <input className={INPUT} value={form.curriculum_base} onChange={set('curriculum_base')} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Interés vocacional</label>
                <input className={INPUT} placeholder="Área Financiera, Ingeniería, Artes…" value={form.vocational_interest} onChange={set('vocational_interest')} />
              </div>
              <div>
                <label className={LABEL}>Notas diagnósticas</label>
                <textarea rows={4} className={INPUT} placeholder="Fortalezas, vacíos, áreas de atención…" value={form.diagnostic_notes} onChange={set('diagnostic_notes')} />
              </div>
              <div>
                <label className={LABEL}>Graduation Pathway</label>
                <textarea rows={3} className={INPUT} placeholder="Plan de graduación, créditos esperados, ruta universitaria…" value={form.graduation_pathway_notes} onChange={set('graduation_pathway_notes')} />
              </div>
              {/* Dual Diploma */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-amber-600"
                    checked={form.dual_diploma_enrolled}
                    onChange={set('dual_diploma_enrolled')}
                  />
                  <span className="font-bold text-slate-800 text-sm">Dual Diploma activo</span>
                </label>
                {form.dual_diploma_enrolled && (
                  <div className={SECTION}>
                    <div>
                      <label className={LABEL}>Centro colaborador</label>
                      <input className={INPUT} value={form.dual_diploma_partner_school} onChange={set('dual_diploma_partner_school')} />
                    </div>
                    <div>
                      <label className={LABEL}>País del centro</label>
                      <input className={INPUT} value={form.dual_diploma_country} onChange={set('dual_diploma_country')} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'admin' && (
            <>
              <div className={SECTION}>
                <div>
                  <label className={LABEL}>Hub</label>
                  <select className={INPUT} value={form.hub_id} onChange={set('hub_id')}>
                    <option value="">— Sin hub —</option>
                    {hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Tutor asignado</label>
                  <select className={INPUT} value={form.tutor_id} onChange={set('tutor_id')}>
                    <option value="">— Sin tutor —</option>
                    {tutors.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Estado del estudiante</label>
                  <select className={INPUT} value={form.student_status} onChange={set('student_status')}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="graduated">Graduado</option>
                    <option value="withdrawn">Retirado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Notas administrativas</label>
                <textarea rows={5} className={INPUT} value={form.admin_notes} onChange={set('admin_notes')} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-bold">
            Cerrar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar ficha
          </button>
        </div>
      </div>
    </div>
  );
}
