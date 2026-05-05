import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { ACTIVE_SCHOOL_YEAR, QUARTERS } from '@/lib/academicUtils';
import PaceProjectionManager from './PaceProjectionManager';
import {
  Save, Loader2, X, ChevronRight, ChevronLeft,
  FileText, AlertCircle, CheckCircle, ClipboardList,
  BookOpen, Target, Users, MessageSquare, Send, Eye
} from 'lucide-react';

const INPUT = 'w-full p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm bg-white';
const TEXTAREA = INPUT + ' resize-none';
const LABEL = 'block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider';

const TABS = [
  { id: 'general',    label: 'General',       icon: FileText },
  { id: 'diagnosis',  label: 'Diagnóstico',   icon: ClipboardList },
  { id: 'strengths',  label: 'Fortalezas',    icon: Target },
  { id: 'objectives', label: 'Objetivos',     icon: BookOpen },
  { id: 'paces',      label: 'PACEs',         icon: ChevronRight },
  { id: 'supports',   label: 'Apoyos',        icon: Users },
  { id: 'notes',      label: 'Observaciones', icon: MessageSquare },
];

const STATUS_META = {
  draft:     { label: 'Borrador',    color: 'bg-slate-100 text-slate-700', next: 'in_review',  nextLabel: 'Enviar a revisión', icon: FileText },
  in_review: { label: 'En revisión', color: 'bg-amber-100 text-amber-800', next: 'approved',   nextLabel: 'Aprobar',          icon: Eye },
  approved:  { label: 'Aprobado',    color: 'bg-blue-100 text-blue-800',   next: 'published',  nextLabel: 'Publicar',         icon: CheckCircle },
  published: { label: 'Publicado',   color: 'bg-green-100 text-green-800', next: null,         nextLabel: null,               icon: Send },
};

const DEFAULT_FORM = {
  school_year:             ACTIVE_SCHOOL_YEAR,
  quarter:                 'Q1',
  issue_date:              new Date().toISOString().split('T')[0],
  student_code:            '',
  grade_level:             '',
  initial_diagnosis:       '',
  diagnostic_results:      '',
  strength_areas:          '',
  improvement_areas:       '',
  quarterly_objectives:    '',
  subject_plan:            '',
  required_adaptations:    '',
  follow_up_strategies:    '',
  coordinator_observations:'',
  coordinator_name:        '',
  status:                  'draft',
};

export default function PEIFormFull({ studentId, studentName, peiId: initialPeiId, onClose, canEdit = false }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab]   = useState('general');
  const [loading, setLoading]       = useState(!!initialPeiId);
  const [saving, setSaving]         = useState(false);
  const [advancing, setAdvancing]   = useState(false);
  const [peiId, setPeiId]           = useState(initialPeiId || null);
  const [form, setForm]             = useState(DEFAULT_FORM);

  const load = useCallback(async () => {
    if (!initialPeiId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('individualized_education_plans')
        .select('*')
        .eq('id', initialPeiId)
        .single();
      if (error) throw error;
      setForm(prev => ({ ...prev, ...Object.fromEntries(
        Object.entries(data).filter(([k, v]) => k in DEFAULT_FORM && v !== null && v !== undefined)
      )}));
      setPeiId(data.id);
    } catch (err) {
      toast({ title: 'Error', description: 'No se pudo cargar el PEI.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [initialPeiId]);

  useEffect(() => { load(); }, [load]);

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        student_id: studentId,
        updated_at: new Date().toISOString(),
      };
      if (peiId) {
        const { error } = await supabase
          .from('individualized_education_plans')
          .update(payload)
          .eq('id', peiId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('individualized_education_plans')
          .insert([payload])
          .select('id')
          .single();
        if (error) throw error;
        setPeiId(data.id);
      }
      toast({ title: 'PEI guardado', description: 'Los cambios han sido guardados.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'No se pudo guardar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async () => {
    if (!peiId) {
      toast({ title: 'Aviso', description: 'Guarda primero el PEI antes de avanzar el estado.', variant: 'destructive' });
      return;
    }
    const nextStatus = STATUS_META[form.status]?.next;
    if (!nextStatus) return;
    setAdvancing(true);
    try {
      const tsField = { in_review: 'reviewed_at', approved: 'approved_at', published: 'published_at' }[nextStatus];
      const patch = { status: nextStatus, updated_at: new Date().toISOString() };
      if (tsField) patch[tsField] = new Date().toISOString();
      const { error } = await supabase
        .from('individualized_education_plans')
        .update(patch)
        .eq('id', peiId);
      if (error) throw error;
      setForm(prev => ({ ...prev, status: nextStatus }));
      toast({ title: 'Estado actualizado', description: `El PEI ahora está en estado: ${STATUS_META[nextStatus].label}` });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'No se pudo actualizar el estado.', variant: 'destructive' });
    } finally {
      setAdvancing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  const status = STATUS_META[form.status] || STATUS_META.draft;
  const isReadOnly = !canEdit || form.status === 'published';

  return (
    <div className="flex flex-col h-full max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
        <div>
          <h2 className="font-black text-lg text-slate-800">Plan Educativo Individualizado</h2>
          <p className="text-sm text-slate-500">{studentName} · {form.school_year}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
            {status.label}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-white shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700 bg-blue-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Año Escolar</label>
                <select value={form.school_year} onChange={set('school_year')} disabled={isReadOnly} className={INPUT}>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Trimestre</label>
                <select value={form.quarter} onChange={set('quarter')} disabled={isReadOnly} className={INPUT}>
                  {QUARTERS.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                  <option value="Annual">Annual</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Fecha de Emisión</label>
                <input type="date" value={form.issue_date} onChange={set('issue_date')} disabled={isReadOnly} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Código de Estudiante</label>
                <input type="text" value={form.student_code} onChange={set('student_code')} disabled={isReadOnly} className={INPUT} placeholder="Código interno" />
              </div>
              <div>
                <label className={LABEL}>Nivel / Grado</label>
                <input type="text" value={form.grade_level} onChange={set('grade_level')} disabled={isReadOnly} className={INPUT} placeholder="9th Grade, 10th Grade…" />
              </div>
              <div>
                <label className={LABEL}>Nombre del Coordinador</label>
                <input type="text" value={form.coordinator_name} onChange={set('coordinator_name')} disabled={isReadOnly} className={INPUT} placeholder="Coordinador responsable" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'diagnosis' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Diagnóstico Inicial</label>
              <textarea rows={4} value={form.initial_diagnosis} onChange={set('initial_diagnosis')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Descripción del estado académico inicial del estudiante al inicio del trimestre..." />
            </div>
            <div>
              <label className={LABEL}>Resultados del Diagnóstico</label>
              <textarea rows={4} value={form.diagnostic_results} onChange={set('diagnostic_results')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Resultados de evaluaciones, pruebas de nivel, observaciones iniciales..." />
            </div>
          </div>
        )}

        {activeTab === 'strengths' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Áreas de Fortaleza</label>
              <textarea rows={5} value={form.strength_areas} onChange={set('strength_areas')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Materias, habilidades o disposiciones en las que el estudiante destaca..." />
            </div>
            <div>
              <label className={LABEL}>Áreas de Mejora</label>
              <textarea rows={5} value={form.improvement_areas} onChange={set('improvement_areas')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Áreas donde el estudiante necesita apoyo adicional o intervención..." />
            </div>
          </div>
        )}

        {activeTab === 'objectives' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Objetivos Trimestrales</label>
              <textarea rows={5} value={form.quarterly_objectives} onChange={set('quarterly_objectives')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Metas académicas y de desarrollo para este trimestre..." />
            </div>
            <div>
              <label className={LABEL}>Plan por Materia</label>
              <textarea rows={6} value={form.subject_plan} onChange={set('subject_plan')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Descripción del plan específico por materia: PACEs a completar, contenidos prioritarios, metodología..." />
            </div>
          </div>
        )}

        {activeTab === 'paces' && (
          <div>
            {peiId ? (
              <PaceProjectionManager
                peiId={peiId}
                studentId={studentId}
                schoolYear={form.school_year}
                canEdit={canEdit && !isReadOnly}
                tutorMode={false}
              />
            ) : (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-amber-800">Guarda el PEI primero para poder registrar proyecciones de PACEs.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'supports' && (
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Adaptaciones Requeridas</label>
              <textarea rows={5} value={form.required_adaptations} onChange={set('required_adaptations')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Adaptaciones curriculares, de evaluación o de entorno necesarias para el estudiante..." />
            </div>
            <div>
              <label className={LABEL}>Estrategias de Seguimiento</label>
              <textarea rows={5} value={form.follow_up_strategies} onChange={set('follow_up_strategies')} disabled={isReadOnly} className={TEXTAREA}
                placeholder="Frecuencia y método de seguimiento, responsables, indicadores de progreso..." />
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div>
            <label className={LABEL}>Observaciones del Coordinador</label>
            <textarea rows={8} value={form.coordinator_observations} onChange={set('coordinator_observations')} disabled={isReadOnly} className={TEXTAREA}
              placeholder="Observaciones generales, contexto familiar, acuerdos con tutores o padres, notas adicionales..." />
          </div>
        )}
      </div>

      {/* Footer */}
      {canEdit && (
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {form.status === 'published' && (
              <span className="flex items-center gap-1 text-green-700 font-bold">
                <CheckCircle className="w-4 h-4" /> Documento publicado — solo lectura
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar borrador
              </button>
            )}
            {status.next && !isReadOnly && (
              <button
                onClick={handleAdvanceStatus}
                disabled={advancing}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-colors"
              >
                {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {status.nextLabel}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
