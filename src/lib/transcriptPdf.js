/**
 * transcriptPdf.js  v3 — Diseño de baja tinta
 * ─────────────────────────────────────────────
 * Boletines académicos / Academic Transcripts  (ES | EN)
 * jsPDF + jspdf-autotable
 *
 * HOTFIX 2026-05-24: Rediseño low-ink. Logo/sello/firma activos via preloadImages().
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addInstitutionSeal,
  addInstitutionSignature,
  applyOfficialFooterAllPages,
  drawOfficialHeader,
  drawSectionLabel,
  getInstitutionInfo,
  PDF_BLACK,
  PDF_BLUE,
  PDF_BORDER,
  PDF_FOOTER_H,
  PDF_GRAY,
  PDF_MARGIN,
  PDF_NAVY,
} from '@/lib/officialDocuments';
import { shouldShowOfficialCredits as _showCredits } from '@/lib/academicUtils';

// Re-export from correct module (academicUtils may or may not export it)
function resolveShowCredits(student, settings) {
  try {
    return _showCredits(student, { allowMiddleSchoolCredits: Boolean(settings?.allow_middle_school_credits) });
  } catch {
    return false;
  }
}

// ── Textos bilingües ──────────────────────────────────────────────────────────
const T = {
  es: {
    title:          'BOLETÍN ACADÉMICO',
    subtitle:       'Reporte de Calificaciones Trimestrales',
    studentInfo:    'Datos del Estudiante',
    name:           'Nombre Completo',
    studentId:      'Código de Estudiante',
    grade:          'Grado Académico',
    schoolYear:     'Año Escolar',
    quarter:        'Trimestre',
    dob:            'Fecha de Nacimiento',
    coursework:     'Materias Cursadas',
    subject:        'Materia',
    block:          'Bloque',
    paces:          'Evaluaciones',
    credits:        'Créditos',
    finalGrade:     'Nota Final',
    statusLabel:    'Estado',
    approved:       'Dominio alcanzado',
    failed:         'No aprobado / requiere repetición',
    pending:        'Pendiente',
    creditsSummary: 'Resumen de Créditos',
    creditsQuarter: 'Créditos del Trimestre',
    creditsYear:    'Créditos del Año Escolar',
    creditsCumul:   'Créditos Acumulados (9°–12°)',
    gpa:            'Promedio GPA',
    observations:   'Observaciones Académicas',
    issuedBy:       'Emitido por',
    issuedDate:     'Fecha de Emisión',
    directorTitle:  'Director(a)',
    signHere:       'Firma del Director',
    fldoe:          'Registro FLDOE',
    refNumber:      'Referencia',
    page:           'Pág.',
  },
  en: {
    title:          'ACADEMIC TRANSCRIPT',
    subtitle:       'Quarterly Academic Report',
    studentInfo:    'Student Information',
    name:           'Full Name',
    studentId:      'Student ID',
    grade:          'Grade Level',
    schoolYear:     'School Year',
    quarter:        'Quarter',
    dob:            'Date of Birth',
    coursework:     'Coursework',
    subject:        'Subject',
    block:          'Block',
    paces:          'Assessments',
    credits:        'Credits',
    finalGrade:     'Final Grade',
    statusLabel:    'Status',
    approved:       'Mastery achieved',
    failed:         'Not passed / repeat required',
    pending:        'Pending',
    creditsSummary: 'Credit Summary',
    creditsQuarter: 'Quarter Credits',
    creditsYear:    'School Year Credits',
    creditsCumul:   'Cumulative Credits (9th–12th)',
    gpa:            'GPA',
    observations:   'Academic Observations',
    issuedBy:       'Issued by',
    issuedDate:     'Date of Issue',
    directorTitle:  'Director',
    signHere:       'Director Signature',
    fldoe:          'FLDOE Registration',
    refNumber:      'Reference',
    page:           'Page',
  },
};

function gradeStatusLabel(status, lang) {
  const t = T[lang] || T.es;
  if (status === 'approved') return t.approved;
  if (status === 'failed')   return t.failed;
  return t.pending;
}

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

/** Adds a new page and redraws the institutional header. Returns new Y. */
function newPage(doc, settings, lang) {
  doc.addPage();
  const t = T[lang] || T.es;
  return drawOfficialHeader(doc, settings, { docTitle: t.title, lang });
}

/** Checks if there's enough room; if not, starts a new page. */
function checkBreak(doc, y, settings, lang, need = 30) {
  if (y + need > pH(doc) - PDF_FOOTER_H - 6) {
    return newPage(doc, settings, lang);
  }
  return y;
}

// ── Generador principal ───────────────────────────────────────────────────────
/**
 * @param {Object}    opts
 * @param {Object}    opts.transcript      - transcript_records row
 * @param {Array}     opts.courses         - transcript_courses rows
 * @param {Object}    opts.student         - students row (must NOT include PII beyond name/grade)
 * @param {Object}    opts.settings        - resultado de preloadImages()
 * @param {Array}     opts.creditsSummary  - student_credits_summary rows (all quarters)
 * @param {'es'|'en'} opts.lang
 */
export function generateTranscriptPDF({
  transcript,
  courses,
  student,
  settings,
  creditsSummary = [],
  lang = 'es',
}) {
  const t = T[lang] || T.es;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  const now           = new Date();
  const issuedDateStr = now.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const refNumber = `${getInstitutionInfo(settings).fldoe}-${now.getFullYear()}-${
    (student?.id || '000000').substring(0, 6).toUpperCase()
  }`;
  const showCredits = resolveShowCredits(student, settings);
  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';

  // ── Encabezado institucional (low-ink) ──────────────────────────────────────
  let y = drawOfficialHeader(doc, settings, {
    docTitle:    t.title,
    docSubtitle: t.subtitle,
    lang,
  });

  // ── Datos del estudiante ────────────────────────────────────────────────────
  y = checkBreak(doc, y, settings, lang, 45);
  y = drawSectionLabel(doc, y, t.studentInfo);

  const infoRows = [
    [t.name,       studentName],
    [t.studentId,  student?.id?.substring(0, 8).toUpperCase() || '—'],
    [t.grade,      student?.grade_level || student?.us_grade_level || '—'],
    [t.schoolYear, transcript?.school_year || '—'],
    [t.quarter,    transcript?.quarter || '—'],
  ];
  if (student?.birth_date) infoRows.push([t.dob, student.birth_date]);

  autoTable(doc, {
    startY: y,
    body: infoRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.8, textColor: [...PDF_BLACK] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [...PDF_GRAY], cellWidth: 52 },
      1: { textColor: [...PDF_BLACK] },
    },
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Materias cursadas ───────────────────────────────────────────────────────
  y = checkBreak(doc, y, settings, lang, 40);
  y = drawSectionLabel(doc, y, t.coursework);

  const courseHead = showCredits
    ? [t.subject, t.block, t.paces, t.credits, t.finalGrade, t.statusLabel]
    : [t.subject, t.block, t.paces, t.finalGrade, t.statusLabel];
  const noGradesMsg = lang === 'en'
    ? 'No grades published for this quarter.'
    : 'No hay calificaciones publicadas para este trimestre.';

  const courseRows = (courses || []).map(c => {
    const row = [
      c.subject_name   || '—',
      c.academic_block || '—',
      c.pace_numbers   || '—',
    ];
    if (showCredits) row.push(c.credits != null ? String(c.credits) : '0');
    row.push(
      c.final_grade != null ? `${Number(c.final_grade).toFixed(1)} / 100` : '—',
      gradeStatusLabel(c.grade_status, lang),
    );
    return row;
  });

  if (courseRows.length === 0) {
    // Mensaje discreto — sin fila falsa con guiones
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_GRAY);
    doc.text(noGradesMsg, PDF_MARGIN, y + 6);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      head: [courseHead],
      body: courseRows,
      styles:             { fontSize: 8, cellPadding: 2, textColor: [...PDF_BLACK] },
      headStyles:         { fillColor: [...PDF_BLUE], textColor: [...PDF_NAVY], fontStyle: 'bold', lineColor: [...PDF_BORDER], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      tableLineColor:     [...PDF_BORDER],
      tableLineWidth:     0.15,
      columnStyles: {
        0: { cellWidth: showCredits ? 52 : 62 },
        1: { cellWidth: showCredits ? 34 : 40 },
        2: { cellWidth: 22 },
        3: { cellWidth: showCredits ? 16 : 28, halign: 'center' },
        4: { cellWidth: showCredits ? 22 : 34, halign: 'center' },
        5: { cellWidth: showCredits ? 25 : undefined, halign: 'center' },
      },
      margin: { left: PDF_MARGIN, right: PDF_MARGIN },
      didDrawPage: () => {
        drawOfficialHeader(doc, settings, { docTitle: t.title, lang });
      },
    });
    y = doc.lastAutoTable.finalY;
  }
  y += 10;

  // ── Resumen de créditos / GPA ───────────────────────────────────────────────
  const gpaVal = transcript?.gpa != null ? Number(transcript.gpa).toFixed(2) : '—';

  if (showCredits) {
    y = checkBreak(doc, y, settings, lang, 40);
    y = drawSectionLabel(doc, y, t.creditsSummary);

    const totalThisQuarter = (courses || []).reduce((sum, c) => {
      if (c.grade_status === 'approved') return sum + (parseFloat(c.credits) || 0);
      return sum;
    }, 0);

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
        0: { fontStyle: 'bold', textColor: [...PDF_GRAY], cellWidth: 80 },
        1: { fontStyle: 'bold', textColor: [...PDF_NAVY], halign: 'right' },
      },
      margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    });
  } else {
    y = checkBreak(doc, y, settings, lang, 20);
    autoTable(doc, {
      startY: y,
      body: [[t.gpa, gpaVal]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1.8 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [...PDF_GRAY], cellWidth: 80 },
        1: { fontStyle: 'bold', textColor: [...PDF_NAVY], halign: 'right' },
      },
      margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    });
  }
  y = doc.lastAutoTable.finalY + 10;

  // ── Observaciones académicas ────────────────────────────────────────────────
  if (transcript?.academic_observations) {
    const obsLines = doc.splitTextToSize(transcript.academic_observations, pW(doc) - PDF_MARGIN * 2);
    const obsNeed  = 14 + obsLines.length * 4.5 + 6;
    y = checkBreak(doc, y, settings, lang, obsNeed);
    y = drawSectionLabel(doc, y, t.observations);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_BLACK);
    doc.text(obsLines, PDF_MARGIN, y);
    y += obsLines.length * 4.5 + 6;
  }

  // ── Firma del Director + Sello ──────────────────────────────────────────────
  // Espacio: sep(3) + sig(19) + línea + padding(4) + texto(5) + sello(24) = 64mm
  y = checkBreak(doc, y, settings, lang, 64);

  // Línea separadora fina
  doc.setDrawColor(...PDF_NAVY);
  doc.setLineWidth(0.25);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + 70, y);
  y += 3;

  // Imagen de firma (una sola vez, 40×16 mm); si no hay imagen, reservar espacio para línea limpia
  const drewSig = addInstitutionSignature(doc, settings, PDF_MARGIN, y, 52, 22);
  y += drewSig ? 19 : 16;

  // Línea horizontal de firma
  doc.setDrawColor(...PDF_NAVY);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGIN, y, 95, y);
  y += 4;

  // Nombre y cargo del director
  const instInfo = getInstitutionInfo(settings);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text(instInfo.directorName, PDF_MARGIN, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GRAY);
  doc.text(instInfo.directorTitle, PDF_MARGIN, y + 5);

  // Fecha de emisión y referencia (lado derecho)
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(`${t.issuedDate}: ${issuedDateStr}`, pW(doc) - PDF_MARGIN, y, { align: 'right' });
  doc.text(`${t.refNumber}: ${refNumber}`, pW(doc) - PDF_MARGIN, y + 5, { align: 'right' });

  // Sello institucional debajo del nombre/cargo (validación visual)
  addInstitutionSeal(doc, settings, PDF_MARGIN, y + 9, 20, 20);

  // ── Footer en todas las páginas ─────────────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, { pageLabel: t.page });

  // ── Guardar ─────────────────────────────────────────────────────────────────
  const studentLastName = (student?.last_name || 'student').replace(/\s+/g, '_');
  const filename = `boletin_${studentLastName}_${transcript?.school_year || ''}_${transcript?.quarter || ''}_${lang}.pdf`;
  doc.save(filename);
}
