/**
 * annualTranscriptPdf.js  v6 — Expediente Académico Oficial
 * ─────────────────────────────────────────────────────────
 * Rediseño definitivo — ficha compacta, Q1/Q2/Q3/Promedio,
 * escala horizontal, certificación, una sola firma (Dirección).
 * Bilingüe ES | EN · sin ACE · sin Modalidad · sin Secretaría.
 *
 * Requiere: settings = await preloadImages(rawSettings)
 */

// ── Interruptor de etiquetas ACE ─────────────────────────────────────────────
// false (producción): PDF oficial no muestra referencias internas a ACE.
// true  (interno):    Muestra "Currículo ACE" y etiquetas del currículo.
const SHOW_ACE_LABELS_IN_OFFICIAL_PDF = false;

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawOfficialHeader,
  applyOfficialFooterAllPages,
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

/** Título de sección con subrayado navy */
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

/** Línea separadora delgada */
function hrLine(doc, y, W) {
  doc.setDrawColor(210, 220, 235);
  doc.setLineWidth(0.2);
  doc.line(PDF_MARGIN, y, W - PDF_MARGIN, y);
  return y + 4;
}

/** Salto de página si no caben `need` mm */
function pageBreak(doc, y, need) {
  if (y + need > doc.internal.pageSize.getHeight() - PDF_FOOTER_H - 10) {
    doc.addPage();
    return PDF_MARGIN;
  }
  return y;
}

/**
 * Formatea fecha de forma segura evitando desfase de zona horaria.
 * Retorna null si el valor es falsy.
 */
function fmtDate(dateVal, lang) {
  if (!dateVal) return null;
  try {
    const s = String(dateVal);
    const d = new Date(s.includes('T') ? s : `${s}T12:00:00`);
    if (isNaN(d.getTime())) return String(dateVal);
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
 *   cada record: { quarter, subjects: [{ subject_name, final_grade, credits }] }
 * @param {object}   params.settings  — resultado de preloadImages()
 * @param {boolean}  params.isHighSchool
 * @param {string}   params.observations — texto de observaciones (opcional)
 */
export function generateAnnualTranscriptPDF({
  student, years, settings, isHighSchool = false, lang: requestedLang,
  observations = '',
}) {
  const lang = normalizeDocumentLanguage(requestedLang || settings?.primary_language || 'es');
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();

  // Escala de calificación con descriptores oficiales (sin ACE)
  const gradingScale = TRANSCRIPT_GRADING_SCALE
    .filter(g => g.letter !== 'F')
    .map(g => ({
      range:  `${g.min}–${g.max}`,
      letter: g.letter,
      label:  (GRADE_LABELS[lang] || GRADE_LABELS.es)[g.letter]
              || (lang === 'en' ? 'Mastery achieved' : 'Dominio alcanzado'),
    }));

  // Identificadores
  const today      = new Date().toLocaleDateString(
    lang === 'en' ? 'en-US' : 'es-ES',
    { day: '2-digit', month: 'long', year: 'numeric' },
  );
  const studentId8 = (student?.id || '').substring(0, 8).toUpperCase() || 'N/A';
  const yearLabel  = years.length > 0 ? years[0].school_year : '—';

  // ── 1. ENCABEZADO INSTITUCIONAL ──────────────────────────────────────────
  const docTitle    = lang === 'en' ? 'OFFICIAL ACADEMIC TRANSCRIPT' : 'EXPEDIENTE ACADÉMICO OFICIAL';
  const docSubtitle = lang === 'en' ? 'Student Academic Record'       : 'Historial de Calificaciones del Estudiante';

  let y = drawOfficialHeader(doc, settings, { docTitle, docSubtitle, lang });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(
    `${lang === 'en' ? 'Issued' : 'Emitido'}: ${today}`,
    W - PDF_MARGIN, y - 2, { align: 'right' },
  );
  y += 5;

  // ── 2. DATOS DEL ESTUDIANTE ──────────────────────────────────────────────
  // Campos visibles: Estudiante | N.º matrícula | Fecha nac. | País | Nivel | Año escolar
  // NO incluir: Modalidad, Off-Campus, Programa académico, Fecha de matriculación
  y = pageBreak(doc, y, 38);
  y = sectionTitle(
    doc,
    lang === 'en' ? 'Student Information' : 'Datos del Estudiante',
    y, W,
  );

  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || '—';
  const country     = student.country || (lang === 'en' ? 'Spain' : 'España');
  const grade       = student.grade_level || student.us_grade_level || '—';

  // Fecha de nacimiento — siempre mostrar; "Pendiente de registro" si vacía
  const dobRaw = student.date_of_birth || student.birth_date || student.dob || student.fecha_nacimiento || null;
  const dobStr = fmtDate(dobRaw, lang) || (lang === 'en' ? 'Pending registration' : 'Pendiente de registro');

  // 3 filas × 2 pares — sin encabezados, sin Campo/Valor
  const infoRows = lang === 'en'
    ? [
        ['Student:',      studentName,  'Student ID:',           studentId8 ],
        ['Date of Birth:', dobStr,       'Country of Residence:', country    ],
        ['Grade Level:',  grade,        'School Year:',          yearLabel  ],
      ]
    : [
        ['Estudiante:',         studentName,  'N.º de matrícula:',   studentId8 ],
        ['Fecha de nacimiento:', dobStr,       'País de residencia:', country    ],
        ['Nivel académico:',    grade,        'Año escolar:',        yearLabel  ],
      ];

  autoTable(doc, {
    startY:  y,
    margin:  { left: PDF_MARGIN, right: PDF_MARGIN },
    body:    infoRows,
    theme:   'plain',
    styles:  { fontSize: 9, cellPadding: [2.5, 4] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [75, 90, 115], cellWidth: 48 },
      1: { textColor: [...PDF_BLACK], cellWidth: 54 },
      2: { fontStyle: 'bold', textColor: [75, 90, 115], cellWidth: 48 },
      3: { textColor: [...PDF_BLACK] },
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── 3. CALIFICACIONES OFICIALES — una tabla por año escolar ─────────────
  // SIN sección de historial de matrícula
  years.forEach(yr => {
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

    const yrLabel = yr.school_year || '—';
    const secLabel = lang === 'en'
      ? `Official Grades — School Year ${yrLabel}`
      : `Calificaciones Oficiales — Año Escolar ${yrLabel}`;

    y = pageBreak(doc, y, 50);
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
        lang === 'en' ? 'Subject'  : 'Materia',
        'Q1', 'Q2', 'Q3',
        lang === 'en' ? 'Average'  : 'Promedio',
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
        // Celdas sin nota (columnas Q1/Q2/Q3) en gris claro
        if (data.column.index >= 1 && data.column.index <= 3) {
          const raw = Array.isArray(data.row.raw) ? data.row.raw[data.column.index] : null;
          if (raw === '—') data.cell.styles.textColor = [185, 200, 220];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  });

  // ── 4. ESCALA DE CALIFICACIÓN — 3 columnas horizontales ─────────────────
  y = pageBreak(doc, y, 35);
  y = sectionTitle(
    doc,
    lang === 'en' ? 'Grading Scale' : 'Escala de Calificación',
    y, W,
  );

  // 9 grados divididos en 3 grupos de 3 → 1 fila por grupo → 3 filas × 9 columnas
  const g3 = [gradingScale.slice(0, 3), gradingScale.slice(3, 6), gradingScale.slice(6)];
  const scaleRows = [0, 1, 2].map(i => {
    const row = [];
    g3.forEach(grp => {
      const g = grp[i];
      row.push(g ? g.range : '', g ? g.letter : '', g ? g.label : '');
    });
    return row;
  });

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    body:   scaleRows,
    theme:  'plain',
    styles: { fontSize: 7.5, cellPadding: [2, 3] },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', textColor: [90, 105, 130] },
      1: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: PDF_NAVY },
      2: { cellWidth: 44, textColor: [...PDF_BLACK] },
      3: { cellWidth: 18, halign: 'center', textColor: [90, 105, 130] },
      4: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: PDF_NAVY },
      5: { cellWidth: 44, textColor: [...PDF_BLACK] },
      6: { cellWidth: 18, halign: 'center', textColor: [90, 105, 130] },
      7: { cellWidth: 10, halign: 'center', fontStyle: 'bold', textColor: PDF_NAVY },
      8: { textColor: [...PDF_BLACK] },
    },
    tableLineColor: [...PDF_BORDER],
    tableLineWidth: 0.1,
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── 5. OBSERVACIONES — solo si hay contenido ────────────────────────────
  const obsText = String(observations || '').trim();
  if (obsText) {
    y = pageBreak(doc, y, 28);
    y = sectionTitle(doc, lang === 'en' ? 'Observations' : 'Observaciones', y, W);
    const obsLines = doc.splitTextToSize(obsText, W - PDF_MARGIN * 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(65, 82, 108);
    doc.text(obsLines, PDF_MARGIN, y);
    y += obsLines.length * 4.5 + 8;
  }

  // ── 6. CERTIFICACIÓN ─────────────────────────────────────────────────────
  y = pageBreak(doc, y, 70);
  y = sectionTitle(doc, lang === 'en' ? 'Certification' : 'Certificación', y, W);

  const certText = lang === 'en'
    ? 'We certify that this academic transcript reflects the official grades recorded for the student named herein, according to the institutional academic records of Chanak International Academy for the corresponding school year.'
    : 'Se certifica que el presente expediente académico refleja las calificaciones registradas oficialmente del estudiante indicado, de acuerdo con los registros académicos institucionales de Chanak International Academy para el año escolar correspondiente.';

  const certLines = doc.splitTextToSize(certText, W - PDF_MARGIN * 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(65, 80, 105);
  doc.text(certLines, PDF_MARGIN, y);
  y += certLines.length * 4.8 + 12;

  y = hrLine(doc, y, W);

  // ── 7. FIRMA — SOLO DIRECCIÓN ACADÉMICA ─────────────────────────────────
  // NO Secretaría · NO Registrar · NO Academic Office
  y = pageBreak(doc, y, 55);

  const instInfo = getInstitutionInfo(settings);
  const dirName  = instInfo.directorName || 'Mariela Andrade';
  const dirTitle = lang === 'en' ? 'Academic Director' : 'Directora Académica';
  const sigBlockLabel = lang === 'en'
    ? 'Academic Director Signature and Institutional Seal'
    : 'Firma de Dirección Académica y Sello Institucional';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_NAVY);
  doc.text(sigBlockLabel, PDF_MARGIN, y);
  y += 4;

  // Imagen de firma del director si existe en settings
  const drewSig = addInstitutionSignature(doc, settings, PDF_MARGIN, y, 50, 18);
  y += drewSig ? 17 : 14;

  // Línea de firma
  doc.setDrawColor(160, 185, 215);
  doc.setLineWidth(0.5);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + 90, y);
  y += 5;

  // Nombre, cargo, fecha de emisión
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(dirName, PDF_MARGIN, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(75, 90, 115);
  doc.text(dirTitle, PDF_MARGIN, y + 5.5);
  doc.text(
    `${lang === 'en' ? 'Date of Issue' : 'Fecha de Emisión'}: ${today}`,
    PDF_MARGIN, y + 11,
  );

  // Sello institucional a la derecha del bloque de firma
  addInstitutionSeal(doc, settings, PDF_MARGIN + 100, y - 14, 24, 24);

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
