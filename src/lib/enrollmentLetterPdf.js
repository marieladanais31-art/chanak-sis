/**
 * enrollmentLetterPdf.js
 * Genera cartas de confirmación de matrícula / Declaration of Enrolment.
 * Usa jsPDF — ya instalado en el proyecto.
 *
 * HOTFIX 2026-05-24: Rediseño low-ink. Logo/sello/firma activos via preloadImages().
 */

import jsPDF from 'jspdf';
import {
  addInstitutionSignature,
  applyOfficialFooterAllPages,
  drawOfficialHeader,
  drawSectionLabel,
  getInstitutionName,
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

function block(doc, y, text, M = PDF_MARGIN, size = 10) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...PDF_BLACK);
  const lines = doc.splitTextToSize(text, pW(doc) - M * 2);
  doc.text(lines, M, y);
  return y + lines.length * (size * 0.52) + 4;
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
const I18N = {
  es: {
    title:     'CONFIRMACIÓN DE MATRÍCULA',
    toWhom:    'A QUIEN CORRESPONDA',
    student:   'Estudiante',
    year:      'Año Académico',
    program:   'Programa',
    gradeES:   'Nivel (ES)',
    gradeUS:   'Nivel (US)',
    startDate: 'Fecha de Inicio',
    status:    'Estado',
    confirmed: 'CONFIRMADO',
    signature: 'Firma',
    name:      'Nombre',
    date:      'Fecha',
    role:      'Head of School / Dirección',
    issued:    'Fecha de Emisión',
    ref:       'Referencia',
    page:      'Pág.',
  },
  en: {
    title:     'DECLARATION OF ENROLMENT',
    toWhom:    'TO WHOM IT MAY CONCERN',
    student:   'Student',
    year:      'Academic Year',
    program:   'Programme',
    gradeES:   'Grade (Local)',
    gradeUS:   'Grade (US)',
    startDate: 'Start Date',
    status:    'Status',
    confirmed: 'CONFIRMED',
    signature: 'Signature',
    name:      'Name',
    date:      'Date',
    role:      'Head of School',
    issued:    'Date of Issue',
    ref:       'Reference',
    page:      'Page',
  },
};

// ─── Generador principal ──────────────────────────────────────────────────────
export function generateEnrollmentLetterPDF({ letter, student, settings, lang: requestedLang }) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const lang = normalizeDocumentLanguage(requestedLang || letter?.letter_language || 'es');
  const t    = I18N[lang] || I18N.es;

  // ── Encabezado institucional (low-ink) ──────────────────────────────────────
  let y = drawOfficialHeader(doc, settings, { docTitle: t.title, lang });

  // ── Ref + Fecha ─────────────────────────────────────────────────────────────
  const W = pW(doc);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_GRAY);
  if (letter?.letter_ref) {
    doc.text(`Ref: ${letter.letter_ref}`, PDF_MARGIN, y);
  }
  doc.text(
    `${lang === 'en' ? 'Date' : 'Fecha'}: ${letter?.issue_date || new Date().toISOString().split('T')[0]}`,
    W - PDF_MARGIN, y,
    { align: 'right' },
  );
  doc.setTextColor(...PDF_BLACK);
  y += 10;

  // ── Saludo ──────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...PDF_NAVY);
  doc.text(t.toWhom, PDF_MARGIN, y);
  doc.setTextColor(...PDF_BLACK);
  y += 9;

  // ── Cuerpo del texto ────────────────────────────────────────────────────────
  const bodyText = letter?.confirmation_text || letter?.body_text || letter?.content || '';
  y = block(doc, y, bodyText, PDF_MARGIN, 9);
  y += 3;

  // ── Tabla de datos del alumno ────────────────────────────────────────────────
  // 4 filas × 8mm/fila + 7mm padding superior = ~39mm total
  const tableH  = 7 + 4 * 8;
  const tableW  = W - PDF_MARGIN * 2;
  const col2    = W / 2 + 2;
  const studentName = student
    ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
    : '—';

  // Fondo y borde de la caja de datos
  doc.setFillColor(...PDF_LGRAY);
  doc.roundedRect(PDF_MARGIN, y, tableW, tableH, 2.5, 2.5, 'F');
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.25);
  doc.roundedRect(PDF_MARGIN, y, tableW, tableH, 2.5, 2.5, 'S');

  // Divisor vertical central
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.15);
  doc.line(W / 2, y + 4, W / 2, y + tableH - 4);

  const dataRows = [
    [t.student,   studentName,                  t.year,      letter?.school_year        || '—'],
    [t.program,   letter?.program   || '—',     t.gradeUS,   letter?.us_grade_level     || '—'],
    [t.gradeES,   letter?.grade_level || '—',   t.startDate, letter?.start_date         || '—'],
    [t.status,    t.confirmed,                  '', ''],
  ];

  let ry = y + 6;
  dataRows.forEach(([l1, v1, l2, v2]) => {
    // Columna izquierda
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_GRAY);
    doc.text(`${l1}:`, PDF_MARGIN + 4, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const isConfirmed = v1 === t.confirmed || v2 === t.confirmed;
    doc.setTextColor(...(isConfirmed ? [20, 120, 60] : PDF_BLACK));
    doc.text(String(v1), PDF_MARGIN + 4, ry + 4);

    // Columna derecha (si existe)
    if (l2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...PDF_GRAY);
      doc.text(`${l2}:`, col2, ry);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...PDF_BLACK);
      doc.text(String(v2), col2, ry + 4);
    }

    ry += 8;
  });

  y += tableH + 4;

  // ── Notas adicionales ───────────────────────────────────────────────────────
  if (letter?.notes) {
    y += 2;
    y = block(doc, y, letter.notes, PDF_MARGIN, 9);
  }

  // ── Firma del Director ──────────────────────────────────────────────────────
  // Necesita ~50mm; si no cabe, nueva página
  if (y + 52 > pH(doc) - PDF_FOOTER_H - 4) {
    doc.addPage();
    y = drawOfficialHeader(doc, settings, { docTitle: t.title, lang });
    y += 4;
  } else {
    y += 10;
  }

  // Línea fina separadora sobre firma
  doc.setDrawColor(...PDF_NAVY);
  doc.setLineWidth(0.25);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + 80, y);
  y += 2;

  // Imagen de firma (40×18mm si existe)
  const drewSig = addInstitutionSignature(doc, settings, PDF_MARGIN, y, 40, 18);
  const nameY   = drewSig ? y + 21 : y + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_NAVY);
  doc.text(
    letter?.director_signature_name || settings?.director_name || '______________________',
    PDF_MARGIN, nameY,
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GRAY);
  doc.text(t.role, PDF_MARGIN, nameY + 5);

  doc.setFontSize(8);
  doc.text(
    `${t.date}: ${letter?.director_signature_date || '______________________'}`,
    PDF_MARGIN, nameY + 10,
  );

  // Nombre de institución a la derecha del bloque de firma
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(getInstitutionName(settings), W - PDF_MARGIN, nameY, { align: 'right' });

  // ── Footer en todas las páginas ─────────────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, {
    pageLabel: t.page,
    buildMark: true,
  });

  // ── Guardar ─────────────────────────────────────────────────────────────────
  const ln  = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr  = (letter?.school_year || '').replace('-', '_');
  const pfx = lang === 'en' ? 'declaration_of_enrolment' : 'confirmacion_matricula';
  doc.save(`${pfx}_${ln}_${yr}.pdf`);
}
