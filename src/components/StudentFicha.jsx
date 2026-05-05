import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, X, User, Users, BookOpen, Heart } from 'lucide-react';
import { ACADEMIC_YEARS } from '@/lib/academicUtils';

const INPUT = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const LABEL = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';
const SECTION = 'grid grid-cols-1 md:grid-cols-2 gap-4';

const TABS = [
  { id: 'personal',  label: 'Personal',  icon: User },
  { id: 'familia',   label: 'Familia',   icon: Users },
  { id: 'academico', label: 'Académico', icon: BookOpen },
  { id: 'admin',     label: 'Admin / Salud', icon: Heart },
];

const EMPTY = {
  first_name: '', last_name: '', date_of_birth: '', nationality: 'Española',
  id_document_type: 'Pasaporte', id_document_number: '', gender: '',
  birth_country: '', birth_city: '',
  address: '', city: '', province: '', postal_code: '', country: 'España',
  phone: '', student_email: '',
  parent1_name: '', parent1_relationship: 'Madre', parent1_phone: '', parent1_email: '',
  parent2_name: '', parent2_relationship: 'Padre', parent2_phone: '', parent2_email: '',
  enrollment_date: '', start_date: '', estimated_end_date: '',
  last_school_name: '', last_grade_completed: '',
  grade_level: '', us_grade_level: '', school_stage: 'elementary',
  academic_year: '2025-2026',
  modality: 'Off-Campus', curriculum_base: 'ACE',
  diag_math: '', diag_english: '', diag_word_building: '', diag_science: '', diag_social_studies: '',
  diagnostic_notes: '', vocational_interest: '', graduation_pathway_notes: '',
  pei_observations: '',
  dual_diploma_enrolled: false, dual_diploma_partner_school: '', dual_diploma_country: '',
  dual_diploma_observations: '',
  student_status: 'active', admission_status: 'enrolled',
  admin_notes: '', medical_notes: '', special_educational_needs: '',
  documentary_notes: '', hub_id: '', tutor_id: '',
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
        birth_country: s.birth_country || '',
        birth_city: s.birth_city || '',
        address: s.address || '',
        city: s.city || '',
        province: s.province || '',
        postal_code: s.postal_code || '',
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
        start_date: s.start_date || '',
        estimated_end_date: s.estimated_end_date || '',
        last_school_name: s.last_school_name || '',
        last_grade_completed: s.last_grade_completed || '',
        grade_level: s.grade_level || '',
        us_grade_level: s.us_grade_level || '',
        school_stage: s.school_stage || 'elementary',
        academic_year: s.academic_year || '2025-2026',
        modality: s.modality || 'Off-Campus',
        curriculum_base: s.curriculum_base || 'ACE',
        diag_math: s.diag_math || '',
        diag_english: s.diag_english || '',
        diag_word_building: s.diag_word_building || '',
        diag_science: s.diag_science || '',
        diag_social_studies: s.diag_social_studies || '',
        diagnostic_notes: s.diagnostic_notes || '',
        vocational_interest: s.vocational_interest || '',
        graduation_pathway_notes: s.graduation_pathway_notes || '',
        pei_observations: s.pei_observations || '',
        dual_diploma_enrolled: s.dual_diploma_enrolled || false,
        dual_diploma_partner_school: s.dual_diploma_partner_school || '',
        dual_diploma_country: s.dual_diploma_country || '',
        dual_diploma_observations: s.dual_diploma_observations || '',
        student_status: s.student_status || 'active',
        admission_status: s.admission_status || 'enrolled',
        admin_notes: s.admin_notes || '',
        medical_notes: s.medical_notes || '',
        special_educational_needs: s.special_educational_needs || '',
        documentary_notes: s.documentary_notes || '',
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

  const calcAge = () => {
    if (!form.date_of_birth) return null;
    return Math.floor((Date.now() - new Date(form.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000));
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
        birth_country: form.birth_country,
        birth_city: form.birth_city,
        address: form.address,
        city: form.city,
        province: form.province,
        postal_code: form.postal_code,
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
        start_date: form.start_date || null,
        estimated_end_date: form.estimated_end_date || null,
        last_school_name: form.last_school_name,
        last_grade_completed: form.last_grade_completed,
        grade_level: form.grade_level,
        us_grade_level: form.us_grade_level,
        school_stage: form.school_stage || null,
        academic_year: form.academic_year || '2025-2026',
        modality: form.modality,
        curriculum_base: form.curriculum_base,
        diag_math: form.diag_math,
        diag_english: form.diag_english,
        diag_word_building: form.diag_word_building,
        diag_science: form.diag_science,
        diag_social_studies: form.diag_social_studies,
        diagnostic_notes: form.diagnostic_notes,
        vocational_interest: form.vocational_interest,
        graduation_pathway_notes: form.graduation_pathway_notes,
        pei_observations: form.pei_observations,
        dual_diploma_enrolled: form.dual_diploma_enrolled,
        dual_diploma_partner_school: form.dual_diploma_partner_school,
        dual_diploma_country: form.dual_diploma_country,
        dual_diploma_observations: form.dual_diploma_observations,
        student_status: form.student_status,
        admission_status: form.admission_status,
        admin_notes: form.admin_notes,
        medical_notes: form.medical_notes,
        special_educational_needs: form.special_educational_needs,
        documentary_notes: form.documentary_notes,
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <Loader2 className="w-10 h-10 animate-spin text-white" />
    </div>
  );

  const age = calcAge();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200" style={{ background: '#193D6D' }}>
          <div>
            <h2 className="font-black text-white text-lg">
              {form.first_name || 'Estudiante'} {form.last_name}
            </h2>
            <p className="text-blue-200 text-xs mt-0.5">Ficha completa del estudiante</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto shrink-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                tab === id
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* ── PERSONAL ── */}
          {tab === 'personal' && (
            <>
              <div className={SECTION}>
                <div>
                  <label className={LABEL}>Nombre(s)</label>
                  <input className={INPUT} value={form.first_name} onChange={set('first_name')} />
                </div>
                <div>
                  <label className={LABEL}>Apellido(s)</label>
                  <input className={INPUT} value={form.last_name} onChange={set('last_name')} />
                </div>
                <div>
                  <label className={LABEL}>Fecha de nacimiento</label>
                  <input type="date" className={INPUT} value={form.date_of_birth} onChange={set('date_of_birth')} />
                  {age !== null && (
                    <p className="text-xs text-slate-500 mt-1">Edad: <strong>{age} años</strong></p>
                  )}
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
                  <label className={LABEL}>País de nacimiento</label>
                  <input className={INPUT} value={form.birth_country} onChange={set('birth_country')} />
                </div>
                <div>
                  <label className={LABEL}>Ciudad de nacimiento</label>
                  <input className={INPUT} value={form.birth_city} onChange={set('birth_city')} />
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
                  <label className={LABEL}>Provincia / Estado</label>
                  <input className={INPUT} value={form.province} onChange={set('province')} />
                </div>
                <div>
                  <label className={LABEL}>Código postal</label>
                  <input className={INPUT} value={form.postal_code} onChange={set('postal_code')} />
                </div>
                <div>
                  <label className={LABEL}>País</label>
                  <input className={INPUT} value={form.country} onChange={set('country')} />
                </div>
              </div>
            </>
          )}

          {/* ── FAMILIA ── */}
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

          {/* ── ACADÉMICO ── */}
          {tab === 'academico' && (
            <>
              <div className={SECTION}>
                <div>
                  <label className={LABEL}>Etapa escolar</label>
                  <select className={INPUT} value={form.school_stage} onChange={set('school_stage')}>
                    <option value="elementary">Elementary (Primaria)</option>
                    <option value="middle_school">Middle School (Secundaria)</option>
                    <option value="high_school">High School (Bachillerato)</option>
                  </select>
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
                  <label className={LABEL}>Año académico</label>
                  <select className={INPUT} value={form.academic_year} onChange={set('academic_year')}>
                    {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
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
                  <label className={LABEL}>Último grado completado</label>
                  <input className={INPUT} placeholder="6.º Primaria" value={form.last_grade_completed} onChange={set('last_grade_completed')} />
                </div>
                <div>
                  <label className={LABEL}>Último colegio</label>
                  <input className={INPUT} value={form.last_school_name} onChange={set('last_school_name')} />
                </div>
                <div>
                  <label className={LABEL}>Currículo base</label>
                  <input className={INPUT} value={form.curriculum_base} onChange={set('curriculum_base')} />
                </div>
                <div>
                  <label className={LABEL}>Fecha de matrícula</label>
                  <input type="date" className={INPUT} value={form.enrollment_date} onChange={set('enrollment_date')} />
                </div>
                <div>
                  <label className={LABEL}>Fecha de inicio</label>
                  <input type="date" className={INPUT} value={form.start_date} onChange={set('start_date')} />
                </div>
                <div>
                  <label className={LABEL}>Fecha fin estimada</label>
                  <input type="date" className={INPUT} value={form.estimated_end_date} onChange={set('estimated_end_date')} />
                </div>
              </div>

              <hr className="border-slate-200" />
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Niveles diagnósticos por materia</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { field: 'diag_math',           label: 'Math' },
                  { field: 'diag_english',         label: 'English' },
                  { field: 'diag_word_building',   label: 'Word Building' },
                  { field: 'diag_science',         label: 'Science' },
                  { field: 'diag_social_studies',  label: 'Social Studies' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className={LABEL}>{label}</label>
                    <input className={INPUT} placeholder="Ej. PACE 37" value={form[field]} onChange={set(field)} />
                  </div>
                ))}
              </div>
              <div>
                <label className={LABEL}>Observaciones diagnósticas</label>
                <textarea rows={3} className={INPUT} placeholder="Fortalezas, vacíos, áreas de atención…" value={form.diagnostic_notes} onChange={set('diagnostic_notes')} />
              </div>
              <div>
                <label className={LABEL}>Interés vocacional</label>
                <input className={INPUT} placeholder="Área Financiera, Ingeniería, Artes…" value={form.vocational_interest} onChange={set('vocational_interest')} />
              </div>
              <div>
                <label className={LABEL}>Graduation Pathway / Ruta de graduación</label>
                <textarea rows={2} className={INPUT} placeholder="Plan de graduación, créditos esperados…" value={form.graduation_pathway_notes} onChange={set('graduation_pathway_notes')} />
              </div>
              <div>
                <label className={LABEL}>Observaciones para PEI</label>
                <textarea rows={2} className={INPUT} value={form.pei_observations} onChange={set('pei_observations')} />
              </div>

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
                  <div className="space-y-3">
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
                    <div>
                      <label className={LABEL}>Observaciones Dual Diploma / convalidación</label>
                      <textarea rows={2} className={INPUT} value={form.dual_diploma_observations} onChange={set('dual_diploma_observations')} />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── ADMIN / SALUD ── */}
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
                <div>
                  <label className={LABEL}>Estado de admisión</label>
                  <select className={INPUT} value={form.admission_status} onChange={set('admission_status')}>
                    <option value="prospect">Prospecto</option>
                    <option value="pre_enrolled">Pre-inscrito</option>
                    <option value="enrolled">Matriculado</option>
                    <option value="graduated">Graduado</option>
                    <option value="withdrawn">Retirado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Notas administrativas</label>
                <textarea rows={3} className={INPUT} value={form.admin_notes} onChange={set('admin_notes')} />
              </div>
              <div>
                <label className={LABEL}>Notas documentales (documentos recibidos / pendientes)</label>
                <textarea rows={3} className={INPUT} value={form.documentary_notes} onChange={set('documentary_notes')} />
              </div>
              <hr className="border-slate-200" />
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Salud y Necesidades Educativas</p>
              <div>
                <label className={LABEL}>Notas médicas</label>
                <textarea rows={3} className={INPUT} placeholder="Alergias, condiciones crónicas, medicamentos…" value={form.medical_notes} onChange={set('medical_notes')} />
              </div>
              <div>
                <label className={LABEL}>Necesidades Educativas Especiales (NEE)</label>
                <textarea rows={3} className={INPUT} placeholder="TDAH, dislexia, apoyos específicos requeridos…" value={form.special_educational_needs} onChange={set('special_educational_needs')} />
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
