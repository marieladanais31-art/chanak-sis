/**
 * annualTranscriptPdf.js  v4 — Expediente Académico Oficial
 * ─────────────────────────────────────────────────────────
 * Rediseño completo: ficha institucional limpia, tabla Q1/Q2/Q3/Promedio,
 * certificación formal, sección de firmas institucional.
 * Bilingüe ES | EN · sin referencias a ACE.
 *
 * Requiere: settings = await preloadImages(rawSettings)
 */

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

// ── Descriptores de calificación bilingüe (sin ACE) ───────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────

/** Banda de sección con acento navy lateral — retorna nueva Y */
function sectionHeader(doc, label, y, W) {
  doc.setFillColor(240, 245, 254);
  doc.setDrawColor(180, 200, 230);
  doc.setLineWidth(0.15);
  doc.rect(PDF_MARGIN, y, W - PDF_MARGIN * 2, 7.5, 'FD');
  // Acento izquierdo
  doc.setFillColor(...PDF_NAVY);
  doc.rect(PDF_MARGIN, y, 3.5, 7.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text(label, PDF_MARGIN + 7, y + 5.3);
  return y + 11;
}

/** Rompe página si no cabe `need` mm — retorna nueva Y */
function pageBreak(doc, y, need) {
  if (y + need > doc.internal.pageSize.getHeight() - PDF_FOOTER_H - 10) {
    doc.addPage();
    return PDF_MARGIN;
  }
  return y;
}

/** Formatea fecha de forma segura evitando desfase de zona horaria */
function fmtDate(dateVal, lang) {
  if (!dateVal) return '—';
  try {
    const s  = String(dateVal);
    const d  = new Date(s.includes('T') ? s : `${s}T12:00:00`);
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  } catch {
    return String(dateVal);
  }
}

// ── Generador principal ────────────────────────────────────────────────────
/**
 * @param {object}   params.student   — fila de `students`
 * @param {object[]} params.years     — [{ school_year, grade_level, us_grade_level, hs_year_name, records[] }]
 *   cada record: { quarter, subjects: [{ subject_name, final_grade, credits, subject_category }] }
 * @param {object}   params.settings  — resultado de preloadImages()
 * @param {boolean}  params.isHighSchool
 */
export function generateAnnualTranscriptPDF({
  student, years, settings, isHighSchool = false, lang: requestedLang,
}) {
  const lang  = normalizeDocumentLanguage(requestedLang || settings?.primary_language || 'es');
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W     = doc.internal.pageSize.getWidth();

  // Escala de calificación con descriptores oficiales
  const gradingScale = TRANSCRIPT_GRADING_SCALE
    .filter(g => g.letter !== 'F')
    .map(g => ({
      range:  `${g.min} – ${g.max}`,
      letter: g.letter,
      label:  (GRADE_LABELS[lang] || GRADE_LABELS.es)[g.letter]
              || (lang === 'en' ? 'Mastery achieved' : 'Dominio alcanzado'),
    }));

  // Fecha e identificadores
  const today = new Date().toLocaleDateString(
    lang === 'en' ? 'en-US' : 'es-ES',
    { day: '2-digit', month: 'long', year: 'numeric' },
  );
  const refNum = `TRX-${(student?.id || '').substring(0, 6).toUpperCase() || 'N/A'}-${new Date().getFullYear()}`;

  // ── ENCABEZADO INSTITUCIONAL ─────────────────────────────────────────
  const docTitle    = lang === 'en' ? 'OFFICIAL ACADEMIC TRANSCRIPT'        : 'EXPEDIENTE ACADÉMICO OFICIAL';
  const docSubtitle = lang === 'en' ? 'Student Academic Record'              : 'Historial de Calificaciones del Estudiante';

  let y = drawOfficialHeader(doc, settings, { docTitle, docSubtitle, lang });

  // Fecha de emisión + referencia — alineadas a la derecha bajo el header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(
    `${lang === 'en' ? 'Issued' : 'Emitido'}: ${today}   |   ${lang === 'en' ? 'Ref.' : 'Ref.'}: ${refNum}`,
    W - PDF_MARGIN, y - 2, { align: 'right' },
  );
  y += 5;

  // ══ DATOS DEL ESTUDIANTE — ficha institucional (sin encabezados Campo/Valor) ══
  y = pageBreak(doc, y, 58);
  y = sectionHeader(doc, lang === 'en' ? 'STUDENT INFORMATION' : 'DATOS DEL ESTUDIANTE', y, W);

  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || '—';
  const dob         = fmtDate(student.date_of_birth, lang);
  const enroll      = fmtDate(student.enrollment_date, lang);
  const country     = student.country || (lang === 'en' ? 'Spain' : 'España');
  const grade       = student.grade_level || student.us_grade_level || '—';
  const modality    = student.modality || 'Off-Campus';
  const program     = lang === 'en'
    ? 'Individualized Academic Program'
    : 'Programa académico individualizado';

  const infoBody = lang === 'en' ? [
    ['Student:',        studentName, 'Registration #:',   refNum   ],
    ['Date of birth:',  dob,         'Country:',          country  ],
    ['Current level:',  grade,       'Enrollment date:',  enroll   ],
    ['Modality:',       modality,    'Academic Program:',  program  ],
  ] : [
    ['Estudiante:',            studentName, 'N.º de matrícula:',     refNum   ],
    ['Fecha de nacimiento:',   dob,         'País de residencia:',   country  ],
    ['Nivel actual:',          grade,       'Fecha de matriculación:', enroll  ],
    ['Modalidad:',             modality,    'Programa académico:',   program  ],
  ];

  // Tabla sin cabeceras — aspecto de ficha limpia
  autoTable(doc, {
    startY:  y,
    margin:  { left: PDF_MARGIN, right: PDF_MARGIN },
    body:    infoBody,
    theme:   'plain',
    styles:  { fontSize: 9, cellPadding: [3, 4.5] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [75, 90, 115], cellWidth: 46 },
      1: { textColor: [...PDF_BLACK], cellWidth: 54 },
      2: { fontStyle: 'bold', textColor: [75, 90, 115], cellWidth: 46 },
      3: { textColor: [...PDF_BLACK] },
    },
    didDrawTable(data) {
      // Marco suave alrededor de la ficha
      doc.setDrawColor(200, 215, 235);
      doc.setLineWidth(0.2);
      const ml = data.settings.margin.left;
      const mr = data.settings.margin.right || PDF_MARGIN;
      doc.roundedRect(ml, data.table.startY, W - ml - mr, data.table.finalY - data.table.startY, 1.5, 1.5, 'S');
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ══ 1. HISTORIAL DE MATRÍCULA ════════════════════════════════════════
  y = pageBreak(doc, y, 36);
  y = sectionHeader(
    doc,
    lang === 'en' ? '1. ENROLLMENT HISTORY' : '1. HISTORIAL DE MATRÍCULA',
    y, W,
  );

  const regRows = years.map(yr => [
    getInstitutionName(settings),
    student.id ? student.id.slice(0, 8).toUpperCase() : '—',
    yr.hs_year_name
      ? `${yr.hs_year_name} — ${yr.us_grade_level || yr.grade_level || ''}`
      : (yr.us_grade_level || yr.grade_level || '—'),
    yr.school_year,
    '',
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    head: [lang === 'en'
      ? ['School',         'Reg. #',       'Level', 'School Year', 'Notes']
      : ['Centro educativo','N.º matrícula','Nivel', 'Año escolar', 'Observaciones']
    ],
    body: regRows.length
      ? regRows
      : [[getInstitutionName(settings), '—', '—', '—', '']],
    styles:             { fontSize: 8.5, cellPadding: [3.5, 4.5] },
    headStyles:         { fillColor: PDF_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, lineWidth: 0 },
    alternateRowStyles: { fillColor: [248, 251, 255] },
    tableLineColor:     [...PDF_BORDER],
    tableLineWidth:     0.12,
  });
  y = doc.lastAutoTable.finalY + 10;

  // ══ 2+. CALIFICACIONES OFICIALES — una tabla por año escolar ══════════
  years.forEach((yr, idx) => {
    // Construir mapa: subject_name → { Q1, Q2, Q3 }
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

    const secNum   = idx + 2;
    const yearLbl  = yr.school_year || '—';

    y = pageBreak(doc, y, 52);
    y = sectionHeader(
      doc,
      lang === 'en'
        ? `${secNum}. OFFICIAL GRADES — ${yearLbl}`
        : `${secNum}. CALIFICACIONES OFICIALES — ${yearLbl}`,
      y, W,
    );

    // Filas de materias
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

    // Fila "PROMEDIO GENERAL"
    const genRow = [lang === 'en' ? 'GENERAL AVERAGE' : 'PROMEDIO GENERAL'];
    QUARTERS.forEach(q => {
      const vals = subjects.map(s => subjectGrades[s][q]).filter(v => v !== null);
      genRow.push(vals.length
        ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
        : '—');
    });
    // Promedio anual global
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
        lang === 'en' ? 'SUBJECT'       : 'MATERIA',
        'Q1', 'Q2', 'Q3',
        lang === 'en' ? 'Annual Avg.'   : 'Promedio Anual',
      ]],
      body: [...gradeRows, genRow],
      styles:             { fontSize: 8.5, cellPadding: [3.5, 4.5], textColor: [...PDF_BLACK] },
      headStyles:         { fillColor: PDF_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, lineWidth: 0 },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      tableLineColor:     [...PDF_BORDER],
      tableLineWidth:     0.12,
      columnStyles: {
        0: { cellWidth: 76, fontStyle: 'bold' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 22, halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold', textColor: PDF_NAVY },
      },
      didParseCell(data) {
        // Fila de promedio — fondo azul claro
        if (data.row.index === gradeRows.length) {
          data.cell.styles.fillColor = [230, 240, 254];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = PDF_NAVY;
          return;
        }
        // Columnas Q1/Q2/Q3 sin nota — gris suave
        if (data.column.index >= 1 && data.column.index <= 3) {
          const raw = Array.isArray(data.row.raw) ? data.row.raw[data.column.index] : null;
          if (raw === '—') data.cell.styles.textColor = [190, 205, 225];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 10;
  });

  // ══ N. ESCALA DE CALIFICACIÓN ══════════════════════════════════════════
  const scaleNum = years.length + 2;
  y = pageBreak(doc, y, 90);
  y = sectionHeader(
    doc,
    lang === 'en'
      ? `${scaleNum}. GRADING SCALE`
      : `${scaleNum}. ESCALA DE CALIFICACIÓN`,
    y, W,
  );

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    tableWidth: 118,
    head: [[
      lang === 'en' ? 'Range'      : 'Rango',
      lang === 'en' ? 'Letter'     : 'Letra',
      lang === 'en' ? 'Descriptor' : 'Descripción',
    ]],
    body: gradingScale.map(g => [g.range, g.letter, g.label]),
    styles:             { fontSize: 7.5, cellPadding: [2.5, 4] },
    headStyles:         { fillColor: PDF_NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, lineWidth: 0 },
    alternateRowStyles: { fillColor: [248, 251, 255] },
    tableLineColor:     [...PDF_BORDER],
    tableLineWidth:     0.1,
    columnStyles: {
      0: { cellWidth: 28, halign: 'center' },
      1: { cellWidth: 16, halign: 'center', fontStyle: 'bold', textColor: PDF_NAVY },
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ══ N+1. OBSERVACIONES ═════════════════════════════════════════════════
  const obsNum = years.length + 3;
  y = pageBreak(doc, y, 45);
  y = sectionHeader(
    doc,
    lang === 'en' ? `${obsNum}. OBSERVATIONS` : `${obsNum}. OBSERVACIONES`,
    y, W,
  );

  doc.setFillColor(249, 251, 255);
  doc.setDrawColor(200, 215, 235);
  doc.setLineWidth(0.2);
  doc.roundedRect(PDF_MARGIN, y, W - PDF_MARGIN * 2, 22, 2, 2, 'FD');
  y += 28;

  // ══ N+2. CERTIFICACIÓN Y FIRMAS ════════════════════════════════════════
  const certNum = years.length + 4;
  y = pageBreak(doc, y, 110);
  y = sectionHeader(
    doc,
    lang === 'en' ? `${certNum}. CERTIFICATION` : `${certNum}. CERTIFICACIÓN`,
    y, W,
  );

  // Texto de certificación
  const certText = lang === 'en'
    ? 'We certify that this document corresponds to the official academic record of the student named herein, according to the academic records of Chanak International Academy for the corresponding school year.'
    : 'Se certifica que el presente expediente académico refleja las calificaciones registradas oficialmente del estudiante en el período indicado, de acuerdo con los registros académicos institucionales.';
  const certLines = doc.splitTextToSize(certText, W - PDF_MARGIN * 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(65, 80, 105);
  doc.text(certLines, PDF_MARGIN, y);
  y += certLines.length * 4.8 + 12;

  // Línea separadora antes de firmas
  doc.setDrawColor(210, 225, 245);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGIN, y - 4, W - PDF_MARGIN, y - 4);

  // Bloques de firma — dos columnas
  const sigW = (W - PDF_MARGIN * 2 - 20) / 2;
  const x1   = PDF_MARGIN;
  const x2   = PDF_MARGIN + sigW + 20;

  const instInfo = getInstitutionInfo(settings);
  const dirName  = instInfo.directorName || 'Mariela Andrade';
  const dirTitle = lang === 'en' ? 'Academic Director'  : 'Directora Académica';
  const regTitle = lang === 'en' ? 'Academic Office'    : 'Secretaría Académica';
  const nameL    = lang === 'en' ? 'Name'  : 'Nombre';
  const titleL   = lang === 'en' ? 'Title' : 'Cargo';
  const dateL    = lang === 'en' ? 'Date'  : 'Fecha';

  // Etiquetas de cada bloque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_NAVY);
  doc.text(lang === 'en' ? 'Academic Director:'            : 'Dirección Académica:', x1, y);
  doc.text(lang === 'en' ? 'Registrar / Academic Office:'  : 'Secretaría Académica:', x2, y);
  y += 3;

  // Imagen de firma (director) si existe en settings
  const drewSig = addInstitutionSignature(doc, settings, x1, y, 48, 18);
  y += drewSig ? 16 : 13;

  // Líneas de firma
  doc.setDrawColor(170, 192, 220);
  doc.setLineWidth(0.5);
  doc.line(x1, y, x1 + sigW, y);
  doc.line(x2, y, x2 + sigW, y);
  y += 5;

  // Datos — director
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 90, 115);
  doc.text(`${nameL}: ${dirName}`,   x1, y);
  doc.text(`${titleL}: ${dirTitle}`, x1, y + 4.5);
  doc.text(`${dateL}: ${today}`,     x1, y + 9);

  // Datos — secretaría (nombre en blanco)
  doc.text(`${nameL}: ______________________`, x2, y);
  doc.text(`${titleL}: ${regTitle}`,             x2, y + 4.5);
  doc.text(`${dateL}: ${today}`,                 x2, y + 9);
  y += 18;

  // Sello institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_NAVY);
  doc.text(lang === 'en' ? 'Official Seal:' : 'Sello oficial:', x1, y);
  y += 4;
  addInstitutionSeal(doc, settings, x1, y, 24, 24);

  // ── Footer en todas las páginas ─────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, {
    pageLabel: lang === 'en' ? 'Page' : 'Pág.',
  });

  // ── Guardar ──────────────────────────────────────────────────────────
  const lastName = (student.last_name || 'student').replace(/\s+/g, '_');
  const yearStr  = years.length > 0 ? years[0].school_year.replace(/[/\\]/g, '-') : '';
  doc.save(
    lang === 'en'
      ? `official_transcript_${lastName}_${yearStr}_en.pdf`
      : `expediente_academico_${lastName}_${yearStr}_es.pdf`,
  );
}
