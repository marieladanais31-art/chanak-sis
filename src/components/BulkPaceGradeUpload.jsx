import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Upload, CheckCircle2, AlertCircle,
  BookOpen, Info, RefreshCw, Save, AlertTriangle, Check,
} from 'lucide-react';
import { ACTIVE_SCHOOL_YEAR } from '@/lib/academicUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const MASTERY_THRESHOLD = 80;
const CAN_APPROVE_DIRECTLY = ['super_admin', 'admin', 'coordinator'];
const QUARTERS = ['Q1', 'Q2', 'Q3'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mapea nombre de asignatura a academic_block canónico.
 * Debe coincidir con isValidReportArea() del boletín (normalizeBlock !== 'OTHER').
 */
function getAcademicBlockFromSubjectName(subjectName) {
  const lower = (subjectName || '').toLowerCase();
  if (['math','english','word building','science','social studies','bible'].some(k => lower.includes(k))) return 'Core A.C.E.';
  if (['lengua','castellana','local history','local geography','spanish','extensión','extension'].some(k => lower.includes(k))) return 'Extensión Local';
  if (['art','music','technology','physical education','life skills','p.e.','tecnología'].some(k => lower.includes(k))) return 'Life Skills';
  return 'Core A.C.E.';
}

function computeStatus(score) {
  const n = parseFloat(score);
  if (score === '' || score === null || score === undefined || isNaN(n)) return null;
  return n >= MASTERY_THRESHOLD ? 'approved' : 'revision_requested';
}

function paceStatusLabel(s) {
  if (!s) return null;
  const map = {
    evaluated:   { label: 'Evaluado',   cls: 'bg-emerald-100 text-emerald-700' },
    delivered:   { label: 'Entregado',  cls: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'En progreso',cls: 'bg-amber-100 text-amber-700' },
    pending:     { label: 'Pendiente',  cls: 'bg-slate-100 text-slate-500' },
    delayed:     { label: 'Atrasado',   cls: 'bg-red-100 text-red-600' },
  };
  return map[s] || { label: s, cls: 'bg-slate-100 text-slate-500' };
}

// ─── Component ────────────────────────────────────────────────────────────────
/**
 * BulkPaceGradeUpload
 *
 * Allows coordinator / tutor / admin to bulk-upload PACE grades
 * for a selected student + quarter + school year.
 *
 * Data source priority:
 *   1. pei_pace_projections (if PEI exists for that student/quarter/year)
 *   2. student_subjects fallback (manual pace_number input)
 *
 * Submission rules:
 *   - admin / coordinator → submission_status = 'approved' (direct approval)
 *   - tutor / mentor → submission_status = 'submitted' (pending review)
 *
 * Grade rule:
 *   - score >= 80 → mastery achieved (approved)
 *   - score < 80 → requires repeat (revision_requested)
 */
export default function BulkPaceGradeUpload({ preselectedStudentId }) {
  const { profile } = useAuth();
  const userRole   = profile?.role || '';
  const userHubId  = profile?.hub_id || null;
  const { toast }  = useToast();

  // ── Selection ─────────────────────────────────────────────────────────────
  const [students,        setStudents]        = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId || '');
  const [schoolYear,      setSchoolYear]      = useState(ACTIVE_SCHOOL_YEAR);
  const [selectedQuarter, setSelectedQuarter] = useState('Q1');

  // ── Grid ──────────────────────────────────────────────────────────────────
  const [rows,            setRows]            = useState([]);
  const [hasProjections,  setHasProjections]  = useState(true);
  const [loadingRows,     setLoadingRows]     = useState(false);
  const [loaded,          setLoaded]          = useState(false);

  // ── Save ──────────────────────────────────────────────────────────────────
  const [saving,      setSaving]      = useState(false);
  const [saveResult,  setSaveResult]  = useState(null);

  // ── Load students ─────────────────────────────────────────────────────────
  useEffect(() => { loadStudents(); }, [userRole, userHubId]);

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      let query = supabase
        .from('students')
        .select('id, first_name, last_name, hub_id, tutor_id')
        .order('first_name', { ascending: true });

      if (userRole === 'coordinator' && userHubId) {
        query = query.eq('hub_id', userHubId);
      } else if (['tutor', 'mentor'].includes(userRole) && authUser?.id) {
        query = query.eq('tutor_id', authUser.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      console.error('[BulkPaceGradeUpload] Error loading students:', err);
      toast({ title: 'Error', description: 'No se pudieron cargar estudiantes.', variant: 'destructive' });
    } finally {
      setLoadingStudents(false);
    }
  };

  // ── Load PACE rows ─────────────────────────────────────────────────────────
  const loadRows = useCallback(async () => {
    if (!selectedStudentId) return;
    setLoadingRows(true);
    setLoaded(false);
    setSaveResult(null);
    setRows([]);

    try {
      // 1. Try PEI projections
      const { data: projections, error: projErr } = await supabase
        .from('pei_pace_projections')
        .select('id, subject_name, pace_number, quarter, school_year, student_subject_id, grade_obtained, status, pace_type')
        .eq('student_id', selectedStudentId)
        .eq('school_year', schoolYear)
        .eq('quarter', selectedQuarter)
        .not('status', 'in', '("cancelled")')
        .order('subject_name', { ascending: true })
        .order('pace_number',  { ascending: true });

      if (projErr) throw projErr;

      let baseRows = [];

      if (projections && projections.length > 0) {
        setHasProjections(true);
        baseRows = projections.map(p => ({
          key:                `${p.subject_name}__${p.pace_number}`,
          subject_name:       p.subject_name,
          pace_number:        p.pace_number,
          student_subject_id: p.student_subject_id,
          projection_id:      p.id,
          existing_entry_id:  null,
          existing_score:     p.grade_obtained,
          existing_status:    null,
          pace_status:        p.status,
          score:              p.grade_obtained != null ? String(p.grade_obtained) : '',
          comment:            '',
          dirty:              false,
        }));
      } else {
        // 2. Fallback: student_subjects del trimestre actual
        setHasProjections(false);
        let { data: subjects, error: subjErr } = await supabase
          .from('student_subjects')
          .select('id, subject_name, quarter, school_year, subject_order')
          .eq('student_id', selectedStudentId)
          .eq('school_year', schoolYear)
          .eq('quarter', selectedQuarter)
          .order('subject_order', { ascending: true });

        if (subjErr) throw subjErr;

        // ── Si este trimestre no tiene student_subjects pero Q1 sí existe,
        //    copiar las asignaturas del trimestre anterior para este trimestre.
        if (!subjects || subjects.length === 0) {
          const prevQuarter = selectedQuarter === 'Q2' ? 'Q1' : selectedQuarter === 'Q3' ? 'Q2' : null;
          if (prevQuarter) {
            const { data: prevSubjects } = await supabase
              .from('student_subjects')
              .select('subject_name, academic_block, subject_order')
              .eq('student_id', selectedStudentId)
              .eq('school_year', schoolYear)
              .eq('quarter', prevQuarter)
              .order('subject_order', { ascending: true });

            if (prevSubjects && prevSubjects.length > 0) {
              // Auto-crear student_subjects para este trimestre
              const toInsert = prevSubjects.map(ps => ({
                student_id:             selectedStudentId,
                subject_name:           ps.subject_name,
                academic_block:         ps.academic_block || getAcademicBlockFromSubjectName(ps.subject_name),
                quarter:                selectedQuarter,
                school_year:            schoolYear,
                subject_order:          ps.subject_order,
                grade_submission_status: 'draft',
                submitted_at:           new Date().toISOString(),
              }));

              const { data: created, error: createErr } = await supabase
                .from('student_subjects')
                .insert(toInsert)
                .select('id, subject_name, quarter, school_year, subject_order');

              if (!createErr && created) {
                subjects = created;
                toast({ title: `Materias de ${selectedQuarter} creadas`, description: `Se copiaron ${created.length} materias desde ${prevQuarter}.` });
              } else if (createErr) {
                // Puede que ya existan por una inserción concurrente — reintentar la lectura
                const { data: retry } = await supabase
                  .from('student_subjects')
                  .select('id, subject_name, quarter, school_year, subject_order')
                  .eq('student_id', selectedStudentId)
                  .eq('school_year', schoolYear)
                  .eq('quarter', selectedQuarter)
                  .order('subject_order', { ascending: true });
                subjects = retry || [];
              }
            }
          }
        }

        baseRows = (subjects || []).map(s => ({
          key:                `${s.subject_name}__1`,
          subject_name:       s.subject_name,
          pace_number:        1,
          student_subject_id: s.id,
          projection_id:      null,
          existing_entry_id:  null,
          existing_score:     null,
          existing_status:    null,
          pace_status:        null,
          score:              '',
          comment:            '',
          dirty:              false,
        }));
      }

      // 3. Cross-reference existing grade_entries
      if (baseRows.length > 0) {
        const subjectIds = [...new Set(baseRows.map(r => r.student_subject_id).filter(Boolean))];
        if (subjectIds.length > 0) {
          const { data: entries, error: entErr } = await supabase
            .from('student_grade_entries')
            .select('id, student_subject_id, assessment_name, score, submission_status')
            .in('student_subject_id', subjectIds)
            .eq('quarter', selectedQuarter)
            .eq('school_year', schoolYear);

          if (entErr) throw entErr;

          const entryMap = {};
          (entries || []).forEach(e => {
            entryMap[`${e.student_subject_id}__${e.assessment_name}`] = e;
          });

          baseRows = baseRows.map(r => {
            const assessmentName = `PACE ${r.pace_number}`;
            const existing = entryMap[`${r.student_subject_id}__${assessmentName}`];
            if (existing) {
              return {
                ...r,
                existing_entry_id: existing.id,
                existing_score:    existing.score,
                existing_status:   existing.submission_status,
                // Pre-fill score only if not yet filled from projection
                score: r.score !== '' ? r.score : String(existing.score ?? ''),
              };
            }
            return r;
          });
        }
      }

      setRows(baseRows);
      setLoaded(true);
    } catch (err) {
      console.error('[BulkPaceGradeUpload] Error loading rows:', err);
      toast({ title: 'Error', description: err.message || 'No se pudieron cargar los PACEs.', variant: 'destructive' });
    } finally {
      setLoadingRows(false);
    }
  }, [selectedStudentId, schoolYear, selectedQuarter]);

  // ── Update a single row field ──────────────────────────────────────────────
  const updateRow = (key, field, value) => {
    setRows(prev =>
      prev.map(r => r.key === key ? { ...r, [field]: value, dirty: true } : r)
    );
  };

  // ── Save all filled rows ───────────────────────────────────────────────────
  const handleSave = async () => {
    const filledRows = rows.filter(r => r.score !== '' && r.score !== null && r.score !== undefined);

    if (filledRows.length === 0) {
      toast({ title: 'Sin datos', description: 'Ingresa al menos una calificación antes de guardar.', variant: 'destructive' });
      return;
    }

    // Validate scores
    for (const r of filledRows) {
      const n = parseFloat(r.score);
      if (isNaN(n) || n < 0 || n > 100) {
        toast({
          title: 'Error de validación',
          description: `${r.subject_name} · PACE ${r.pace_number}: la calificación debe ser entre 0 y 100.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setSaving(true);
    setSaveResult(null);

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const isApprover = CAN_APPROVE_DIRECTLY.includes(userRole);
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    let saved = 0, skipped = 0;
    const errors = [];

    for (const r of rows) {
      const scoreRaw = r.score?.toString?.()?.trim?.() ?? '';

      // Skip empty
      if (scoreRaw === '') { skipped++; continue; }

      const scoreNum = parseFloat(scoreRaw);
      if (isNaN(scoreNum)) { skipped++; continue; }

      // Skip if score unchanged AND already approved
      if (
        r.existing_entry_id &&
        r.existing_status === 'approved' &&
        parseFloat(r.existing_score) === scoreNum &&
        !r.dirty
      ) {
        skipped++;
        continue;
      }

      const assessmentName = `PACE ${r.pace_number}`;
      const reviewComment = r.comment?.trim()
        ? r.comment.trim()
        : isApprover
          ? 'Carga administrativa validada por coordinador — sin evidencia adjunta.'
          : 'Registrado por tutor — pendiente revisión coordinador.';

      // Resolve student_subject_id
      let studentSubjectId = r.student_subject_id;
      if (!studentSubjectId) {
        const { data: ss } = await supabase
          .from('student_subjects')
          .select('id')
          .eq('student_id', selectedStudentId)
          .eq('subject_name', r.subject_name)
          .eq('quarter', selectedQuarter)
          .eq('school_year', schoolYear)
          .maybeSingle();
        studentSubjectId = ss?.id || null;
      }

      if (!studentSubjectId) {
        errors.push(`${r.subject_name} · PACE ${r.pace_number}: no se encontró la materia en el sistema.`);
        continue;
      }

      // Build payload
      const payload = {
        student_id:         selectedStudentId,
        student_subject_id: studentSubjectId,
        quarter:            selectedQuarter,
        school_year:        schoolYear,
        assessment_name:    assessmentName,
        score:              scoreNum,
        date_recorded:      today,
        entered_by:         authUser?.id || null,
        entered_by_role:    userRole,
        submission_status:  isApprover ? 'approved' : 'submitted',
        review_comment:     reviewComment,
      };

      if (isApprover) {
        payload.approved_by  = authUser?.id || null;
        payload.approved_at  = now;
        payload.reviewed_by  = authUser?.id || null;
        payload.reviewed_at  = now;
      } else {
        payload.submitted_by  = authUser?.id || null;
        payload.submitted_at  = now;
      }

      try {
        if (r.existing_entry_id) {
          // UPDATE existing entry
          const { error } = await supabase
            .from('student_grade_entries')
            .update(payload)
            .eq('id', r.existing_entry_id);
          if (error) throw error;
        } else {
          // Find max entry_order for this subject
          const { data: maxRow } = await supabase
            .from('student_grade_entries')
            .select('entry_order')
            .eq('student_subject_id', studentSubjectId)
            .eq('quarter', selectedQuarter)
            .eq('school_year', schoolYear)
            .order('entry_order', { ascending: false })
            .limit(1)
            .maybeSingle();

          payload.entry_order = (maxRow?.entry_order ?? 0) + 1;

          const { error } = await supabase
            .from('student_grade_entries')
            .insert([payload]);
          if (error) throw error;
        }

        // Update pei_pace_projections if linked
        if (r.projection_id) {
          const projUpdate = {
            grade_obtained: scoreNum,
            status:         'evaluated',
          };
          if (['coordinator', 'admin', 'super_admin'].includes(userRole)) {
            projUpdate.coordinator_notes = reviewComment;
          } else {
            projUpdate.tutor_notes = reviewComment;
          }
          await supabase
            .from('pei_pace_projections')
            .update(projUpdate)
            .eq('id', r.projection_id);
        }

        saved++;
      } catch (err) {
        console.error('[BulkPaceGradeUpload] Error saving row:', r.key, err);
        errors.push(`${r.subject_name} · PACE ${r.pace_number}: ${err.message}`);
      }
    }

    setSaving(false);
    setSaveResult({ saved, skipped, errors });

    if (saved > 0) {
      toast({
        title: `${saved} nota${saved !== 1 ? 's' : ''} guardada${saved !== 1 ? 's' : ''}`,
        description: errors.length > 0
          ? `${errors.length} error(es). Revisa los detalles.`
          : 'Todas las notas se guardaron correctamente.',
      });
      await loadRows();
    } else if (errors.length > 0) {
      toast({ title: 'Errores al guardar', description: `${errors.length} error(es). Revisa los detalles.`, variant: 'destructive' });
    } else {
      toast({ title: 'Sin cambios', description: 'No se detectaron notas nuevas o modificadas.', variant: 'destructive' });
    }
  };

  // ── Derived counts ────────────────────────────────────────────────────────
  const filledCount   = rows.filter(r => r.score !== '').length;
  const approvedCount = rows.filter(r => { const n = parseFloat(r.score); return !isNaN(n) && n >= MASTERY_THRESHOLD; }).length;
  const belowCount    = rows.filter(r => { const n = parseFloat(r.score); return !isNaN(n) && n < MASTERY_THRESHOLD; }).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Selection panel ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#193D6D]/10 flex items-center justify-center shrink-0">
            <Upload className="w-5 h-5 text-[#193D6D]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800">Carga Masiva de PACEs</h2>
            <p className="text-sm text-slate-500">
              Registra las calificaciones de los PACEs proyectados del trimestre de forma rápida.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Estudiante */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Estudiante <span className="text-red-500">*</span>
            </label>
            {loadingStudents ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
              </div>
            ) : (
              <select
                value={selectedStudentId}
                onChange={e => {
                  setSelectedStudentId(e.target.value);
                  setLoaded(false);
                  setSaveResult(null);
                  setRows([]);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#193D6D]/30 focus:border-[#193D6D]"
              >
                <option value="">— Seleccionar estudiante —</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Año escolar */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Año Escolar
            </label>
            <input
              type="text"
              value={schoolYear}
              onChange={e => { setSchoolYear(e.target.value); setLoaded(false); setRows([]); }}
              placeholder="2025-2026"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#193D6D]/30 focus:border-[#193D6D]"
            />
          </div>

          {/* Trimestre */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Trimestre
            </label>
            <select
              value={selectedQuarter}
              onChange={e => { setSelectedQuarter(e.target.value); setLoaded(false); setRows([]); }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#193D6D]/30 focus:border-[#193D6D]"
            >
              {QUARTERS.map(q => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Load button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={loadRows}
            disabled={!selectedStudentId || loadingRows}
            className="flex items-center gap-2 px-5 py-2 bg-[#193D6D] hover:bg-[#122e54] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-40"
          >
            {loadingRows
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <BookOpen className="w-4 h-4" />}
            Cargar PACEs proyectados
          </button>
          {loaded && (
            <button
              onClick={loadRows}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm transition-colors"
              title="Recargar datos"
            >
              <RefreshCw className="w-4 h-4" />
              Recargar
            </button>
          )}
        </div>
      </div>

      {/* ── Source banner ── */}
      {loaded && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${
          hasProjections
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {hasProjections
              ? <>Fuente: <strong>PEI — pei_pace_projections</strong>. Mostrando <strong>{rows.length}</strong> PACEs proyectados para <strong>{selectedQuarter}</strong> · <strong>{schoolYear}</strong>.</>
              : <>No hay proyección PEI para este trimestre. Fuente: <strong>student_subjects</strong>. Ingresa el número de PACE manualmente si corresponde.</>
            }
          </span>
        </div>
      )}

      {/* ── Role notice (tutor) ── */}
      {!CAN_APPROVE_DIRECTLY.includes(userRole) && (
        <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Como <strong>{userRole}</strong>, tus notas quedarán en estado{' '}
            <strong>En revisión</strong> hasta que un coordinador o admin las apruebe.
          </span>
        </div>
      )}

      {/* ── Empty state ── */}
      {loaded && rows.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="font-black text-slate-700 text-base">
            Sin evaluaciones proyectadas para {selectedQuarter} · {schoolYear}
          </p>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Este estudiante no tiene evaluaciones proyectadas ni asignaturas registradas
            para el <strong>{selectedQuarter}</strong>. Posibles causas:
          </p>
          <ul className="text-xs text-slate-500 mt-3 text-left inline-block space-y-1">
            <li>• El PEI no tiene proyecciones para este trimestre. Ve a <strong>Gestión de PEI → Evaluaciones</strong> y usa "Autoproyectar".</li>
            <li>• Las asignaturas (student_subjects) no están configuradas para este trimestre.</li>
            <li>• El trimestre anterior (Q1 si estás en Q2) no tiene materias registradas aún.</li>
          </ul>
          <p className="text-xs text-blue-600 font-bold mt-4">
            Si ya cargaste evaluaciones en Q1, recarga Q2 — el sistema intentará copiar las materias automáticamente.
          </p>
        </div>
      )}

      {/* ── Grade table ── */}
      {loaded && rows.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* Table header */}
          <div className="bg-[#193D6D] text-white px-4 py-3 grid grid-cols-12 gap-2 text-[11px] font-black uppercase tracking-wider">
            <div className="col-span-3">Materia</div>
            <div className="col-span-1 text-center">PACE</div>
            <div className="col-span-2 text-center">Nota actual</div>
            <div className="col-span-2 text-center">Nueva nota</div>
            <div className="col-span-2 text-center">Estado</div>
            <div className="col-span-2">Comentario</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {rows.map((row, idx) => {
              const scoreN    = parseFloat(row.score);
              const hasScore  = row.score !== '' && !isNaN(scoreN);
              const isMastery = hasScore && scoreN >= MASTERY_THRESHOLD;
              const paceSt    = paceStatusLabel(row.pace_status);

              return (
                <div
                  key={row.key}
                  className={`px-4 py-3 grid grid-cols-12 gap-2 items-center text-sm transition-colors hover:bg-slate-50/80 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  }`}
                >
                  {/* Materia */}
                  <div className="col-span-3">
                    <p className="font-semibold text-slate-800 text-sm leading-tight truncate">
                      {row.subject_name}
                    </p>
                    {paceSt && (
                      <span className={`mt-0.5 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${paceSt.cls}`}>
                        {paceSt.label}
                      </span>
                    )}
                  </div>

                  {/* PACE # */}
                  <div className="col-span-1 text-center">
                    {hasProjections ? (
                      <span className="font-black text-[#193D6D] text-sm">{row.pace_number}</span>
                    ) : (
                      <input
                        type="number" min="1" max="20"
                        value={row.pace_number}
                        onChange={e => updateRow(row.key, 'pace_number', parseInt(e.target.value) || 1)}
                        className="w-14 text-center px-2 py-1 border border-slate-300 rounded-md text-sm font-bold text-[#193D6D] focus:outline-none focus:ring-1 focus:ring-[#193D6D]/30"
                      />
                    )}
                  </div>

                  {/* Existing score */}
                  <div className="col-span-2 text-center">
                    {row.existing_entry_id ? (
                      <div>
                        <span className={`font-bold text-sm ${
                          parseFloat(row.existing_score) >= MASTERY_THRESHOLD
                            ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {row.existing_score} / 100
                        </span>
                        {row.existing_status === 'approved' && (
                          <div className="text-[10px] text-emerald-600 font-bold">aprobada</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">sin nota</span>
                    )}
                  </div>

                  {/* New score input */}
                  <div className="col-span-2">
                    <input
                      type="number" min="0" max="100" step="1"
                      value={row.score}
                      onChange={e => updateRow(row.key, 'score', e.target.value)}
                      placeholder="0–100"
                      className={`w-full px-2 py-1.5 border rounded-md text-sm font-bold text-center focus:outline-none focus:ring-2 transition-colors ${
                        hasScore
                          ? isMastery
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 focus:ring-emerald-200'
                            : 'border-amber-300 bg-amber-50 text-amber-700 focus:ring-amber-200'
                          : 'border-slate-300 bg-white text-[#193D6D] focus:ring-[#193D6D]/20 focus:border-[#193D6D]'
                      }`}
                    />
                  </div>

                  {/* Status badge */}
                  <div className="col-span-2 text-center">
                    {hasScore ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                        isMastery
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {isMastery
                          ? <><Check className="w-3 h-3" /> Dominio</>
                          : <><AlertTriangle className="w-3 h-3" /> Repetición</>
                        }
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>

                  {/* Comment */}
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={row.comment}
                      onChange={e => updateRow(row.key, 'comment', e.target.value)}
                      placeholder="Observación…"
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-xs text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-[#193D6D]/20 focus:border-[#193D6D]"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Summary & save bar ── */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-slate-600">
                <strong className="text-slate-800">{filledCount}</strong>/{rows.length} notas ingresadas
              </span>
              {approvedCount > 0 && (
                <span className="flex items-center gap-1 text-emerald-700 font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {approvedCount} en dominio (≥ {MASTERY_THRESHOLD})
                </span>
              )}
              {belowCount > 0 && (
                <span className="flex items-center gap-1 text-amber-700 font-bold text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {belowCount} requieren repetición
                </span>
              )}
              <span className="text-xs text-slate-400 hidden sm:inline">
                · Mínimo de dominio: {MASTERY_THRESHOLD}/100
              </span>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#193D6D] hover:bg-[#122e54] text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-40 shadow-sm"
            >
              {saving
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Save className="w-4 h-4" />}
              {saving
                ? 'Guardando…'
                : `Guardar ${filledCount > 0 ? filledCount + ' nota' + (filledCount !== 1 ? 's' : '') : 'notas'}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Save result panel ── */}
      {saveResult && (
        <div className={`p-4 rounded-xl border ${
          saveResult.errors.length === 0
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {saveResult.errors.length === 0
              ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              : <AlertCircle className="w-5 h-5 text-amber-600" />
            }
            <p className="font-bold text-sm text-slate-800">
              {saveResult.saved} nota{saveResult.saved !== 1 ? 's' : ''} guardada{saveResult.saved !== 1 ? 's' : ''}
              {saveResult.skipped > 0 && ` · ${saveResult.skipped} sin cambios`}
              {saveResult.errors.length > 0 && ` · ${saveResult.errors.length} error(es)`}
            </p>
          </div>

          {saveResult.errors.length > 0 && (
            <ul className="text-xs text-red-700 space-y-0.5 mt-2 pl-1">
              {saveResult.errors.map((e, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-slate-500 mt-2">
            {CAN_APPROVE_DIRECTLY.includes(userRole)
              ? '✓ Notas guardadas con estado Aprobado — alimentarán boletines directamente.'
              : '⏳ Notas guardadas como En revisión — pendientes de aprobación por coordinador o admin.'}
          </p>
        </div>
      )}
    </div>
  );
}
