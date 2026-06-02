/**
 * peiPdf.js
 * Genera el PDF institucional del PEI / IEP — bilingüe ES/EN.
 * Requiere: settings = await preloadImages(rawSettings) antes de llamar.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addInstitutionLogo,
  addInstitutionSeal,
  addInstitutionSignature,
  getDocumentFooter,
  getInstitutionFldoe,
  getInstitutionName,
  normalizeDocumentLanguage,
} from '@/lib/officialDocuments';

// ── Paleta ────────────────────────────────────────────────────────────────────
const NAVY  = [25, 61, 109];
const TEAL  = [32, 178, 170];
const LGRAY = [241, 245, 249];
const GRAY  = [100, 116, 139];
const WHITE = [255, 255, 255];
const BLACK = [30, 30, 30];

// ── Agrupación institucional (mismo mapa que PaceProjectionTable) ─────────────
const SUBJECT_GROUP_KEYWORDS = {
  'Core A.C.E.': ['math', 'english', 'word building', 'science', 'social studies', 'bible'],
  'Extensión Local': ['lengua', 'castellana', 'local history', 'local geography', 'geografía', 'spanish', 'extension local', 'extensión local'],
  'Life Skills': ['art', 'music', 'technology', 'physical education', 'life skills', 'p.e.', 'tecnología'],
};
function getSubjectGroup(subjectName) {
  const lower = (subjectName || '').toLowerCase();
  if (SUBJECT_GROUP_KEYWORDS['Core A.C.E.'].some(k => lower.includes(k))) return 'Core A.C.E.';
  if (SUBJECT_GROUP_KEYWORDS['Extensión Local'].some(k => lower.includes(k))) return 'Extensión Local / Local Extension';
  if (SUBJECT_GROUP_KEYWORDS['Life Skills'].some(k => lower.includes(k))) return 'Life Skills / Desarrollo Integral';
  return 'Core A.C.E.';
}

// ── Textos bilingues ──────────────────────────────────────────────────────────
const T = {
  es: {
    docTitle: 'PROGRAMA EDUCATIVO INDIVIDUALIZADO (PEI)',
    page:     'Pág.',
    // Cover labels
    student:  'Estudiante',     schoolYear: 'Año Académico',
    age:      'Edad',           dob:        'F. Nacimiento',
    entry:    'Ingreso a Chanak', lastGrade:  'Último Grado',
    modality: 'Modalidad',      curriculum: 'Currículo Base',
    issued:   'Fecha Emisión',  coordinator:'Coordinador',
    // Section titles
    s1: '1. Diagnóstico Inicial',
    s2: '2. Perfil Educativo y Fortalezas',
    s3: '3. Currículo A.C.E. y Diagnóstico de Colocación',
    s4: '4. Resultados Diagnósticos e Interpretación de Brechas',
    s5: '5. Plan de Estudios',
    s6: '6. Extensión Local Obligatoria',
    s7: '7. Life Skills / Desarrollo Integral',
    s8: '8. Ritmo, Carga Diaria y Metodología',
    s9: '9. Proyección Anual de Evaluaciones',
    s10:'10. Seguimiento y Recursos de Apoyo',
    s11:'11. Objetivos Trimestrales',
    s12:'12. Mensaje para la Familia',
    s13:'13. Conclusión Institucional',
    s14:'14. Firmas',
    // Table headers
    subject: 'Materia', q1: 'Q1 (Evals.)', q2: 'Q2 (Evals.)', q3: 'Q3 (Evals.)', niv1: 'Niv.1', niv2: 'Niv.2', avg: 'Prom.',
    // Field labels
    strengths: 'Áreas de Fortaleza:', weaknesses: 'Áreas de Mejora:',
    diagResults: 'Resultados por asignatura:', diagInterp: 'Interpretación y brechas:',
    dailyLoad: 'Carga diaria estimada:', resources: 'Recursos de apoyo:',
    adaptations: 'Adaptaciones:', observations: 'Observaciones del coordinador:',
    // Signature labels
    signLabel: 'Firma:', nameLabel: 'Nombre:', dateLabel: 'Fecha:',
    dirRole: 'Head of School / Dirección', parentRole: 'Padre / Madre / Tutor Legal',
    // Default texts
    aceDefault: 'El currículo A.C.E. (Accelerated Christian Education) es un sistema de autoaprendizaje basado en evaluaciones individuales (PACEs) de 12 lecciones cada una. El estudiante avanza a su propio ritmo bajo la supervisión de un tutor certificado. El diagnóstico inicial determina el nivel real de entrada.',
    diagDefault: 'La prueba diagnóstica ACE identifica el punto real de entrada del estudiante y las lagunas de aprendizaje que deben reforzarse antes de avanzar. El estudiante progresa por dominio del contenido, no por edad o curso escolar.',
    planDefault: 'El plan de estudios se organiza a partir del nivel real de entrada, las asignaturas base, la extensión local y las áreas de desarrollo integral.',
    localExtDefault: 'La Extensión Local incorpora contenidos requeridos por el contexto educativo nacional y autonómico: lengua, historia, geografía, cultura local y otros elementos que complementan el currículo internacional.',
    lifeSkillsDefault: 'Life Skills integra actividades de desarrollo personal, educación física, arte, música, tecnología, servicio, emprendimiento, educación emocional y otras experiencias formativas.',
    methodDefault: 'El modelo metodológico combina aprendizaje por dominio, Extensión Local y desarrollo integral: aprox. 60% dominio, 20% Extensión Local, 20% Life Skills. El estudiante avanzará progresivamente con seguimiento del tutor y revisión periódica de evidencias.',
    familyDefault: 'Estimada familia: este PEI ha sido elaborado para garantizar el mejor acompañamiento académico. Les invitamos a mantener comunicación constante con Chanak.',
    conclusionDefault: 'Este documento es emitido por Chanak International Academy, institución registrada ante el Florida Department of Education.',
    extLocalNote: 'Se reporta mediante tareas mensuales o evidencias asignadas por el plan académico.',
    lifeSkillsNote: 'Se reporta mediante proyectos, actividades o evidencias trimestrales de desarrollo integral.',
  },
  en: {
    docTitle: 'INDIVIDUALIZED EDUCATION PLAN (IEP)',
    page:     'Page',
    student:  'Student',        schoolYear: 'Academic Year',
    age:      'Age',            dob:        'Date of Birth',
    entry:    'Chanak Entry',   lastGrade:  'Last Grade Completed',
    modality: 'Modality',       curriculum: 'Base Curriculum',
    issued:   'Issue Date',     coordinator:'Coordinator',
    s1: '1. Initial Diagnostic',
    s2: '2. Educational Profile and Strengths',
    s3: '3. A.C.E. Curriculum and Diagnostic Placement',
    s4: '4. Diagnostic Results and Gap Interpretation',
    s5: '5. Study Plan',
    s6: '6. Local Extension Requirements',
    s7: '7. Life Skills / Holistic Development',
    s8: '8. Rhythm, Daily Workload and Methodology',
    s9: '9. Annual Projection of Evaluations',
    s10:'10. Follow-up and Support Resources',
    s11:'11. Quarterly Objectives',
    s12:'12. Family Message',
    s13:'13. Institutional Conclusion',
    s14:'14. Signatures',
    subject: 'Subject', q1: 'Q1 (Evals.)', q2: 'Q2 (Evals.)', q3: 'Q3 (Evals.)', niv1: 'Level.1', niv2: 'Level.2', avg: 'Avg.',
    strengths: 'Strength Areas:', weaknesses: 'Areas for Improvement:',
    diagResults: 'Results by subject:', diagInterp: 'Interpretation and gaps:',
    dailyLoad: 'Estimated daily workload:', resources: 'Support resources:',
    adaptations: 'Required adaptations:', observations: 'Coordinator observations:',
    signLabel: 'Signature:', nameLabel: 'Name:', dateLabel: 'Date:',
    dirRole: 'Head of School', parentRole: 'Parent / Legal Guardian',
    aceDefault: 'The A.C.E. (Accelerated Christian Education) curriculum is a self-instructional system based on individual evaluation booklets (PACEs) of 12 lessons each. Students progress at their own pace under the supervision of a certified tutor. The initial diagnostic determines the real entry level.',
    diagDefault: 'The A.C.E. diagnostic test identifies the student\'s real entry level and any learning gaps that must be addressed before advancing. Students progress based on mastery of content, not age or grade level.',
    planDefault: 'The study plan is organized from the student\'s real entry level, covering core subjects, local extension requirements and holistic development areas.',
    localExtDefault: 'Local Extension includes content required by national and regional educational regulations: language, history, geography, local culture and other elements needed to complement the international curriculum from the student\'s reality.',
    lifeSkillsDefault: 'Life Skills / Holistic Development includes personal development, physical education, arts, music, technology, service, entrepreneurship, emotional education and other formative experiences that strengthen growth, autonomy and character formation.',
    methodDefault: 'The IEP methodology combines mastery-based learning, Local Extension and holistic development: approximately 60% mastery-based learning, 20% Local Extension aligned with national and regional study requirements, and 20% Life Skills / Holistic Development. Students advance progressively with tutor support and periodic review of evidence and evaluations.',
    familyDefault: 'Dear family: this IEP has been developed to ensure the best possible academic support. We invite you to maintain open communication with Chanak.',
    conclusionDefault: 'This document is issued by Chanak International Academy, an institution registered with the Florida Department of Education.',
    extLocalNote: 'Reported through monthly tasks or evidence assigned by the academic plan.',
    lifeSkillsNote: 'Reported through quarterly projects, activities or holistic development evidence.',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function pageW(doc) { return doc.internal.pageSize.getWidth(); }
function pageH(doc) { return doc.internal.pageSize.getHeight(); }

/** Devuelve v si es un string no vacío; si no, devuelve def */
function orDefault(v, def) {
  if (v && typeof v === 'string' && v.trim()) return v.trim();
  return def || '';
}

function drawNavyHeader(doc, settings, lang) {
  const t = T[lang] || T.es;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW(doc), 32, 'F');
  addInstitutionLogo(doc, settings, 10, 4, 24, 24);
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(getInstitutionName(settings), pageW(doc) / 2, 13, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `FLDOE #${getInstitutionFldoe(settings)}  ·  ${settings?.website || 'chanakacademy.org'}`,
    pageW(doc) / 2, 20, { align: 'center' },
  );
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(t.docTitle, pageW(doc) / 2, 28, { align: 'center' });
}

function addPageNumbers(doc, settings, lang) {
  const t = T[lang] || T.es;
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`${t.page} ${i} / ${total}`, pageW(doc) - 14, pageH(doc) - 6, { align: 'right' });
    doc.text(getDocumentFooter(settings, lang), 14, pageH(doc) - 6);
  }
}

function sectionTitle(doc, y, title) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.setFillColor(...LGRAY);
  doc.rect(14, y, pageW(doc) - 28, 7, 'F');
  doc.text(title, 16, y + 5);
  doc.setTextColor(...BLACK);
  return y + 11;
}

function fieldLabel(doc, x, y, label) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(label, x, y);
}

function textBlock(doc, y, text, margin = 14) {
  if (!text || !text.trim()) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const lines = doc.splitTextToSize(text, pageW(doc) - margin * 2);
  doc.text(lines, margin, y);
  return y + lines.length * 4.5 + 2;
}

/** Verifica espacio y añade página nueva si hace falta (redibujando header). */
function checkPageBreak(doc, y, settings, lang, needed = 20) {
  if (y + needed > pageH(doc) - 20) {
    doc.addPage();
    drawNavyHeader(doc, settings, lang);
    return 40;
  }
  return y;
}

// ── Exportación principal ─────────────────────────────────────────────────────
/**
 * @param {object} opts
 *   pei      — fila de individualized_education_plans (o form de PEIFormFull)
 *   paces    — array de pei_pace_projections
 *   student  — { first_name, last_name, ... }
 *   settings — resultado de preloadImages(rawSettings)
 *   lang     — 'es' | 'en'
 */
export function generatePeiPDF({ pei, paces = [], student, settings, lang: requestedLang }) {
  const lang = normalizeDocumentLanguage(requestedLang || pei?.language || settings?.primary_language || 'es');
  const t = T[lang] || T.es;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pageW(doc);
  const M = 14;

  // ── PORTADA ───────────────────────────────────────────────────────────────
  drawNavyHeader(doc, settings, lang);
  let y = 40;

  // Recuadro de datos generales
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, W - M * 2, 52, 3, 3, 'S');
  y += 6;

  const col1 = M + 4;
  const col2 = W / 2 + 4;
  const rowH  = 9;
  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';

  const coverFields = [
    [t.student,  studentName,                          t.schoolYear, pei?.school_year || '—'],
    [t.age,      pei?.student_age || '—',              t.dob,        pei?.student_dob || '—'],
    [t.entry,    pei?.enrollment_date || '—',           t.lastGrade,  pei?.last_grade_completed || '—'],
    [t.modality, pei?.modality || 'Off-Campus',         t.curriculum, pei?.curriculum_base || 'A.C.E.'],
    [t.issued,   pei?.issue_date || '—',                t.coordinator,pei?.coordinator_name || '—'],
  ];

  coverFields.forEach(([l1, v1, l2, v2]) => {
    fieldLabel(doc, col1, y, l1 + ':');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...BLACK);
    doc.text(String(v1).substring(0, 45), col1, y + 4);
    fieldLabel(doc, col2, y, l2 + ':');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...BLACK);
    doc.text(String(v2).substring(0, 45), col2, y + 4);
    y += rowH;
  });
  y += 10;

  // Texto introductorio institucional
  const introText = orDefault(pei?.institutional_intro, '');
  if (introText) {
    doc.setFillColor(...LGRAY);
    const introLines = doc.splitTextToSize(introText, W - M * 2 - 8);
    doc.rect(M, y, W - M * 2, introLines.length * 4.5 + 8, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(introLines, M + 4, y + 5);
    doc.setTextColor(...BLACK);
    y += introLines.length * 4.5 + 12;
  }

  // ── S1: Diagnóstico inicial ───────────────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 30);
  y = sectionTitle(doc, y, t.s1);
  y = textBlock(doc, y, orDefault(pei?.initial_diagnosis, t.diagDefault), M);
  y += 4;

  // ── S2: Perfil educativo y fortalezas ─────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 30);
  y = sectionTitle(doc, y, t.s2);
  const strText = orDefault(pei?.strength_areas, '');
  if (strText) {
    fieldLabel(doc, M, y, t.strengths); y += 4;
    y = textBlock(doc, y, strText, M); y += 3;
  }
  const impText = orDefault(pei?.improvement_areas, '');
  if (impText) {
    fieldLabel(doc, M, y, t.weaknesses); y += 4;
    y = textBlock(doc, y, impText, M); y += 3;
  }
  if (!strText && !impText) { y = textBlock(doc, y, '—', M); y += 3; }

  // ── S3: Currículo A.C.E. y diagnóstico ───────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 25);
  y = sectionTitle(doc, y, t.s3);
  y = textBlock(doc, y, orDefault(pei?.ace_curriculum_description, t.aceDefault), M);
  y += 4;

  // ── S4: Resultados diagnósticos e interpretación ──────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 25);
  y = sectionTitle(doc, y, t.s4);
  const diagRes  = orDefault(pei?.diagnostic_results, '');
  const diagInterp = orDefault(pei?.diagnostic_interpretation, t.diagDefault);
  if (diagRes) {
    fieldLabel(doc, M, y, t.diagResults); y += 4;
    y = textBlock(doc, y, diagRes, M); y += 3;
  }
  fieldLabel(doc, M, y, t.diagInterp); y += 4;
  y = textBlock(doc, y, diagInterp, M); y += 4;

  // ── S5: Plan de estudios ──────────────────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 25);
  y = sectionTitle(doc, y, t.s5);
  y = textBlock(doc, y, orDefault(pei?.subject_plan, t.planDefault), M);
  y += 4;

  // ── S6: Extensión Local ───────────────────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 25);
  y = sectionTitle(doc, y, t.s6);
  y = textBlock(doc, y, orDefault(pei?.local_extension, t.localExtDefault), M);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...TEAL);
  doc.text(`▸ ${t.extLocalNote}`, M, y);
  doc.setTextColor(...BLACK);
  y += 7;

  // ── S7: Life Skills ───────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 25);
  y = sectionTitle(doc, y, t.s7);
  y = textBlock(doc, y, orDefault(pei?.life_skills, t.lifeSkillsDefault), M);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...TEAL);
  doc.text(`▸ ${t.lifeSkillsNote}`, M, y);
  doc.setTextColor(...BLACK);
  y += 7;

  // ── S8: Ritmo, carga y metodología ───────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 25);
  y = sectionTitle(doc, y, t.s8);
  y = textBlock(doc, y, orDefault(pei?.daily_rhythm_methodology, t.methodDefault), M);
  y += 3;
  const dailyLoad = orDefault(pei?.estimated_time_daily_load, '');
  if (dailyLoad) {
    fieldLabel(doc, M, y, t.dailyLoad); y += 4;
    y = textBlock(doc, y, dailyLoad, M); y += 3;
  }

  // ── S9: Proyección de evaluaciones (nueva página) ─────────────────────────
  if (paces.length > 0) {
    doc.addPage();
    drawNavyHeader(doc, settings, lang);
    y = 40;
    y = sectionTitle(doc, y, t.s9);
    y += 2;

    // Agrupar por bloque → materia
    const groupMap = {};
    paces.forEach(p => {
      const grp = getSubjectGroup(p.subject_name);
      if (!groupMap[grp]) groupMap[grp] = {};
      if (!groupMap[grp][p.subject_name]) groupMap[grp][p.subject_name] = { Q1: [], Q2: [], Q3: [], lev: [] };
      if (p.pace_type === 'leveling') groupMap[grp][p.subject_name].lev.push(p);
      else groupMap[grp][p.subject_name][p.quarter]?.push(p);
    });

    const getAvg = (rows) => {
      const g = rows.filter(p => p.grade_obtained != null);
      if (!g.length) return '—';
      return (g.reduce((s, p) => s + p.grade_obtained, 0) / g.length).toFixed(0) + '%';
    };

    const GROUP_ORDER = ['Core A.C.E.', 'Extensión Local / Local Extension', 'Life Skills / Desarrollo Integral'];
    GROUP_ORDER.forEach(grp => {
      if (!groupMap[grp]) return;
      const subjects = Object.keys(groupMap[grp]);
      if (!subjects.length) return;

      y = checkPageBreak(doc, y, settings, lang, 20);
      // Encabezado de bloque
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...WHITE);
      doc.setFillColor(...NAVY);
      doc.rect(M, y, W - M * 2, 6, 'F');
      doc.text(grp, M + 2, y + 4.5);
      doc.setTextColor(...BLACK);
      y += 8;

      const tableBody = subjects.map(subj => {
        const qs = groupMap[grp][subj];
        const allQ = [...qs.Q1, ...qs.Q2, ...qs.Q3];
        // Show all numbers, not just first 5
        return [
          subj,
          qs.Q1.map(p => p.pace_number).join(', ') || '—',
          qs.Q2.map(p => p.pace_number).join(', ') || '—',
          qs.Q3.map(p => p.pace_number).join(', ') || '—',
          qs.lev[0]?.pace_number || '—',
          qs.lev[1]?.pace_number || '—',
          getAvg(allQ),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [[t.subject, t.q1, t.q2, t.q3, t.niv1, t.niv2, t.avg]],
        body: tableBody,
        margin: { left: M, right: M },
        headStyles: { fillColor: TEAL, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: BLACK },
        alternateRowStyles: { fillColor: LGRAY },
        columnStyles: {
          0: { cellWidth: 48, fontStyle: 'bold' },
          1: { cellWidth: 30 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 },
          4: { cellWidth: 15 }, 5: { cellWidth: 15 }, 6: { cellWidth: 15 },
        },
        didDrawPage: () => { drawNavyHeader(doc, settings, lang); },
      });
      y = doc.lastAutoTable.finalY + 6;
    });
  }

  // ── S10: Seguimiento y recursos ───────────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 25);
  y = sectionTitle(doc, y, t.s10);
  const followUp = orDefault(pei?.follow_up_strategies, '');
  if (followUp) { y = textBlock(doc, y, followUp, M); y += 3; }
  const resources = orDefault(pei?.follow_up_resources, '');
  if (resources) {
    fieldLabel(doc, M, y, t.resources); y += 4;
    y = textBlock(doc, y, resources, M); y += 3;
  }
  const adaptations = orDefault(pei?.required_adaptations, '');
  if (adaptations) {
    fieldLabel(doc, M, y, t.adaptations); y += 4;
    y = textBlock(doc, y, adaptations, M); y += 3;
  }
  if (!followUp && !resources && !adaptations) { y = textBlock(doc, y, '—', M); y += 3; }

  // ── S11: Objetivos trimestrales ───────────────────────────────────────────
  const qObjectives = orDefault(pei?.quarterly_objectives, '');
  if (qObjectives) {
    y = checkPageBreak(doc, y, settings, lang, 25);
    y = sectionTitle(doc, y, t.s11);
    y = textBlock(doc, y, qObjectives, M); y += 4;
  }

  // ── S12: Mensaje familia ──────────────────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 30);
  y = sectionTitle(doc, y, t.s12);
  const familyMsg = orDefault(pei?.family_message, t.familyDefault);
  y = textBlock(doc, y, familyMsg, M); y += 4;

  // ── S13: Conclusión institucional ─────────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 25);
  y = sectionTitle(doc, y, t.s13);
  const conclusion = orDefault(pei?.institutional_conclusion, t.conclusionDefault);
  y = textBlock(doc, y, conclusion, M); y += 4;

  const observations = orDefault(pei?.coordinator_observations, '');
  if (observations) {
    fieldLabel(doc, M, y, t.observations); y += 4;
    y = textBlock(doc, y, observations, M); y += 4;
  }

  // ── S14: Firmas ───────────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, settings, lang, 58);
  y = sectionTitle(doc, y, t.s14);
  y += 4;

  const sigW = (W - M * 2 - 10) / 2;
  const sig1X = M;
  const sig2X = M + sigW + 10;

  // Caja director
  doc.setDrawColor(...NAVY); doc.setLineWidth(0.3);
  doc.rect(sig1X, y, sigW, 30, 'S');
  addInstitutionSignature(doc, settings, sig1X + 3, y + 1, 38, 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text(t.signLabel, sig1X + 3, y + 10);
  doc.line(sig1X + 15, y + 10, sig1X + sigW - 3, y + 10);
  doc.text(t.nameLabel, sig1X + 3, y + 18); doc.setTextColor(...BLACK);
  doc.text(orDefault(pei?.director_signature_name || settings?.director_name, '______________________'), sig1X + 18, y + 18);
  doc.setTextColor(...GRAY);
  doc.text(t.dateLabel, sig1X + 3, y + 24); doc.setTextColor(...BLACK);
  doc.text(orDefault(pei?.director_signature_date, '______________________'), sig1X + 18, y + 24);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...NAVY);
  doc.text(t.dirRole, sig1X + sigW / 2, y + 29, { align: 'center' });
  addInstitutionSeal(doc, settings, sig1X + 3, y + 31, 18, 18);

  // Caja padre
  doc.setTextColor(...BLACK); doc.setDrawColor(...NAVY);
  doc.rect(sig2X, y, sigW, 30, 'S');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text(t.signLabel, sig2X + 3, y + 10);
  doc.line(sig2X + 15, y + 10, sig2X + sigW - 3, y + 10);
  doc.text(t.nameLabel, sig2X + 3, y + 18); doc.setTextColor(...BLACK);
  doc.text(orDefault(pei?.parent_signature_name, '______________________'), sig2X + 18, y + 18);
  doc.setTextColor(...GRAY);
  doc.text(t.dateLabel, sig2X + 3, y + 24); doc.setTextColor(...BLACK);
  doc.text(orDefault(pei?.parent_signature_date, '______________________'), sig2X + 18, y + 24);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...NAVY);
  doc.text(t.parentRole, sig2X + sigW / 2, y + 29, { align: 'center' });

  // Paginación y guardado
  addPageNumbers(doc, settings, lang);
  const lastName = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const year     = (pei?.school_year || '').replace('-', '_');
  doc.save(`${lang === 'en' ? 'iep' : 'pei'}_${lastName}_${year}.pdf`);
}
