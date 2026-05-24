/**
 * transcriptPdf.js
 * Genera boletines académicos / academic transcripts en PDF (ES o EN).
 * Usa jsPDF + jspdf-autotable.
 *
 * Mejoras v2:
 * - Sello institucional en header
 * - Footer en TODAS las páginas (no solo la última)
 * - Encabezado repetido en páginas 2+ vía willDrawPage
 * - Firma del director: imagen si existe en settings, línea limpia si no
 * - Protección de overflow (margin.bottom + checkBreak antes de bloques)
 * - Numeración de páginas: Pág. X / Y
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  addInstitutionLogo,
  addInstitutionSeal,
  addInstitutionSignature,
  getDocumentFooter,
  getInstitutionAddress,
  getInstitutionEmail,
  getInstitutionFldoe,
  getInstitutionName,
} from '@/lib/officialDocuments';
import { shouldShowOfficialCredits } from '@/lib/academicUtils';

// ── Paleta institucional ──────────────────────────────────────────────────────
const NAVY  = [25, 61, 109];
const TEAL  = [32, 178, 170];
const GRAY  = [100, 116, 139];
const LGRAY = [241, 245, 249];
const WHITE = [255, 255, 255];
const BLACK = [30, 30, 30];

const OFFICIAL_FOOTER =
  'Chanak TrainUp Education, Inc. d/b/a Chanak International Academy · ' +
  '4883 NW 107th Path, Doral, FL 33178, USA · ' +
  'administration@chanakacademy.org · chanakacademy.org · ' +
  'FLDOE #134620 · EIN 36-5154011 · 501(c)(3) Nonprofit';

// ── i18n ──────────────────────────────────────────────────────────────────────
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
    issuedBy:       'Emitido por',
    issuedDate:     'Fecha de Emisión',
    directorTitle:  'Director(a)',
    signHere:       'Firma del Director',
    fldoe:          'FLDOE',
    refNumber:      'Ref',
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
    issuedBy:       'Issued by',
    issuedDate:     'Date of Issue',
    directorTitle:  'Director',
    signHere:       'Director Signature',
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

// ── Draw page header ── called on page 1 manually and by willDrawPage ──────────
function drawTranscriptHeader(doc, settings, t) {
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 40, 'F');

  // Logo (left) · Seal (right)
  addInstitutionLogo(doc, settings, 10, 7, 21, 21);
  addInstitutionSeal(doc, settings, W - 34, 7, 22, 22);

  // Institution name
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(getInstitutionName(settings).toUpperCase(), W / 2, 14, { align: 'center' });

  // Sub-info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `${t.fldoe} #${getInstitutionFldoe(settings)}  ·  MSA-CESS Candidate  ·  501(c)(3) Nonprofit  ·  Florida, USA`,
    W / 2, 20, { align: 'center' },
  );
  const contactLine = [
    getInstitutionAddress(settings),
    getInstitutionEmail(settings) || 'administration@chanakacademy.org',
  ].filter(Boolean).join('  ·  ');
  doc.text(contactLine || 'administration@chanakacademy.org  ·  chanakacademy.org', W / 2, 25, { align: 'center' });

  // Document title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(t.title, W / 2, 33, { align: 'center' });

  // Teal subtitle stripe
  doc.setFillColor(...TEAL);
  doc.rect(0, 39, W, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(t.subtitle, W / 2, 44, { align: 'center' });

  doc.setTextColor(...BLACK);
}

// ── Section title bar (navy fill) ─────────────────────────────────────────────
function secBar(doc, y, txt) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(14, y, W - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...WHITE);
  doc.text(txt, 17, y + 5);
  doc.setTextColor(...BLACK);
  return y + 10;
}

// ── Apply footer + page numbers to ALL pages ──────────────────────────────────
function applyFooterAllPages(doc, settings, t, refNumber, issuedDateStr) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const n = doc.getNumberOfPages();
  const footerText = settings?.document_footer || OFFICIAL_FOOTER;

  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFillColor(...NAVY);
    doc.rect(0, H - 14, W, 14, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'normal');

    // Footer text — split to 2 lines if long
    doc.setFontSize(5.5);
    const fLines = doc.splitTextToSize(footerText, W - 24);
    if (fLines.length >= 2) {
      doc.text(fLines[0], W / 2, H - 9.5, { align: 'center' });
      doc.text(fLines.slice(1).join(' '), W / 2, H - 5.5, { align: 'center' });
    } else {
      doc.text(fLines[0] || footerText, W / 2, H - 7, { align: 'center' });
    }

    // Page number (right)
    doc.setFontSize(6);
    doc.text(`${t.page} ${i} / ${n}`, W - 5, H - 5.5, { align: 'right' });

    // Issued date + ref (first page only, left)
    if (i === 1) {
      doc.setFontSize(5.5);
      doc.text(`${t.issuedDate}: ${issuedDateStr}  |  ${t.refNumber}: ${refNumber}`, 5, H - 5.5);
    }
  }
}

// ── Generador principal ───────────────────────────────────────────────────────
/**
 * @param {Object}    opts.transcript     - transcript_records row
 * @param {Array}     opts.courses        - transcript_courses rows
 * @param {Object}    opts.student        - students row
 * @param {Object}    opts.settings       - institutional_settings row (preloadImages applied)
 * @param {Array}     opts.creditsSummary - student_credits_summary rows
 * @param {'es'|'en'} opts.lang
 */
export function generateTranscriptPDF({
  transcript, courses, student, settings, creditsSummary = [], lang = 'es',
}) {
  const t = T[lang] || T.es;
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const FOOTER_H  = 14;              // footer bar height
  const MARGIN_TOP = 50;             // content start Y after header
  const SAFE_BOTTOM = H - FOOTER_H - 6;  // max Y before footer

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

  // ── Helper: new page with header ───────────────────────────────────────────
  function newPage() {
    doc.addPage();
    drawTranscriptHeader(doc, settings, t);
    return MARGIN_TOP;
  }

  function checkBreak(y, need = 20) {
    return y + need > SAFE_BOTTOM ? newPage() : y;
  }

  // ── Page 1 header ──────────────────────────────────────────────────────────
  drawTranscriptHeader(doc, settings, t);
  let y = MARGIN_TOP;

  // ── Student info table ─────────────────────────────────────────────────────
  const infoRows = [
    [t.name,       studentName],
    [t.studentId,  student?.id?.substring(0, 8).toUpperCase() || '—'],
    [t.grade,      student?.grade_level || student?.us_grade_level || '—'],
    [t.schoolYear, transcript?.school_year || '—'],
    [t.quarter,    transcript?.quarter || '—'],
  ];
  if (student?.birth_date) infoRows.push([t.dob, student.birth_date]);

  // Light border box around student info
  const infoH = infoRows.length * 8 + 4;
  doc.setFillColor(...LGRAY);
  doc.setDrawColor(210, 220, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y - 2, W - 28, infoH, 2, 2, 'FD');

  autoTable(doc, {
    startY: y,
    body: infoRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.8 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: GRAY, cellWidth: 52 },
      1: { textColor: BLACK },
    },
    margin: { left: 16, right: 16, bottom: FOOTER_H + 6 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Coursework section ─────────────────────────────────────────────────────
  y = checkBreak(y, 20);
  y = secBar(doc, y, t.coursework);

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
    styles:          { fontSize: 8, cellPadding: 2.2 },
    headStyles:      { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: {
      0: { cellWidth: showCredits ? 54 : 64 },
      1: { cellWidth: showCredits ? 33 : 40 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: showCredits ? 18 : 28, halign: 'center' },
      4: { cellWidth: showCredits ? 22 : 33, halign: 'center' },
      ...(showCredits ? { 5: { cellWidth: 28, halign: 'center' } } : {}),
    },
    margin: { left: 14, right: 14, bottom: FOOTER_H + 6 },
    // Redraw institutional header whenever autoTable creates a new page
    willDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawTranscriptHeader(doc, settings, t);
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── GPA / Credits summary ──────────────────────────────────────────────────
  y = checkBreak(y, 25);
  y = secBar(doc, y, t.creditsSummary);

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
        0: { fontStyle: 'bold', textColor: GRAY, cellWidth: 80 },
        1: { fontStyle: 'bold', textColor: NAVY, halign: 'right' },
      },
      margin: { left: 14, right: 14, bottom: FOOTER_H + 6 },
    });
  } else {
    autoTable(doc, {
      startY: y,
      body: [[t.gpa, gpaVal]],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 1.8 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: GRAY, cellWidth: 80 },
        1: { fontStyle: 'bold', textColor: NAVY, halign: 'right' },
      },
      margin: { left: 14, right: 14, bottom: FOOTER_H + 6 },
    });
  }
  y = doc.lastAutoTable.finalY + 8;

  // ── Observations ───────────────────────────────────────────────────────────
  if (transcript?.academic_observations) {
    y = checkBreak(y, 20);
    y = secBar(doc, y, t.observations);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    const obsLines = doc.splitTextToSize(transcript.academic_observations, W - 28);
    for (const line of obsLines) {
      y = checkBreak(y, 5);
      doc.text(line, 14, y);
      y += 4.5;
    }
    y += 4;
  }

  // ── Signature block ────────────────────────────────────────────────────────
  // Need ~52 mm: teal divider + signature image/blank + line + name + title
  y = checkBreak(y, 52);
  y += 6;

  // Teal divider left half
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.6);
  doc.line(14, y, W / 2 - 14, y);
  y += 6;

  // Signature image if available, else blank space
  const sigDrawn = addInstitutionSignature(doc, settings, 14, y, 44, 18);
  y += sigDrawn ? 20 : 16;

  // Signature line
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.4);
  doc.line(14, y, 95, y);
  y += 5;

  // Director name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.text(settings?.director_name || 'Mariela Andrade', 14, y);
  y += 5;

  // Title + institution
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(settings?.director_title || t.directorTitle, 14, y);
  y += 4;
  doc.text(getInstitutionName(settings), 14, y);

  // ── Footer + page numbers on ALL pages ─────────────────────────────────────
  applyFooterAllPages(doc, settings, t, refNumber, issuedDateStr);

  // ── Save ───────────────────────────────────────────────────────────────────
  const lastName = (student?.last_name || 'student').replace(/\s+/g, '_');
  doc.save(
    `boletin_${lastName}_${transcript?.school_year || ''}_${transcript?.quarter || ''}_${lang}.pdf`,
  );
}
