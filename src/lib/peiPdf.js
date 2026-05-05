/**
 * peiPdf.js
 * Genera el PDF institucional del Plan Educativo Individualizado (PEI).
 * Usa jsPDF + jspdf-autotable (ya instalados).
 *
 * PENDIENTE EDGE FUNCTION: firma digital criptográfica del Director.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Paleta institucional ──────────────────────────────────────────────────────
const NAVY   = [25, 61, 109];
const TEAL   = [32, 178, 170];
const LGRAY  = [241, 245, 249];
const GRAY   = [100, 116, 139];
const WHITE  = [255, 255, 255];
const BLACK  = [30, 30, 30];

const FONT_BOLD   = 'helvetica';
const FONT_NORMAL = 'helvetica';

// ── Helpers ───────────────────────────────────────────────────────────────────
function pageW(doc) { return doc.internal.pageSize.getWidth(); }
function pageH(doc) { return doc.internal.pageSize.getHeight(); }

function drawNavyHeader(doc, settings) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW(doc), 32, 'F');

  const logo = settings?.logo_url;
  if (logo) {
    try { doc.addImage(logo, 'PNG', 10, 4, 24, 24); } catch (_) {}
  }

  doc.setTextColor(...WHITE);
  doc.setFont(FONT_BOLD, 'bold');
  doc.setFontSize(14);
  doc.text('CHANAK INTERNATIONAL ACADEMY', pageW(doc) / 2, 13, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont(FONT_NORMAL, 'normal');
  doc.text(
    `FLDOE #${settings?.fldoe_registration || '134620'}  ·  ${settings?.website || 'www.chanakacademy.org'}`,
    pageW(doc) / 2, 20, { align: 'center' }
  );
  doc.setFontSize(10);
  doc.setFont(FONT_BOLD, 'bold');
  doc.text('PROGRAMA EDUCATIVO INDIVIDUALIZADO (PEI)', pageW(doc) / 2, 28, { align: 'center' });
  doc.setTextColor(...BLACK);
}

function addPageNumbers(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Pág. ${i} / ${total}`, pageW(doc) - 14, pageH(doc) - 6, { align: 'right' });
    doc.setTextColor(...NAVY);
    doc.setFontSize(7);
    doc.text('Chanak International Academy · Documento Confidencial', 14, pageH(doc) - 6);
  }
}

function sectionTitle(doc, y, title) {
  doc.setFillColor(...TEAL);
  doc.rect(14, y, pageW(doc) - 28, 7, 'F');
  doc.setFont(FONT_BOLD, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text(title.toUpperCase(), 17, y + 5);
  doc.setTextColor(...BLACK);
  return y + 11;
}

function fieldLabel(doc, x, y, label) {
  doc.setFont(FONT_BOLD, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(label, x, y);
  doc.setTextColor(...BLACK);
}

function fieldValue(doc, x, y, value, maxW) {
  doc.setFont(FONT_NORMAL, 'normal');
  doc.setFontSize(9);
  if (maxW) {
    const lines = doc.splitTextToSize(value || '—', maxW);
    doc.text(lines, x, y);
    return lines.length * 4.5;
  }
  doc.text(value || '—', x, y);
  return 5;
}

function textBlock(doc, y, text, margin = 14) {
  if (!text) return y;
  doc.setFont(FONT_NORMAL, 'normal');
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, pageW(doc) - margin * 2);
  doc.text(lines, margin, y);
  return y + lines.length * 4.5 + 2;
}

function checkPageBreak(doc, y, needed = 20) {
  if (y + needed > pageH(doc) - 20) {
    doc.addPage();
    drawNavyHeader(doc, null);
    return 40;
  }
  return y;
}

// ── Exportación principal ─────────────────────────────────────────────────────

/**
 * @param {object} opts
 *   pei      — fila de individualized_education_plans
 *   paces    — array de pei_pace_projections
 *   student  — { first_name, last_name, ... }
 *   settings — fila de institutional_settings
 */
export function generatePeiPDF({ pei, paces = [], student, settings }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pageW(doc);
  const M = 14;

  // ── PORTADA ──────────────────────────────────────────────────────────────────
  drawNavyHeader(doc, settings);
  let y = 40;

  // Recuadro institucional de portada
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, W - M * 2, 60, 3, 3, 'S');
  y += 6;

  const col1 = M + 4;
  const col2 = W / 2 + 4;
  const rowH  = 9;

  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';

  const coverFields = [
    ['Estudiante', studentName,               'Año Académico',  pei?.school_year || '—'],
    ['Edad',       pei?.student_age || '—',   'F. Nacimiento',  pei?.student_dob || '—'],
    ['Ingreso a Chanak', pei?.enrollment_date || '—', 'Último Grado',  pei?.last_grade_completed || '—'],
    ['Modalidad',  pei?.modality || 'Off-Campus', 'Currículo Base', pei?.curriculum_base || 'A.C.E.'],
    ['Fecha Emisión', pei?.issue_date || '—', 'Coordinador',   pei?.coordinator_name || '—'],
  ];

  coverFields.forEach(([l1, v1, l2, v2]) => {
    fieldLabel(doc, col1, y, l1 + ':');
    fieldValue(doc, col1, y + 4, v1);
    fieldLabel(doc, col2, y, l2 + ':');
    fieldValue(doc, col2, y + 4, v2);
    y += rowH;
  });

  y += 10;

  // Texto institucional introductorio
  if (pei?.institutional_intro) {
    doc.setFillColor(...LGRAY);
    const introLines = doc.splitTextToSize(pei.institutional_intro, W - M * 2 - 8);
    doc.rect(M, y, W - M * 2, introLines.length * 4.5 + 8, 'F');
    doc.setFont(FONT_NORMAL, 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(introLines, M + 4, y + 5);
    doc.setTextColor(...BLACK);
    y += introLines.length * 4.5 + 12;
  }

  // ── SECCIÓN 1: Datos generales y motivo del PEI ───────────────────────────
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, y, '1. Datos Generales y Motivo del PEI');
  y = textBlock(doc, y, pei?.initial_diagnosis, M);
  y += 4;

  // ── SECCIÓN 2: Perfil educativo y fortalezas ──────────────────────────────
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, y, '2. Perfil Educativo y Fortalezas');

  if (pei?.strength_areas) {
    fieldLabel(doc, M, y, 'Áreas de Fortaleza:');
    y += 4;
    y = textBlock(doc, y, pei.strength_areas, M);
    y += 3;
  }
  if (pei?.improvement_areas) {
    fieldLabel(doc, M, y, 'Áreas de Mejora:');
    y += 4;
    y = textBlock(doc, y, pei.improvement_areas, M);
    y += 3;
  }

  // ── SECCIÓN 3: Cómo funciona el currículo A.C.E. ─────────────────────────
  y = checkPageBreak(doc, y, 25);
  y = sectionTitle(doc, y, '3. Currículo A.C.E. y Diagnóstico');

  const aceDefault = 'El currículo A.C.E. (Accelerated Christian Education) es un sistema de autoaprendizaje basado en PACEs (Packet of Accelerated Christian Education). Cada PACE equivale a una unidad de contenido evaluable. El estudiante avanza a su ritmo individual bajo supervisión de un tutor certificado.';
  y = textBlock(doc, y, pei?.ace_curriculum_description || aceDefault, M);
  y += 4;

  // ── SECCIÓN 4: Resultados diagnósticos ───────────────────────────────────
  y = checkPageBreak(doc, y, 25);
  y = sectionTitle(doc, y, '4. Resultados Diagnósticos e Interpretación');

  if (pei?.diagnostic_results) {
    fieldLabel(doc, M, y, 'Resultados:');
    y += 4;
    y = textBlock(doc, y, pei.diagnostic_results, M);
    y += 3;
  }
  if (pei?.diagnostic_interpretation) {
    fieldLabel(doc, M, y, 'Interpretación académica:');
    y += 4;
    y = textBlock(doc, y, pei.diagnostic_interpretation, M);
    y += 3;
  }

  // ── SECCIÓN 5: Plan de estudios ───────────────────────────────────────────
  y = checkPageBreak(doc, y, 25);
  y = sectionTitle(doc, y, '5. Plan de Estudios');
  y = textBlock(doc, y, pei?.subject_plan, M);
  y += 4;

  // ── SECCIÓN 6: Extensión local obligatoria ────────────────────────────────
  if (pei?.local_extension) {
    y = checkPageBreak(doc, y, 25);
    y = sectionTitle(doc, y, '6. Extensión Local Obligatoria');
    y = textBlock(doc, y, pei.local_extension, M);
    y += 4;
  }

  // ── SECCIÓN 7: Life Skills / Desarrollo integral ──────────────────────────
  if (pei?.life_skills) {
    y = checkPageBreak(doc, y, 25);
    y = sectionTitle(doc, y, '7. Life Skills / Desarrollo Integral');
    y = textBlock(doc, y, pei.life_skills, M);
    y += 4;
  }

  // ── SECCIÓN 8: Ritmo, carga y metodología ────────────────────────────────
  y = checkPageBreak(doc, y, 25);
  y = sectionTitle(doc, y, '8. Ritmo, Carga y Metodología');
  if (pei?.daily_rhythm_methodology) {
    y = textBlock(doc, y, pei.daily_rhythm_methodology, M);
    y += 3;
  }
  if (pei?.estimated_time_daily_load) {
    fieldLabel(doc, M, y, 'Tiempo estimado y carga diaria:');
    y += 4;
    y = textBlock(doc, y, pei.estimated_time_daily_load, M);
    y += 3;
  }

  // ── SECCIÓN 9: Proyección anual de PACEs ─────────────────────────────────
  if (paces.length > 0) {
    doc.addPage();
    drawNavyHeader(doc, settings);
    y = 40;
    y = sectionTitle(doc, y, '9. Proyección Anual de PACEs');
    y += 2;

    // Agrupar por materia
    const subjectMap = {};
    paces.forEach(p => {
      if (!subjectMap[p.subject_name]) subjectMap[p.subject_name] = { Q1: [], Q2: [], Q3: [], lev: [] };
      if (p.pace_type === 'leveling') {
        subjectMap[p.subject_name].lev.push(p);
      } else {
        subjectMap[p.subject_name][p.quarter]?.push(p);
      }
    });

    const getAvg = (rows) => {
      const graded = rows.filter(p => p.grade_obtained != null);
      if (!graded.length) return '—';
      return (graded.reduce((s, p) => s + p.grade_obtained, 0) / graded.length).toFixed(0) + '%';
    };

    const tableBody = Object.entries(subjectMap).map(([subj, qs]) => {
      const q1nums = qs.Q1.slice(0, 5).map(p => p.pace_number || '').join(', ');
      const q2nums = qs.Q2.slice(0, 5).map(p => p.pace_number || '').join(', ');
      const q3nums = qs.Q3.slice(0, 5).map(p => p.pace_number || '').join(', ');
      const niv1   = qs.lev[0]?.pace_number || '—';
      const niv2   = qs.lev[1]?.pace_number || '—';
      const allGraded = [...qs.Q1, ...qs.Q2, ...qs.Q3];
      return [subj, q1nums || '—', q2nums || '—', q3nums || '—', niv1, niv2, getAvg(allGraded)];
    });

    autoTable(doc, {
      startY: y,
      head: [['Materia', 'Q1 (PACEs)', 'Q2 (PACEs)', 'Q3 (PACEs)', 'Niv.1', 'Niv.2', 'Prom.']],
      body: tableBody,
      margin: { left: M, right: M },
      headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: BLACK },
      alternateRowStyles: { fillColor: LGRAY },
      columnStyles: {
        0: { cellWidth: 45, fontStyle: 'bold' },
        1: { cellWidth: 28 },
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
      },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // ── SECCIÓN 10: Metodología, seguimiento y recursos ───────────────────────
  y = checkPageBreak(doc, y, 25);
  y = sectionTitle(doc, y, '10. Metodología, Seguimiento y Recursos');
  if (pei?.follow_up_strategies) {
    y = textBlock(doc, y, pei.follow_up_strategies, M);
    y += 3;
  }
  if (pei?.follow_up_resources) {
    fieldLabel(doc, M, y, 'Recursos de apoyo:');
    y += 4;
    y = textBlock(doc, y, pei.follow_up_resources, M);
    y += 3;
  }
  if (pei?.required_adaptations) {
    fieldLabel(doc, M, y, 'Adaptaciones requeridas:');
    y += 4;
    y = textBlock(doc, y, pei.required_adaptations, M);
    y += 3;
  }

  // ── SECCIÓN 11: Objetivos trimestrales ────────────────────────────────────
  if (pei?.quarterly_objectives) {
    y = checkPageBreak(doc, y, 25);
    y = sectionTitle(doc, y, '11. Objetivos Trimestrales');
    y = textBlock(doc, y, pei.quarterly_objectives, M);
    y += 4;
  }

  // ── SECCIÓN 12: Mensaje para la familia ──────────────────────────────────
  y = checkPageBreak(doc, y, 30);
  y = sectionTitle(doc, y, '12. Mensaje para la Familia');
  const familyMsgDefault = `Estimada familia, este Plan Educativo Individualizado ha sido elaborado con el propósito de garantizar el mejor acompañamiento académico para ${studentName}. Les invitamos a mantener una comunicación constante con el equipo de Chanak International Academy.`;
  y = textBlock(doc, y, pei?.family_message || familyMsgDefault, M);
  y += 4;

  // ── SECCIÓN 13: Conclusión institucional ─────────────────────────────────
  y = checkPageBreak(doc, y, 25);
  y = sectionTitle(doc, y, '13. Conclusión Institucional');
  const conclusionDefault = settings?.legal_text_es || 'Este documento es emitido por Chanak International Academy, institución registrada ante el Florida Department of Education (FLDOE #134620).';
  y = textBlock(doc, y, pei?.institutional_conclusion || conclusionDefault, M);
  y += 4;

  // ── Observaciones del coordinador ─────────────────────────────────────────
  if (pei?.coordinator_observations) {
    y = checkPageBreak(doc, y, 20);
    fieldLabel(doc, M, y, 'Observaciones adicionales del coordinador:');
    y += 4;
    y = textBlock(doc, y, pei.coordinator_observations, M);
    y += 4;
  }

  // ── FIRMAS ────────────────────────────────────────────────────────────────
  y = checkPageBreak(doc, y, 50);
  y = sectionTitle(doc, y, '14. Firmas');
  y += 4;

  const sigW = (W - M * 2 - 10) / 2;
  const sig1X = M;
  const sig2X = M + sigW + 10;

  // Caja firma Dirección
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(sig1X, y, sigW, 30, 'S');
  doc.setFont(FONT_NORMAL, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Firma:', sig1X + 3, y + 10);
  doc.line(sig1X + 15, y + 10, sig1X + sigW - 3, y + 10);
  doc.text('Nombre:', sig1X + 3, y + 18);
  doc.setTextColor(...BLACK);
  doc.text(pei?.director_signature_name || settings?.director_name || '______________________', sig1X + 18, y + 18);
  doc.setTextColor(...GRAY);
  doc.text('Fecha:', sig1X + 3, y + 24);
  doc.setTextColor(...BLACK);
  doc.text(pei?.director_signature_date || '______________________', sig1X + 18, y + 24);
  doc.setFont(FONT_BOLD, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('Head of School / Dirección', sig1X + sigW / 2, y + 29, { align: 'center' });

  // Caja firma Padre/Madre/Tutor
  doc.setTextColor(...BLACK);
  doc.setDrawColor(...NAVY);
  doc.rect(sig2X, y, sigW, 30, 'S');
  doc.setFont(FONT_NORMAL, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Firma:', sig2X + 3, y + 10);
  doc.line(sig2X + 15, y + 10, sig2X + sigW - 3, y + 10);
  doc.text('Nombre:', sig2X + 3, y + 18);
  doc.setTextColor(...BLACK);
  doc.text(pei?.parent_signature_name || '______________________', sig2X + 18, y + 18);
  doc.setTextColor(...GRAY);
  doc.text('Fecha:', sig2X + 3, y + 24);
  doc.setTextColor(...BLACK);
  doc.text(pei?.parent_signature_date || '______________________', sig2X + 18, y + 24);
  doc.setFont(FONT_BOLD, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('Padre / Madre / Tutor Legal', sig2X + sigW / 2, y + 29, { align: 'center' });

  // ── Paginación y guardado ──────────────────────────────────────────────────
  addPageNumbers(doc);

  const lastName = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const year     = (pei?.school_year || '').replace('-', '_');
  doc.save(`pei_${lastName}_${year}.pdf`);
}
