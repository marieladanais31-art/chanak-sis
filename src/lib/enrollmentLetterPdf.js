/**
 * enrollmentLetterPdf.js — Confirmación de Matrícula / Declaration of Enrolment
 * Diseño low-ink. Sin mencionar modalidad Off-Campus.
 * Logo/sello/firma desde preloadImages() + fallback /brand/*.png.
 */

import jsPDF from 'jspdf';
import {
  addInstitutionSeal,
  addInstitutionSignature,
  applyOfficialFooterAllPages,
  drawOfficialHeader,
  formatMsaStatus,
  getInstitutionInfo,
  normalizeDocumentLanguage,
  PDF_BLACK,
  PDF_BORDER,
  PDF_FOOTER_H,
  PDF_GRAY,
  PDF_LGRAY,
  PDF_MARGIN,
  PDF_NAVY,
} from '@/lib/officialDocuments';

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

/** Garantiza espacio disponible; si no cabe, crea nueva página y redibuja header. */
function ensureSpace(doc, y, need, settings, lang, title) {
  if (y + need > pH(doc) - PDF_FOOTER_H - 6) {
    doc.addPage();
    return drawOfficialHeader(doc, settings, { docTitle: title, lang }) + 4;
  }
  return y;
}

/** Renderiza texto justificado (approx). Retorna nueva Y. */
function paragraph(doc, y, text, M = PDF_MARGIN, size = 10.5) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...PDF_BLACK);
  const lines = doc.splitTextToSize(text, pW(doc) - M * 2);
  doc.text(lines, M, y);
  return y + lines.length * (size * 0.45) + 4;
}

const I18N = {
  es: {
    title:      'CERTIFICADO DE MATRÍCULA',
    toWhom:     'A QUIEN CORRESPONDA:',
    student:    'Estudiante',
    year:       'Año Académico',
    grade:      'Grado',
    gradeUS:    'Grado (US)',
    startDate:  'Fecha de Inicio',
    status:     'Estado',
    confirmed:  'ACTIVO / MATRICULADO',
    sigLabel:   'Firma:',
    nameLabel:  'Nombre:',
    dateLabel:  'Fecha:',
    role:       'Head of School / Dirección',
    page:       'Pág.',
    programme:  'Programa K–12 Internacional',
  },
  en: {
    title:      'CERTIFICATE OF ENROLMENT',
    toWhom:     'TO WHOM IT MAY CONCERN:',
    student:    'Student',
    year:       'Academic Year',
    grade:      'Grade (Local)',
    gradeUS:    'Grade (US)',
    startDate:  'Start Date',
    status:     'Status',
    confirmed:  'ACTIVE / ENROLLED',
    sigLabel:   'Signature:',
    nameLabel:  'Name:',
    dateLabel:  'Date:',
    role:       'Head of School',
    page:       'Page',
    programme:  'K–12 International Academic Programme',
  },
};

function buildBodyText(studentName, schoolYear, info, lang, msaFull) {
  if (lang === 'en') {
    return [
      `This is to certify that ${studentName} is currently enrolled as an active student at ${info.name} for the academic year ${schoolYear || '—'}.`,
      `The student is part of the K–12 International Academic Programme of ${info.name}, holding an active academic record with an assigned mentor and full access to the institutional academic management system.`,
      `${info.name} is registered with the Florida Department of Education (FLDOE School Number ${info.fldoe}) as a private educational institution in the State of Florida, United States of America. The institution holds the status of ${msaFull}.`,
      `This certificate is issued at the request of the family for academic, administrative, and informational purposes. It may be verified by contacting the institution directly at ${info.email}.`,
    ];
  }
  return [
    `Por medio de la presente, ${info.name} certifica que el/la estudiante ${studentName} figura como estudiante activo/a y matriculado/a para el año académico ${schoolYear || '—'}.`,
    `La institución confirma que el/la estudiante forma parte de su programa académico internacional K–12, con expediente académico activo y seguimiento institucional dentro del sistema de gestión académica de ${info.name}.`,
    `${info.name} está registrada ante el Florida Department of Education (FLDOE School Number ${info.fldoe}) como institución educativa privada en el Estado de Florida, Estados Unidos de América, y ostenta la condición de ${msaFull}.`,
    `La presente certificación se expide a solicitud de la familia para fines académicos, administrativos e informativos, y puede verificarse contactando directamente con la administración institucional.`,
  ];
}

export function generateEnrollmentLetterPDF({ letter, student, settings, lang: requestedLang }) {
  const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const lang    = normalizeDocumentLanguage(requestedLang || letter?.letter_language || 'es');
  const t       = I18N[lang] || I18N.es;
  const info    = getInstitutionInfo(settings);
  const msaFull = formatMsaStatus(settings, lang, false);
  const W       = pW(doc);

  // ── Encabezado ──────────────────────────────────────────────────────────────
  let y = drawOfficialHeader(doc, settings, { docTitle: t.title, lang });

  // ── Ref + Fecha ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_GRAY);
  if (letter?.letter_ref) doc.text(`Ref: ${letter.letter_ref}`, PDF_MARGIN, y);
  doc.text(
    `${lang === 'en' ? 'Date' : 'Fecha'}: ${letter?.issue_date || new Date().toISOString().split('T')[0]}`,
    W - PDF_MARGIN, y, { align: 'right' },
  );
  doc.setTextColor(...PDF_BLACK);
  y += 9;

  // ── Saludo ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_NAVY);
  doc.text(t.toWhom, PDF_MARGIN, y);
  doc.setTextColor(...PDF_BLACK);
  y += 8;

  // ── Cuerpo de la carta ──────────────────────────────────────────────────────
  const studentName = student
    ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || '—'
    : (letter?.student_name || '—');

  // Si el admin puso texto custom en DB, usarlo; si no, usar texto institucional neutral
  const customBody = letter?.confirmation_text || letter?.body_text || letter?.content || '';
  const hasOffCampus = /off.?campus|a distancia|modalidad|homeschool/i.test(customBody);

  if (customBody && !hasOffCampus) {
    y = paragraph(doc, y, customBody, PDF_MARGIN, 10.5);
  } else {
    const paras = buildBodyText(studentName, letter?.school_year, info, lang, msaFull);
    for (const p of paras) {
      y = paragraph(doc, y, p, PDF_MARGIN, 10.5);
      y += 1;
    }
  }
  y += 3;

  // ── Tabla de datos del alumno ────────────────────────────────────────────────
  // Máx 4 filas × 8mm + 7mm padding = ~39mm
  const col2   = W / 2 + 2;
  const rowH   = 8;
  const rows   = [
    [t.student,   studentName,                 t.year,      letter?.school_year        || '—'],
    [t.grade,     letter?.grade_level || '—',  t.gradeUS,   letter?.us_grade_level     || '—'],
    [t.startDate, letter?.start_date  || '—',  t.status,    t.confirmed],
  ];

  // Mostrar programa solo si NO contiene Off-Campus
  const rawProg = letter?.program || '';
  const showProg = rawProg && !/off.?campus/i.test(rawProg);
  if (showProg) rows.splice(1, 0, [lang === 'en' ? 'Programme' : 'Programa', t.programme, '', '']);

  const tableH = 7 + rows.length * rowH;
  y = ensureSpace(doc, y, tableH + 52, settings, lang, t.title);

  doc.setFillColor(...PDF_LGRAY);
  doc.roundedRect(PDF_MARGIN, y, W - PDF_MARGIN * 2, tableH, 2, 2, 'F');
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(PDF_MARGIN, y, W - PDF_MARGIN * 2, tableH, 2, 2, 'S');
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.12);
  doc.line(W / 2, y + 3, W / 2, y + tableH - 3);

  let ry = y + 6;
  rows.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_GRAY);
    doc.text(`${l1}:`, PDF_MARGIN + 3, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const isGreen = v1 === t.confirmed || v2 === t.confirmed;
    doc.setTextColor(...(isGreen ? [20, 120, 60] : PDF_BLACK));
    doc.text(String(v1), PDF_MARGIN + 3, ry + 3.8);
    if (l2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...PDF_GRAY);
      doc.text(`${l2}:`, col2, ry);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(v2 === t.confirmed ? 20 : 30, v2 === t.confirmed ? 120 : 30, v2 === t.confirmed ? 60 : 30);
      doc.text(String(v2), col2, ry + 3.8);
    }
    ry += rowH;
  });
  y += tableH + 5;

  // ── Notas adicionales ───────────────────────────────────────────────────────
  if (letter?.notes) {
    y = paragraph(doc, y, letter.notes, PDF_MARGIN, 9);
  }

  // ── Firma del Director + Sello ──────────────────────────────────────────────
  // Espacio mínimo: sep(3) + sig(19) + línea + padding(4) + texto(10) + sello(24) = 70mm
  y = ensureSpace(doc, y, 70, settings, lang, t.title);
  y += 6;

  doc.setDrawColor(...PDF_NAVY);
  doc.setLineWidth(0.25);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + 76, y);
  y += 3;

  const drewSig = addInstitutionSignature(doc, settings, PDF_MARGIN, y, 40, 16);
  y += drewSig ? 19 : 16;

  // Línea de firma
  doc.setDrawColor(...PDF_NAVY);
  doc.setLineWidth(0.3);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + 76, y);
  y += 4;

  const dirName = letter?.director_signature_name || info.directorName;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text(dirName, PDF_MARGIN, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GRAY);
  doc.text(info.directorTitle, PDF_MARGIN, y + 5);
  doc.text(
    `${t.dateLabel.replace(':', '')} ${letter?.director_signature_date || '_______________'}`,
    PDF_MARGIN, y + 10,
  );

  // Institución a la derecha
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(info.name, W - PDF_MARGIN, y, { align: 'right' });

  // Sello institucional debajo del nombre/cargo (validación visual)
  addInstitutionSeal(doc, settings, PDF_MARGIN, y + 14, 20, 20);

  // ── Footer ──────────────────────────────────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, { pageLabel: t.page });

  // ── Guardar ─────────────────────────────────────────────────────────────────
  const ln  = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr  = (letter?.school_year || '').replace('-', '_');
  const pfx = lang === 'en' ? 'certificate_of_enrolment' : 'certificado_matricula';
  doc.save(`${pfx}_${ln}_${yr}.pdf`);
}
