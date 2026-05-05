import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { generateAnnualTranscriptPDF } from '@/lib/annualTranscriptPdf';

const NAVY = '#193D6D';

const GRADING = [
  { min: 98, letter: 'A*', color: 'text-emerald-700 font-black' },
  { min: 96, letter: 'A',  color: 'text-emerald-700 font-black' },
  { min: 92, letter: 'B',  color: 'text-blue-700 font-bold' },
  { min: 88, letter: 'C',  color: 'text-blue-600 font-bold' },
  { min: 84, letter: 'D',  color: 'text-amber-700 font-bold' },
  { min: 80, letter: 'E',  color: 'text-amber-600 font-bold' },
  { min: 0,  letter: 'F',  color: 'text-red-700 font-bold' },
];

function gradeInfo(val) {
  if (val === null || val === undefined) return { letter: '—', color: 'text-slate-400' };
  const n = Number(val);
  return GRADING.find(g => n >= g.min) || GRADING[GRADING.length - 1];
}

function fmt(val) {
  if (val === null || val === undefined) return '—';
  return Number(val).toFixed(2);
}

// HS grade levels
const HS_GRADES = ['9th Grade', '10th Grade', '11th Grade', '12th Grade',
  '9.º', '10.º', '11.º', '12.º', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

/**
 * Props:
 *  studentId, studentName
 *  onClose
 */
export default function AnnualTranscriptView({ studentId, studentName, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [student, setStudent] = useState(null);
  const [yearData, setYearData] = useState([]);
  const [overdueAlerts, setOverdueAlerts] = useState([]);
  const [settings, setSettings] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [studentRes, trRes, settingsRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase
        .from('transcript_records')
        .select('id, school_year, quarter, status, grade_level: grade_level')
        .eq('student_id', studentId)
        .in('quarter', ['Q1', 'Q2', 'Q3'])
        .order('school_year')
        .order('quarter'),
      supabase.from('institutional_settings').select('*').limit(1).single(),
    ]);

    if (studentRes.data) setStudent(studentRes.data);
    if (settingsRes.data) setSettings(settingsRes.data);

    if (trRes.data && trRes.data.length > 0) {
      // Load courses for all transcript records
      const trIds = trRes.data.map(r => r.id);
      const { data: coursesData } = await supabase
        .from('transcript_courses')
        .select('transcript_id, subject_name, final_grade, credits, subject_category, is_local_subject')
        .in('transcript_id', trIds);

      const courseMap = {};
      (coursesData || []).forEach(c => {
        if (!courseMap[c.transcript_id]) courseMap[c.transcript_id] = [];
        courseMap[c.transcript_id].push(c);
      });

      // Group by school_year
      const byYear = {};
      trRes.data.forEach(tr => {
        if (!byYear[tr.school_year]) byYear[tr.school_year] = { school_year: tr.school_year, records: [], grade_level: tr.grade_level };
        byYear[tr.school_year].records.push({
          id: tr.id,
          quarter: tr.quarter,
          status: tr.status,
          subjects: courseMap[tr.id] || [],
        });
      });

      setYearData(Object.values(byYear).sort((a, b) => a.school_year.localeCompare(b.school_year)));
    }

    // Check overdue PACEs using RPC function
    const { data: overdueData } = await supabase.rpc('get_overdue_paces', { p_student_id: studentId });
    setOverdueAlerts(overdueData || []);

    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const isHighSchool = HS_GRADES.some(g =>
        (student?.grade_level || '').includes(g.replace('th Grade','').replace('.º','').trim())
      );

      const yearsForPdf = yearData.map(yr => ({
        school_year: yr.school_year,
        grade_level: yr.grade_level,
        us_grade_level: student?.us_grade_level || yr.grade_level,
        records: yr.records.map(r => ({
          quarter: r.quarter,
          subjects: r.subjects,
        })),
      }));

      generateAnnualTranscriptPDF({
        student,
        years: yearsForPdf,
        settings,
        isHighSchool,
      });
    } catch (err) {
      toast({ title: 'Error al generar PDF', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(false);
    }
  };

  // Build subject matrix: subject → year → { Q1, Q2, Q3, avg }
  const buildMatrix = () => {
    const subjects = new Set();
    yearData.forEach(yr => yr.records.forEach(r => r.subjects.forEach(s => subjects.add(s.subject_name))));

    return Array.from(subjects).map(subj => {
      const yearGrades = yearData.map(yr => {
        const qGrades = {};
        yr.records.forEach(r => {
          const match = r.subjects.find(s => s.subject_name === subj);
          if (match && match.final_grade !== null && match.final_grade !== undefined) {
            qGrades[r.quarter] = Number(match.final_grade);
          }
        });
        const vals = Object.values(qGrades);
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return { qGrades, avg };
      });
      return { subject: subj, yearGrades };
    });
  };

  if (loading) return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-10">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
        <p className="mt-3 text-slate-600 font-medium text-center">Cargando transcript…</p>
      </div>
    </div>
  );

  const matrix = buildMatrix();
  const isHighSchool = HS_GRADES.some(g =>
    (student?.grade_level || '').includes(g.replace('th Grade','').replace('.º','').trim())
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200" style={{ background: NAVY }}>
          <div>
            <h2 className="text-xl font-black text-white">Transcript Oficial</h2>
            <p className="text-blue-200 text-sm mt-0.5 font-medium">{studentName}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-bold transition-all"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Descargar PDF
            </button>
            <button onClick={onClose} className="text-white/70 hover:text-white text-xl font-bold">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* PACE Overdue Alerts */}
          {overdueAlerts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-red-800 text-sm">
                  PACEs vencidos — más de 3 semanas sin entregar ({overdueAlerts.length})
                </h3>
              </div>
              <div className="space-y-2">
                {overdueAlerts.map(a => (
                  <div key={a.pace_id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-red-100">
                    <div>
                      <span className="font-bold text-slate-800 text-sm">{a.subject_name} #{a.pace_number}</span>
                      <span className="ml-2 text-xs text-slate-500">{a.quarter} · {a.school_year}</span>
                    </div>
                    <span className="text-xs font-black text-red-700 bg-red-100 px-2 py-1 rounded-lg">
                      {a.days_overdue} días de retraso
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student info card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Fecha de nacimiento', val: student?.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('es-ES') : '—' },
              { label: 'País', val: student?.country || '—' },
              { label: 'Nivel actual', val: student?.grade_level || '—' },
              { label: 'Modalidad', val: student?.modality || '—' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="font-bold text-slate-800 text-sm">{val}</p>
              </div>
            ))}
          </div>

          {/* Year × Subject grid */}
          {yearData.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="font-bold">No hay boletines publicados aún.</p>
              <p className="text-sm mt-1">Los boletines por trimestre se reflejan aquí automáticamente.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="text-slate-500 text-xs font-black uppercase tracking-wider bg-slate-50">
                    <th className="px-4 py-3 text-left sticky left-0 bg-slate-50 border-r border-slate-200 min-w-[160px]">Asignatura</th>
                    {yearData.map(yr => (
                      <th key={yr.school_year} className="px-3 py-3 text-center border-l border-slate-200" colSpan={3}>
                        <div className="text-slate-800 font-black">{yr.school_year}</div>
                        <div className="flex gap-1 justify-center mt-1">
                          {yr.records.map(r => (
                            <span
                              key={r.quarter}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${r.status === 'published' ? 'bg-green-100 text-green-700' : r.status === 'approved' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}
                            >
                              {r.quarter}
                            </span>
                          ))}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center border-l border-slate-200">Promedio</th>
                    {isHighSchool && <th className="px-3 py-3 text-center border-l border-slate-200">Créditos</th>}
                  </tr>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 border-b border-slate-200">
                    <th className="px-4 py-1 sticky left-0 bg-slate-50 border-r border-slate-200"></th>
                    {yearData.map(yr => (
                      <React.Fragment key={yr.school_year}>
                        <th className="px-2 py-1 text-center border-l border-slate-100">Q1</th>
                        <th className="px-2 py-1 text-center">Q2</th>
                        <th className="px-2 py-1 text-center">Q3</th>
                      </React.Fragment>
                    ))}
                    <th className="px-2 py-1 border-l border-slate-100"></th>
                    {isHighSchool && <th className="px-2 py-1 border-l border-slate-100"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrix.map(({ subject, yearGrades }) => {
                    const allVals = yearGrades.flatMap(yg => Object.values(yg.qGrades)).filter(v => v !== undefined);
                    const grandAvg = allVals.length ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null;
                    const info = gradeInfo(grandAvg);
                    return (
                      <tr key={subject} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-800 sticky left-0 bg-white border-r border-slate-200">{subject}</td>
                        {yearGrades.map((yg, i) => (
                          <React.Fragment key={i}>
                            {['Q1','Q2','Q3'].map(q => {
                              const gi = gradeInfo(yg.qGrades[q]);
                              return (
                                <td key={q} className="px-2 py-2.5 text-center border-l border-slate-50">
                                  <span className={`text-xs ${gi.color}`}>{fmt(yg.qGrades[q])}</span>
                                </td>
                              );
                            })}
                          </React.Fragment>
                        ))}
                        <td className="px-3 py-2.5 text-center border-l border-slate-200">
                          <span className={`text-sm ${info.color}`}>{fmt(grandAvg)}</span>
                          {grandAvg !== null && <span className="ml-1 text-[10px] text-slate-400">({info.letter})</span>}
                        </td>
                        {isHighSchool && (
                          <td className="px-3 py-2.5 text-center border-l border-slate-200 text-slate-600 text-sm font-bold">
                            {allVals.length ? (allVals.length * 0.5).toFixed(1) : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50 font-black text-sm border-t-2 border-blue-200">
                    <td className="px-4 py-3 text-slate-800 sticky left-0 bg-blue-50 border-r border-slate-200">PROMEDIO GENERAL</td>
                    {yearData.map((yr, i) => {
                      const allForYear = matrix.flatMap(m => {
                        const yg = m.yearGrades[i];
                        return yg ? Object.values(yg.qGrades) : [];
                      }).filter(v => v !== undefined);
                      const yearAvg = allForYear.length ? allForYear.reduce((a, b) => a + b, 0) / allForYear.length : null;
                      const gi = gradeInfo(yearAvg);
                      return (
                        <React.Fragment key={yr.school_year}>
                          <td className="px-2 py-3 text-center border-l border-slate-200" colSpan={3}>
                            <span className={gi.color}>{fmt(yearAvg)}</span>
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="px-3 py-3 text-center border-l border-slate-200">
                      {(() => {
                        const all = matrix.flatMap(m => m.yearGrades.flatMap(yg => Object.values(yg.qGrades))).filter(v => v !== undefined);
                        const g = gradeInfo(all.length ? all.reduce((a, b) => a + b, 0) / all.length : null);
                        return <span className={g.color}>{all.length ? fmt(all.reduce((a, b) => a + b, 0) / all.length) : '—'}</span>;
                      })()}
                    </td>
                    {isHighSchool && <td className="border-l border-slate-200"></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Grading scale */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3">Escala de calificaciones</p>
            <div className="flex flex-wrap gap-3">
              {[
                { range: '98–100', letter: 'A*', desc: 'Excellent' },
                { range: '96–97.9', letter: 'A', desc: 'Excellent' },
                { range: '92–95.9', letter: 'B', desc: 'Very Good' },
                { range: '88–91.9', letter: 'C', desc: 'Good' },
                { range: '84–87.9', letter: 'D', desc: 'Fair' },
                { range: '80–83.9', letter: 'E', desc: 'Satisfactory' },
              ].map(g => (
                <div key={g.letter} className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-center min-w-[80px]">
                  <p className="font-black text-blue-700">{g.letter}</p>
                  <p className="text-[10px] text-slate-500">{g.range}</p>
                  <p className="text-[9px] text-slate-400 font-medium">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
