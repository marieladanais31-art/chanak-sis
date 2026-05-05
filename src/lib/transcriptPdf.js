/**
 * transcriptPdf.js
 * Genera boletines académicos / academic transcripts en PDF (ES o EN).
 * Usa jsPDF + jspdf-autotable — ya instalados en el proyecto.
 *
 * PENDIENTE EDGE FUNCTION: firma digital criptográfica del Director.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Paleta institucional ──────────────────────────────────────────────────────
const NAVY  = [25, 61, 109];   // #193D6D
const TEAL  = [32, 178, 170];  // #20B2AA
const GRAY  = [100, 116, 139]; // slate-500
const LGRAY = [241, 245, 249]; // slate-100

// ── Textos bilingües ──────────────────────────────────────────────────────────
const T = {
  es: {
    title:         'BOLETÍN ACADÉMICO',
    subtitle:      'Reporte de Calificaciones Trimestrales',
    studentInfo:   'Datos del Estudiante',
    name:          'Nombre Completo',
    studentId:     'Código de Estudiante',
    grade:         'Grado Académico',
    schoolYear:    'Año Escolar',
    quarter:       'Trimestre',
    dob:           'Fecha de Nacimiento',
    coursework:    'Materias Cursadas',
    subject:       'Materia',
    block:         'Bloque',
    paces:         'PACEs',
    credits:       'Créditos',
    finalGrade:    'Nota Final',
    statusLabel:   'Estado',
    approved:      'Aprobado',
    failed:        'Reprobado',
    pending:       'Pendiente',
    creditsSummary:'Resumen de Créditos',
    creditsQuarter:'Créditos del Trimestre',
    creditsYear:   'Créditos del Año Escolar',
    creditsCumul:  'Créditos Acumulados (9°–12°)',
    gpa:           'Promedio GPA',
    observations:  'Observaciones Académicas',
    issuedBy:      'Emitido por',
    issuedDate:    'Fecha de Emisión',
    directorTitle: 'Director(a)',
    signHere:      'Firma del Director',
    fldoe:         'Registro FLDOE',
    refNumber:     'Referencia',
    notPublished:  'Solo disponible cuando el boletín esté publicado.',
    pendingSig:    '[Firma digital — pendiente de implementación backend]',
  },
  en: {
    title:         'ACADEMIC TRANSCRIPT',
    subtitle:      'Quarterly Academic Report',
    studentInfo:   'Student Information',
    name:          'Full Name',
    studentId:     'Student ID',
    grade:         'Grade Level',
    schoolYear:    'School Year',
    quarter:       'Quarter',
    dob:           'Date of Birth',
    coursework:    'Coursework',
    subject:       'Subject',
    block:         'Block',
    paces:         'PACEs',
    credits:       'Credits',
    finalGrade:    'Final Grade',
    statusLabel:   'Status',
    approved:      'Passed',
    failed:        'Failed',
    pending:       'Pending',
    creditsSummary:'Credit Summary',
    creditsQuarter:'Quarter Credits',
    creditsYear:   'School Year Credits',
    creditsCumul:  'Cumulative Credits (9th–12th)',
    gpa:           'GPA',
    observations:  'Academic Observations',
    issuedBy:      'Issued by',
    issuedDate:    'Date of Issue',
    directorTitle: 'Director',
    signHere:      'Director Signature',
    fldoe:         'FLDOE Registration',
    refNumber:     'Reference',
    notPublished:  'Only available once the transcript is published.',
    pendingSig:    '[Digital signature — pending backend implementation]',
  },
};

// ── Nota de crédito por grado (sistema 0.5 por trimestre por materia) ─────────
function gradeStatusLabel(status, lang) {
  const t = T[lang];
  if (status === 'approved') return t.approved;
  if (status === 'failed')   return t.failed;
  return t.pending;
}

// ── Generador principal ───────────────────────────────────────────────────────
/**
 * @param {Object}   opts
 * @param {Object}   opts.transcript      - transcript_records row
 * @param {Array}    opts.courses         - transcript_courses rows
 * @param {Object}   opts.student         - students row { first_name, last_name, grade_level, … }
 * @param {Object}   opts.settings        - institutional_settings row
 * @param {Array}    opts.creditsSummary  - student_credits_summary rows (all quarters)
 * @param {'es'|'en'} opts.lang
 */
export function generateTranscriptPDF({ transcript, courses, student, settings, creditsSummary = [], lang = 'es' }) {
  const t = T[lang];
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const now = new Date();
  const issuedDateStr = now.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const refNumber = `${settings?.fldoe_registration || '134620'}-${now.getFullYear()}-${(student?.id || '000000').substring(0, 6).toUpperCase()}`;

  // ── Encabezado azul ─────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 38, 'F');

  // Logo (si existe URL válida en settings, intentar añadirlo; de lo contrario texto)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings?.institution_name || 'Chanak International Academy', 14, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${t.fldoe}: ${settings?.fldoe_registration || '134620'}  |  ${settings?.website || 'www.chanakacademy.org'}`, 14, 20);
  doc.text(`${settings?.address || ''}  ${settings?.city || ''}  ${settings?.state_province || 'Florida'}  ${settings?.country || 'USA'}`, 14, 25);

  // Título del documento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(t.title, W / 2, 33, { align: 'center' });

  // Franja teal de subtítulo
  doc.setFillColor(...TEAL);
  doc.rect(0, 38, W, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(t.subtitle, W / 2, 43, { align: 'center' });

  let y = 52;

  // ── Datos del estudiante ────────────────────────────────────────────────────
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(t.studentInfo, 14, y);
  y += 5;

  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';
  const infoRows = [
    [t.name,        studentName],
    [t.studentId,   student?.id?.substring(0, 8).toUpperCase() || '—'],
    [t.grade,       student?.grade_level || student?.us_grade_level || '—'],
    [t.schoolYear,  transcript?.school_year || '—'],
    [t.quarter,     transcript?.quarter || '—'],
  ];
  if (student?.birth_date) infoRows.push([t.dob, student.birth_date]);

  autoTable(doc, {
    startY: y,
    body: infoRows,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: GRAY, cellWidth: 50 },
      1: { textColor: [30, 30, 30] },
    },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Materias ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(t.coursework, 14, y);
  y += 3;

  const courseRows = (courses || []).map(c => [
    c.subject_name || '—',
    c.academic_block || '—',
    c.pace_numbers || '—',
    c.credits != null ? String(c.credits) : '0.5',
    c.final_grade != null ? Number(c.final_grade).toFixed(1) : '—',
    gradeStatusLabel(c.grade_status, lang),
  ]);

  autoTable(doc, {
    startY: y,
    head: [[t.subject, t.block, t.paces, t.credits, t.finalGrade, t.statusLabel]],
    body: courseRows.length > 0 ? courseRows : [['—', '—', '—', '—', '—', '—']],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: NAVY, textColor: [255,255,255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 35 },
      2: { cellWidth: 22 },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Resumen de créditos ─────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text(t.creditsSummary, 14, y);
  y += 3;

  const totalThisQuarter = (courses || []).reduce((sum, c) => {
    if (c.grade_status === 'approved') return sum + (parseFloat(c.credits) || 0);
    return sum;
  }, 0);

  const totalThisYear = creditsSummary
    .filter(cs => cs.school_year === transcript?.school_year)
    .reduce((sum, cs) => sum + (parseFloat(cs.credits_earned) || 0), 0) + totalThisQuarter;

  const totalCumul = creditsSummary
    .reduce((sum, cs) => sum + (parseFloat(cs.credits_earned) || 0), 0) + totalThisQuarter;

  const gpaVal = transcript?.gpa != null ? Number(transcript.gpa).toFixed(2) : '—';

  autoTable(doc, {
    startY: y,
    body: [
      [t.creditsQuarter, totalThisQuarter.toFixed(2)],
      [t.creditsYear,    totalThisYear.toFixed(2)],
      [t.creditsCumul,   totalCumul.toFixed(2)],
      [t.gpa,            gpaVal],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: GRAY, cellWidth: 80 },
      1: { fontStyle: 'bold', textColor: [...NAVY], halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Observaciones ───────────────────────────────────────────────────────────
  if (transcript?.academic_observations) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(t.observations, 14, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(transcript.academic_observations, W - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 6;
  }

  // ── Firma del Director ──────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  const signY  = Math.max(y + 10, pageH - 55);

  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(14, signY + 10, 90, signY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(settings?.director_name || t.directorTitle, 14, signY + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(settings?.director_title || t.directorTitle, 14, signY + 20);
  // PENDIENTE EDGE FUNCTION: cargar imagen de firma desde director_signature_url
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(t.pendingSig, 14, signY + 25);

  // ── Pie de página ───────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, pageH - 15, W, 15, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(settings?.legal_text_es || '', 14, pageH - 9, { maxWidth: W - 28 });
  doc.text(`${t.issuedDate}: ${issuedDateStr}  |  ${t.refNumber}: ${refNumber}`, W - 14, pageH - 5, { align: 'right' });

  const studentLastName = (student?.last_name || 'student').replace(/\s+/g, '_');
  const filename = `boletin_${studentLastName}_${transcript?.school_year || ''}_${transcript?.quarter || ''}_${lang}.pdf`;
  doc.save(filename);
}
