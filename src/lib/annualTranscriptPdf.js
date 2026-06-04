/**
 * annualTranscriptPdf.js  v5 — Expediente Académico Oficial
 * ─────────────────────────────────────────────────────────
 * Diseño compacto y oficial: ficha de datos, Q1/Q2/Q3/Promedio,
 * escala horizontal, certificación, firma única (Dirección).
 * Bilingüe ES | EN.
 *
 * Requiere: settings = await preloadImages(rawSettings)
 */

// ── Configuración global ─────────────────────────────────────────────────────
/**
 * false → El PDF oficial NO muestra referencias internas a ACE.
 *         Usa "Programa académico individualizado" en su lugar.
 * true  → Muestra "Currículo ACE" y etiquetas internas (uso interno).
 */
const SHOW_ACE_LABELS_IN_OFFICIAL_PDF = false;

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawOfficialHeader,
  applyOfficialFooterAllPages,
  getInstitutionName,
  getInstitutionInfo,
  addInstitutionSeal,
  addInstitutionSignature,
  normalizeDocumentLanguage,
  PDF_NAVY,
  PDF_GRAY,
  PDF_BLACK,
  PDF_BORDER,
  PDF_FOOTER_H,
  PDF_MARGIN,
} from '@/lib/officialDocuments';
import { TRANSCRIPT_GRADING_SCALE } from '@/lib/academicUtils';

// ── Descriptores de calificación bilingüe ────────────────────────────────────
const GRADE_LABELS = {
  es: {
    'A+': 'Dominio sobresaliente',
    'A':  'Dominio excelente',
    'A-': 'Dominio muy bueno',
    'B+': 'Dominio alto',
    'B':  'Dominio adecuado',
    'B-': 'Dominio satisfactorio',
    'C+': 'En progreso avanzado',
    'C':  'En progreso',
    'C-': 'Requiere seguimiento',
  },
  en: {
    'A+': 'Outstanding mastery',
    'A':  'Excellent mastery',
    'A-': 'Very good mastery',
    'B+': 'High mastery',
    'B':  'Adequate mastery',
    'B-': 'Satisfactory mastery',
    'C+': 'Advanced progress',
    'C':  'In progress',
    'C-': 'Requires follow-up',
  },
};

const QUARTERS = ['Q1', 'Q2', 'Q3'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Línea separadora delgada */
function hrLine(doc, y, W) {
  doc.setDrawColor(210, 220, 235);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGIN, y, W - PDF_MARGIN, y);
  return y + 3;
}

/** Título de sección compacto — texto navy bold + línea inferior */
function sectionTitle(doc, label, y, W) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text(label.toUpperCase(), PDF_MARGIN, y + 5);
  doc.setDrawColor(...PDF_NAVY);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGIN, y + 7, W - PDF_MARGIN, y + 7);
  return y + 11;
}

/** Salto de página si no cabe `need` mm */
function pageBreak(doc, y, need) {
  if (y + need > doc.internal.pageSize.getHeight() - PDF_FOOTER_H - 10) {
    doc.addPage();
    return PDF_MARGIN;
  }
  return y;
}

/** Fecha segura sin desfase de zona horaria */
function fmtDate(dateVal, lang) {
  if (!dateVal) return null;
  try {
    const s = String(dateVal);
    const d = new Date(s.includes('T') ? s : `${s}T12:00:00`);
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
}

// ── Generador principal ───────────────────────────────────────────────────────
/**
 * @param {object}   params.student   — fila de `students`
 * @param {object[]} params.years     — [{ school_year, grade_level, us_grade_level, hs_year_name, records[] }]
 *   cada record: { quarter, subjects: [{ subject_name, final_grade, credits, subject_category }] }
 * @param {object}   params.settings  — resultado de preloadImages()
 * @param {boolean}  params.isHighSchool
 * @param {string}   params.observations — texto libre de observaciones (opcional)
 */
export function generateAnnualTranscriptPDF({
  student, years, settings, isHighSchool = false, lang: requestedLang,
  observations = '',
}) {
  const lang = normalizeDocumentLanguage(requestedLang || settings?.primary_language || 'es');
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();

  // Escala con descriptores oficiales
  const gradingScale = TRANSCRIPT_GRADING_SCALE
    .filter(g => g.letter !== 'F')
    .map(g => ({
      range:  `${g.min}–${g.max}`,
      letter: g.letter,
      label:  (GRADE_LABELS[lang] || GRADE_LABELS.es)[g.letter]
              || (lang === 'en' ? 'Mastery achieved' : 'Dominio alcanzado'),
    }));

  // Fecha e identificadores
  const today  = new Date().toLocaleDateString(
    lang === 'en' ? 'en-US' : 'es-ES',
    { day: '2-digit', month: 'long', year: 'numeric' },
  );
  const studentId8 = (student?.id || '').substring(0, 8).toUpperCase() || 'N/A';

  // Programa académico (respeta SHOW_ACE_LABELS_IN_OFFICIAL_PDF)
  const programLabel = SHOW_ACE_LABELS_IN_OFFICIAL_PDF
    ? (lang === 'en' ? 'ACE Curriculum' : 'Currículo ACE')
    : (lang === 'en' ? 'Individualized Academic Program' : 'Programa académico individualizado');

  // ── ENCABEZADO INSTITUCIONAL ─────────────────────────────────────────────
  const docTitle    = lang === 'en' ? 'OFFICIAL ACADEMIC TRANSCRIPT' : 'EXPEDIENTE ACADÉMICO OFICIAL';
  const docSubtitle = lang === 'en' ? 'Student Academic Record'       : 'Historial de Calificaciones del Estudiante';

  let y = drawOfficialHeader(doc, settings, { docTitle, docSubtitle, lang });

  // Fecha de emisión alineada a la derecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(
    `${lang === 'en' ? 'Issued' : 'Emitido'}: ${today}`,
    W - PDF_MARGIN, y - 2, { align: 'right' },
  );
  y += 4;

  // ── DATOS DEL ESTUDIANTE ─────────────────────────────────────────────────
  y = pageBreak(doc, y, 40);
  y = sectionTitle(doc, lang === 'en' ? 'Student Information' : 'Datos del Estudiante', y, W);

  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || '—';
  const country     = student.country || (lang === 'en' ? 'Spain' : 'España');
  const grade       = student.grade_level || student.us_grade_level || '—';
  const modality    = student.modality || 'Off-Campus';
  const yearLabel   = years.length > 0 ? years[0].school_year : '—';

  // Solo campos con valor — sin mostrar campos vacíos
  const buildInfoRows = () => {
    const rows = [];
    if (lang === 'en') {
      rows.push(['Student:', studentName,    'Student Code:', studentId8]);
      rows.push(['Grade Level:', grade,       'School Year:', yearLabel]);
      rows.push(['Country:', country,         'Modality:', modality]);
      rows.push(['Academic Program:', programLabel, '', '']);
    } else {
      rows.push(['Estudiante:', studentName,         'Código de estudiante:', studentId8]);
      rows.push(['Nivel actual:', grade,             'Año escolar:', yearLabel]);
      rows.push(['País de residencia:', country,     'Modalidad:', modality]);
      rows.push(['Programa académico:', programLabel, '', '']);
    }
    // Agregar fecha de nacimiento y matrícula solo si existen
    const dob    = fmtDate(student.date_of_birth, lang);
    const enroll = fmtDate(student.enrollment_date, lang);
    if (dob || enroll) {
      rows.push([
        lang === 'en' ? 'Date of birth:'    : 'Fecha de nacimiento:',
        dob    || '—',
        lang === 'en' ? 'Enrollment date:'  : 'Fecha de matriculación:',
        enroll || '—',
      ]);
    }
    return rows;
  };

  autoTable(doc, {
    startY:  y,
    margin:  { left: PDF_MARGIN, right: PDF_MARGIN },
    body:    buildInfoRows(),
    theme:   'plain',
    styles:  { fontSize: 9, cellPadding: [2, 3.5] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [80, 95, 120], cellWidth: 48 },
      1: { textColor: [...PDF_BLACK], cellWidth: 52 },
      2: { fontStyle: 'bold', textColor: [80, 95, 120], cellWidth: 48 },
      3: { textColor: [...PDF_BLACK] },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── CALIFICACIONES OFICIALES — una sección por año escolar ───────────────
  years.forEach((yr, idx) => {
    const subjectGrades = {};
    yr.records.forEach(r => {
      r.subjects.forEach(s => {
        if (!subjectGrades[s.subject_name]) {
          subjectGrades[s.subject_name] = { Q1: null, Q2: null, Q3: null };
        }
        const v = (s.final_grade !== null && s.final_grade !== undefined)
          ? Number(s.final_grade) : null;
        subjectGrades[s.subject_name][r.quarter] = v;
      });
    });

    const subjects = Object.keys(subjectGrades);
    if (subjects.length === 0) return;

    const yearLbl = yr.school_year || '—';
    const secLabel = lang === 'en'
      ? `Official Grades (School Year ${yearLbl})`
      : `Calificaciones Oficiales (Año Escolar ${yearLbl})`;

    y = pageBreak(doc, y, 52);
    y = sectionTitle(doc, secLabel, y, W);

    // Filas por materia
    const gradeRows = subjects.map(subj => {
      const { Q1, Q2, Q3 } = subjectGrades[subj];
      const avail = [Q1, Q2, Q3].filter(v => v !== null);
      const avg   = avail.length
        ? (avail.reduce((a, b) => a + b, 0) / avail.length).toFixed(2)
        : '—';
      return [
        subj,
        Q1 !== null ? Q1.toFixed(2) : '—',
        Q2 !== null ? Q2.toFixed(2) : '—',
        Q3 !== null ? Q3.toFixed(2) : '—',
        avg,
      ];
    });

    // Fila PROMEDIO GENERAL
    const genRow = [lang === 'en' ? 'GENERAL AVERAGE' : 'PROMEDIO GENERAL'];
    QUARTERS.forEach(q => {
      const vals = subjects.map(s => subjectGrades[s][q]).filter(v => v !== null);
      genRow.push(vals.length
        ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
        : '—');
    });
    const allVals = subjects.flatMap(s =>
      QUARTERS.map(q => subjectGrades[s][q]).filter(v => v !== null),
    );
    genRow.push(allVals.length
      ? (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(2)
      : '—');

    autoTable(doc, {
      startY: y,
      margin: { left: PDF_MARGIN, right: PDF_MARGIN, bottom: PDF_FOOTER_H + 8 },
      head: [[
        lang === 'en' ? 'Subject' : 'Materia',
        'Q1', 'Q2', 'Q3',
        lang === 'en' ? 'Average' : 'Promedio',
      ]],
      body: [...gradeRows, genRow],
      styles:             { fontSize: 8.5, cellPadding: [3, 4], textColor: [...PDF_BLACK] },
      headStyles:         { fillColor: PDF_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, lineWidth: 0 },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      tableLineColor:     [...PDF_BORDER],
      tableLineWidth:     0.12,
      columnStyles: {
        0: { cellWidth: 78, fontStyle: 'bold' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold', textColor: PDF_NAVY },
      },
      didParseCell(data) {
        if (data.row.index === gradeRows.length) {
          data.cell.styles.fillColor = [230, 240, 254];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = PDF_NAVY;
          return;
        }
        if (data.column.index >= 1 && data.column.index <= 3) {
          const raw = Array.isArray(data.row.raw) ? data.row.raw[data.column.index] : null;
          if (raw === '—') data.cell.styles.textColor = [185, 200, 220];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  });

  // ── ESCALA DE CALIFICACIÓN — layout compacto en múltiples columnas ───────
  // Dividir los 9 grados en 3 grupos de 3 para un layout horizontal
  y = pageBreak(doc, y, 38);
  y = sectionTitle(doc, lang === 'en' ? 'Grading Scale' : 'Escala de Calificación', y, W);

  // 3 columnas × 3 filas en una sola tabla de 9 columnas para máxima compacidad
  const scaleGroups = [gradingScale.slice(0, 3), gradingScale.slice(3, 6), gradingScale.slice(6)];
  const scaleRows = [];
  for (let i = 0; i < 3; i++) {
    const row = [];
    scaleGroups.forEach(grp => {
      const g = grp[i];
      if (g) { row.push(g.range, g.letter, g.label); }
      else   { row.push('', '', ''); }
    });
    scaleRows.push(row);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    body:   scaleRows,
    theme:  'plain',
    styles: { fontSize: 7.5, cellPadding: [2, 3] },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [90, 105, 130] },
      1: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: PDF_NAVY },
      2: { cellWidth: 44 },
      3: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [90, 105, 130] },
      4: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: PDF_NAVY },
      5: { cellWidth: 44 },
      6: { cellWidth: 18, halign: 'center', fontStyle: 'bold', textColor: [90, 105, 130] },
      7: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: PDF_NAVY },
      8: { },
    },
    tableLineColor: [...PDF_BORDER],
    tableLineWidth: 0.1,
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── OBSERVACIONES — solo si hay contenido ────────────────────────────────
  const hasObs = Boolean(observations && String(observations).trim());
  if (hasObs) {
    y = pageBreak(doc, y, 28);
    y = sectionTitle(doc, lang === 'en' ? 'Observations' : 'Observaciones', y, W);
    const obsLines = doc.splitTextToSize(String(observations).trim(), W - PDF_MARGIN * 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(70, 85, 110);
    doc.text(obsLines, PDF_MARGIN, y);
    y += obsLines.length * 4.5 + 8;
  }

  // ── CERTIFICACIÓN ────────────────────────────────────────────────────────
  y = pageBreak(doc, y, 75);
  y = sectionTitle(doc, lang === 'en' ? 'Certification' : 'Certificación', y, W);

  const certText = lang === 'en'
    ? 'We certify that this document corresponds to the official academic record of the student named herein, according to the academic records of Chanak International Academy for the corresponding school year.'
    : 'Se certifica que el presente expediente académico refleja las calificaciones registradas oficialmente del estudiante en el período indicado, de acuerdo con los registros académicos institucionales de Chanak International Academy.';
  const certLines = doc.splitTextToSize(certText, W - PDF_MARGIN * 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(65, 80, 105);
  doc.text(certLines, PDF_MARGIN, y);
  y += certLines.length * 4.8 + 12;

  y = hrLine(doc, y, W);
  y += 2;

  // ── FIRMA — solo Dirección Académica ─────────────────────────────────────
  const instInfo = getInstitutionInfo(settings);
  const dirName  = instInfo.directorName || 'Mariela Andrade';
  const dirTitle = lang === 'en' ? 'Academic Director' : 'Directora Académica';
  const signatureBlockW = 85;

  const sigLabel = lang === 'en'
    ? 'Academic Director Signature / Seal'
    : 'Firma de la Dirección / Sello';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_NAVY);
  doc.text(sigLabel, PDF_MARGIN, y);
  y += 3;

  // Imagen de firma si existe
  const drewSig = addInstitutionSignature(doc, settings, PDF_MARGIN, y, 48, 18);
  y += drewSig ? 16 : 13;

  // Línea de firma
  doc.setDrawColor(160, 182, 215);
  doc.setLineWidth(0.5);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + signatureBlockW, y);
  y += 5;

  // Nombre, cargo, fecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(65, 80, 105);
  doc.text(dirName,   PDF_MARGIN, y);
  doc.text(dirTitle,  PDF_MARGIN, y + 5);
  doc.text(`${lang === 'en' ? 'Date of Issue' : 'Fecha de Emisión'}: ${today}`, PDF_MARGIN, y + 10);

  // Sello a la derecha de la firma
  addInstitutionSeal(doc, settings, PDF_MARGIN + signatureBlockW + 10, y - 10, 24, 24);

  // ── Footer en todas las páginas ──────────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, {
    pageLabel: lang === 'en' ? 'Page' : 'Pág.',
  });

  // ── Guardar ──────────────────────────────────────────────────────────────
  const lastName = (student.last_name || 'student').replace(/\s+/g, '_');
  const yearStr  = years.length > 0 ? years[0].school_year.replace(/[/\\]/g, '-') : '';
  doc.save(
    lang === 'en'
      ? `official_transcript_${lastName}_${yearStr}_en.pdf`
      : `expediente_academico_${lastName}_${yearStr}_es.pdf`,
  );
}
