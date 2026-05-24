/**
 * transcriptPdf.js  v3 — Diseño de baja tinta
 * ─────────────────────────────────────────────
 * Boletines académicos / Academic Transcripts  (ES | EN)
 * jsPDF + jspdf-autotable
 *
 * Diseño:
 * - Sin bloques sólidos azules grandes.
 * - Header: logo + texto + línea fina (drawOfficialHeader).
 * - Secciones: acento lateral 2 mm + texto negrita (drawSectionLabel).
 * - Footer: línea fina + texto gris (applyOfficialFooterAllPages).
 * - Cabecera de tabla: azul muy claro, no navy oscuro.
 * - Firma: imagen si existe, línea limpia si no.
 * - Header repetido en páginas 2+ via willDrawPage.
 * - Paginación completa: Pág. X / Y.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addInstitutionSignature,
  drawOfficialHeader,
  drawSectionLabel,
  applyOfficialFooterAllPages,
  getInstitutionName,
  getInstitutionFldoe,
  PDF_NAVY,
  PDF_GRAY,
  PDF_LGRAY,
  PDF_BLACK,
  PDF_BLUE,
  PDF_BORDER,
  PDF_FOOTER_H,
  PDF_MARGIN,
} from '@/lib/officialDocuments';
import { shouldShowOfficialCredits } from '@/lib/academicUtils';

// ── i18n ──────────────────────────────────────────────────────────────────────
const T = {
  es: {
    title:          'BOLETÍN ACADÉMICO',
    subtitle:       'Reporte de Calificaciones Trimestrales',
    studentInfo:    'DATOS DEL ESTUDIANTE',
    name:           'Nombre Completo',
    studentId:      'Código de Estudiante',
    grade:          'Grado Académico',
    schoolYear:     'Año Escolar',
    quarter:        'Trimestre',
    dob:            'Fecha de Nacimiento',
    coursework:     'MATERIAS CURSADAS',
    subject:        'Materia',
    block:          'Bloque',
    paces:          'PACEs',
    credits:        'Créditos',
    finalGrade:     'Nota Final',
    statusLabel:    'Estado',
    approved:       'Dominio alcanzado',
    failed:         'No aprobado / repetición requerida',
    pending:        'Pendiente',
    creditsSummary: 'RESUMEN DE CRÉDITOS',
    creditsQuarter: 'Créditos del Trimestre',
    creditsYear:    'Créditos del Año Escolar',
    creditsCumul:   'Créditos Acumulados (9°–12°)',
    gpa:            'Promedio GPA',
    observations:   'OBSERVACIONES ACADÉMICAS',
    issuedDate:     'Fecha de Emisión',
    directorTitle:  'Director(a)',
    fldoe:          'FLDOE',
    refNumber:      'Ref',
    page:           'Pág.',
  },
  en: {
    title:          'ACADEMIC TRANSCRIPT',
    subtitle:       'Quarterly Academic Report',
    studentInfo:    'STUDENT INFORMATION',
    name:           'Full Name',
    studentId:      'Student ID',
    grade:          'Grade Level',
    schoolYear:     'School Year',
    quarter:        'Quarter',
    dob:            'Date of Birth',
    coursework:     'COURSEWORK',
    subject:        'Subject',
    block:          'Block',
    paces:          'PACEs',
    credits:        'Credits',
    finalGrade:     'Final Grade',
    statusLabel:    'Status',
    approved:       'Mastery achieved',
    failed:         'Not passed / repeat required',
    pending:        'Pending',
    creditsSummary: 'CREDIT SUMMARY',
    creditsQuarter: 'Quarter Credits',
    creditsYear:    'School Year Credits',
    creditsCumul:   'Cumulative Credits (9th–12th)',
    gpa:            'GPA',
    observations:   'ACADEMIC OBSERVATIONS',
    issuedDate:     'Date of Issue',
    directorTitle:  'Director',
    fldoe:          'FLDOE',
    refNumber:      'Ref',
    page:           'Page',
  },
};

function gradeStatusLabel(status, lang) {
  const t = T[lang] || T.es;
  if (status === 'approved') return t.approved;
  if (status === 'failed')   return t.failed;
  return t.pending;
}

// ── Generador principal ───────────────────────────────────────────────────────
/**
 * @param {Object}    opts.transcript     - fila transcript_records
 * @param {Array}     opts.courses        - filas transcript_courses
 * @param {Object}    opts.student        - fila students
 * @param {Object}    opts.settings       - institutional_settings (preloadImages aplicado)
 * @param {Array}     opts.creditsSummary - filas student_credits_summary
 * @param {'es'|'en'} opts.lang
 */
export function generateTranscriptPDF({
  transcript, courses, student, settings, creditsSummary = [], lang = 'es',
}) {
  const t = T[lang] || T.es;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const SAFE_BOTTOM = H - PDF_FOOTER_H - 6;

  // Datos de referencia
  const now = new Date();
  const issuedDateStr = now.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const refNumber =
    `${getInstitutionFldoe(settings)}-${now.getFullYear()}-` +
    `${(student?.id || '000000').substring(0, 6).toUpperCase()}`;

  const showCredits = shouldShowOfficialCredits(student, {
    allowMiddleSchoolCredits: Boolean(settings?.allow_middle_school_credits),
  });
  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';

  // ── Helpers de paginación ──────────────────────────────────────────────────
  function newPage() {
    doc.addPage();
    // Página de continuación: header sin título ni subtítulo (más compacto)
    return drawOfficialHeader(doc, settings, { lang });
  }

  function checkBreak(y, need = 20) {
    return y + need > SAFE_BOTTOM ? newPage() : y;
  }

  // ── Página 1: header completo con título y subtítulo ───────────────────────
  let y = drawOfficialHeader(doc, settings, {
    docTitle:    t.title,
    docSubtitle: t.subtitle,
    lang,
  });

  // ── Sección: datos del estudiante ──────────────────────────────────────────
  y = checkBreak(y, 8);
  y = drawSectionLabel(doc, y, t.studentInfo);

  const infoRows = [
    [t.name,       studentName],
    [t.studentId,  student?.id?.substring(0, 8).toUpperCase() || '—'],
    [t.grade,      student?.grade_level || student?.us_grade_level || '—'],
    [t.schoolYear, transcript?.school_year || '—'],
    [t.quarter,    transcript?.quarter || '—'],
  ];
  if (student?.birth_date) infoRows.push([t.dob, student.birth_date]);

  const infoH = infoRows.length * 8 + 6;
  doc.setFillColor(...PDF_LGRAY);
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.25);
  doc.roundedRect(PDF_MARGIN, y - 1, W - PDF_MARGIN * 2, infoH, 2, 2, 'FD');

  autoTable(doc, {
    startY: y + 1,
    body:   infoRows,
    theme:  'plain',
    styles: { fontSize: 9, cellPadding: 1.8 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: PDF_GRAY, cellWidth: 52 },
      1: { textColor: PDF_BLACK },
    },
    margin: { left: PDF_MARGIN + 2, right: PDF_MARGIN + 2, bottom: PDF_FOOTER_H + 6 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección: materias cursadas ─────────────────────────────────────────────
  y = checkBreak(y, 22);
  y = drawSectionLabel(doc, y, t.coursework);

  const courseRows = (courses || []).map(c => {
    const base = [c.subject_name || '—', c.academic_block || '—', c.pace_numbers || '—'];
    if (showCredits) base.push(c.credits != null ? String(c.credits) : '0');
    base.push(
      c.final_grade != null ? `${Number(c.final_grade).toFixed(1)} / 100` : '—',
      gradeStatusLabel(c.grade_status, lang),
    );
    return base;
  });
  const courseHead = showCredits
    ? [t.subject, t.block, t.paces, t.credits, t.finalGrade, t.statusLabel]
    : [t.subject, t.block, t.paces, t.finalGrade, t.statusLabel];

  autoTable(doc, {
    startY: y,
    head:   [courseHead],
    body:   courseRows.length > 0 ? courseRows : [courseHead.map(() => '—')],
    // Estilo de baja tinta: cabecera azul muy claro, no navy oscuro
    styles: {
      fontSize:    8,
      cellPadding: 2.2,
      lineColor:   [210, 222, 234],
      lineWidth:   0.15,
    },
    headStyles: {
      fillColor:   PDF_BLUE,
      textColor:   PDF_NAVY,
      fontStyle:   'bold',
      fontSize:    8,
      lineColor:   PDF_BORDER,
      lineWidth:   0.2,
    },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    columnStyles: {
      0: { cellWidth: showCredits ? 54 : 64 },
      1: { cellWidth: showCredits ? 33 : 40 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: showCredits ? 18 : 28, halign: 'center' },
      4: { cellWidth: showCredits ? 22 : 33, halign: 'center' },
      ...(showCredits ? { 5: { cellWidth: 28, halign: 'center' } } : {}),
    },
    // Espacio para footer discreto (12 mm)
    margin: { top: 32, left: PDF_MARGIN, right: PDF_MARGIN, bottom: PDF_FOOTER_H + 6 },
    // Header institucional en páginas de continuación (slim, sin título)
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawOfficialHeader(doc, settings, { lang });
      }
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección: resumen de créditos / GPA ────────────────────────────────────
  y = checkBreak(y, 28);
  y = drawSectionLabel(doc, y, t.creditsSummary);

  const gpaVal = transcript?.gpa != null ? Number(transcript.gpa).toFixed(2) : '—';

  if (showCredits) {
    const totalThisQuarter = (courses || []).reduce(
      (sum, c) => (c.grade_status === 'approved' ? sum + (parseFloat(c.credits) || 0) : sum), 0,
    );
    const totalThisYear = creditsSummary
      .filter(cs => cs.school_year === transcript?.school_year)
      .reduce((sum, cs) => sum + (parseFloat(cs.credits_earned) || 0), 0) + totalThisQuarter;
    const totalCumul = creditsSummary
      .reduce((sum, cs) => sum + (parseFloat(cs.credits_earned) || 0), 0) + totalThisQuarter;

    autoTable(doc, {
      startY: y,
      body: [
        [t.creditsQuarter, totalThisQuarter.toFixed(2)],
        [t.creditsYear,    totalThisYear.toFixed(2)],
        [t.creditsCumul,   totalCumul.toFixed(2)],
        [t.gpa,            gpaVal],
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1.8 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: PDF_GRAY, cellWidth: 80 },
        1: { fontStyle: 'bold', textColor: PDF_NAVY, halign: 'right' },
      },
      margin: { left: PDF_MARGIN, right: PDF_MARGIN, bottom: PDF_FOOTER_H + 6 },
    });
  } else {
    autoTable(doc, {
      startY: y,
      body: [[t.gpa, gpaVal]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1.8 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: PDF_GRAY, cellWidth: 80 },
        1: { fontStyle: 'bold', textColor: PDF_NAVY, halign: 'right' },
      },
      margin: { left: PDF_MARGIN, right: PDF_MARGIN, bottom: PDF_FOOTER_H + 6 },
    });
  }
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección: observaciones académicas ─────────────────────────────────────
  if (transcript?.academic_observations) {
    y = checkBreak(y, 22);
    y = drawSectionLabel(doc, y, t.observations);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const obsLines = doc.splitTextToSize(transcript.academic_observations, W - PDF_MARGIN * 2);
    for (const line of obsLines) {
      y = checkBreak(y, 5);
      doc.text(line, PDF_MARGIN, y);
      y += 4.5;
    }
    y += 4;
  }

  // ── Bloque de firma ────────────────────────────────────────────────────────
  // Espacio necesario: línea fina + firma (~16mm) + línea + nombre + título ≈ 48mm
  y = checkBreak(y, 48);
  y += 8;

  // Línea decorativa fina (izquierda tercio)
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.4);
  doc.line(PDF_MARGIN, y, W / 2 - 14, y);
  y += 6;

  // Imagen de firma (si existe) o espacio en blanco
  const sigDrawn = addInstitutionSignature(doc, settings, PDF_MARGIN, y, 44, 16);
  y += sigDrawn ? 18 : 14;

  // Línea de firma
  doc.setDrawColor(...PDF_NAVY);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGIN, y, 95, y);
  y += 5;

  // Nombre del director
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text(settings?.director_name || 'Mariela Andrade', PDF_MARGIN, y);
  y += 5;

  // Cargo e institución
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GRAY);
  doc.text(settings?.director_title || t.directorTitle, PDF_MARGIN, y);
  y += 4;
  doc.text(getInstitutionName(settings), PDF_MARGIN, y);

  // ── Footer discreto en TODAS las páginas ──────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, {
    pageLabel: t.page,
    refLine:   `${t.issuedDate}: ${issuedDateStr}  ·  ${t.refNumber}: ${refNumber}`,
  });

  // ── Guardar ────────────────────────────────────────────────────────────────
  const lastName = (student?.last_name || 'student').replace(/\s+/g, '_');
  doc.save(
    `boletin_${lastName}_${transcript?.school_year || ''}_${transcript?.quarter || ''}_${lang}.pdf`,
  );
}
