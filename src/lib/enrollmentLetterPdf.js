/**
 * enrollmentLetterPdf.js  v3 — Diseño de baja tinta
 * ───────────────────────────────────────────────────
 * Carta de Confirmación de Matrícula / Declaration of Enrolment  (ES | EN)
 * jsPDF
 *
 * Diseño:
 * - Sin bloques sólidos azules grandes.
 * - Header: drawOfficialHeader (logo + texto + línea fina).
 * - Tabla de datos: fondo gris muy claro, borde gris fino, sin barra navy interior.
 * - Firma: caja con borde fino, sin barra de título azul.
 * - Footer: línea fina + texto gris pequeño.
 */

import jsPDF from 'jspdf';
import {
  addInstitutionSignature,
  drawOfficialHeader,
  drawSectionLabel,
  applyOfficialFooterAllPages,
  getInstitutionFldoe,
  getInstitutionName,
  normalizeDocumentLanguage,
  PDF_NAVY,
  PDF_GRAY,
  PDF_LGRAY,
  PDF_BLACK,
  PDF_BORDER,
  PDF_FOOTER_H,
  PDF_MARGIN,
} from '@/lib/officialDocuments';
import {
  getGenderedEstudiante,
  getGenderedMatriculado,
  getGenderedAlumnoActivo,
  getGenderedInscrito,
} from '@/lib/genderUtils';

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

// ─── Margen lateral del contenido de la carta ────────────────────────────────
const M = PDF_MARGIN + 6; // 20 mm

// ─── Bloque de texto justificado ─────────────────────────────────────────────
function block(doc, y, text, margin = M, size = 10) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...PDF_BLACK);
  const lines = doc.splitTextToSize(text.replace(/\n{3,}/g, '\n\n'), pW(doc) - margin * 2);
  doc.text(lines, margin, y);
  return y + lines.length * (size * 0.52) + 4;
}

// ─── i18n ─────────────────────────────────────────────────────────────────────
const I18N = {
  es: {
    title:      'CONFIRMACIÓN DE MATRÍCULA',
    toWhom:     'A QUIEN CORRESPONDA',
    tableTitle: 'DATOS DEL ESTUDIANTE',
    student:    'Nombre completo',
    year:       'Año Académico',
    program:    'Programa',
    gradeES:    'Nivel (ES)',
    gradeUS:    'Nivel (US)',
    startDate:  'Fecha de Inicio',
    studentId:  'ID de Estudiante',
    status:     'Estado',
    confirmed:  'CONFIRMADO',
    sigTitle:   'FIRMA INSTITUCIONAL',
    signature:  'Firma',
    name:       'Nombre',
    date:       'Fecha',
    role:       'Chief Administrative Officer',
    subRole:    'Chanak International Academy',
    instNote:   'Chanak International Academy es MSA-CESS Official Candidate for Accreditation y está registrada ante el Florida Department of Education (FLDOE #134620) como institución educativa privada en el Estado de Florida, EE.UU. Para verificar esta carta: administration@chanakacademy.org.',
  },
  en: {
    title:      'DECLARATION OF ENROLMENT',
    toWhom:     'TO WHOM IT MAY CONCERN',
    tableTitle: 'STUDENT INFORMATION',
    student:    'Full Name',
    year:       'School Year',
    program:    'Programme',
    gradeES:    'Grade Level (ES)',
    gradeUS:    'Grade Level (US)',
    startDate:  'Start Date',
    studentId:  'Student ID',
    status:     'Status',
    confirmed:  'CONFIRMED',
    sigTitle:   'INSTITUTIONAL SIGNATURE',
    signature:  'Signature',
    name:       'Name',
    date:       'Date',
    role:       'Chief Administrative Officer',
    subRole:    'Chanak International Academy',
    instNote:   'Chanak International Academy is an MSA-CESS Official Candidate for Accreditation registered with the Florida Department of Education (FLDOE #134620) as a private educational institution in the State of Florida, USA. To verify this letter: administration@chanakacademy.org.',
  },
};

// ─── Generador principal ──────────────────────────────────────────────────────
export function generateEnrollmentLetterPDF({ letter, student, settings, lang: requestedLang }) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = pW(doc);
  const lang = normalizeDocumentLanguage(requestedLang || letter?.letter_language || 'es');
  const t    = I18N[lang] || I18N.es;
  const fldoe  = getInstitutionFldoe(settings);
  const gender = student?.gender || '';

  // ── Header institucional ──────────────────────────────────────────────────
  let y = drawOfficialHeader(doc, settings, { docTitle: t.title, lang });
  y += 2;

  // ── Ref · Fecha ───────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_GRAY);
  if (letter?.letter_ref) {
    doc.text(`Ref: ${letter.letter_ref}`, M, y);
  }
  const dateLabel = lang === 'en' ? 'Date' : 'Fecha';
  doc.text(
    `${dateLabel}: ${letter?.issue_date || new Date().toISOString().split('T')[0]}`,
    W - M, y, { align: 'right' },
  );
  doc.setTextColor(...PDF_BLACK);
  y += 10;

  // ── Saludo ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(t.toWhom + ':', M, y);
  y += 10;

  // ── Cuerpo del texto ──────────────────────────────────────────────────────
  const studentName = student
    ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
    : '—';

  const hasCustomBody = !!(letter?.confirmation_text || letter?.body_text || letter?.content);
  let bodyText = letter?.confirmation_text || letter?.body_text || letter?.content || '';

  if (!bodyText) {
    if (lang === 'en') {
      bodyText =
        `By means of this letter, Chanak International Academy, an American Christian private ` +
        `educational institution registered with the Florida Department of Education (FLDOE #${fldoe}), ` +
        `hereby confirms that ${studentName} is an active and enrolled student in our international ` +
        `Off-Campus Programme for the ${letter?.school_year || 'current'} school year.`;
    } else {
      const articuloNombre =
        `${getGenderedEstudiante(gender).charAt(0).toUpperCase() + getGenderedEstudiante(gender).slice(1)} ${studentName}`;
      const alumnoActivo = getGenderedAlumnoActivo(gender);
      const matriculado  = getGenderedMatriculado(gender);
      bodyText =
        `Por medio de la presente, Chanak International Academy, institución educativa privada ` +
        `cristiana americana registrada ante el Florida Department of Education (FLDOE #${fldoe}), ` +
        `confirma que ${articuloNombre} figura como ${alumnoActivo} y ${matriculado} en nuestro ` +
        `Programa Off-Campus internacional correspondiente al año académico ${letter?.school_year || '—'}.`;
    }
  }

  y = block(doc, y, bodyText, M, 10);
  y += 2;

  // ── Párrafo institucional ─────────────────────────────────────────────────
  if (!hasCustomBody) {
    const inscrito = getGenderedInscrito(gender);
    const artCap   = getGenderedEstudiante(gender).charAt(0).toUpperCase() + getGenderedEstudiante(gender).slice(1);
    let instPara   = letter?.institutional_paragraph || '';
    if (!instPara) {
      if (lang === 'en') {
        instPara =
          `The student is enrolled in the Off-Campus Programme of Chanak International Academy, ` +
          `a structured international educational programme offering rigorous academic training ` +
          `based on the Mastery Learning model. The programme includes an Individualised Educational ` +
          `Plan (IEP), personalised academic follow-up with an assigned mentor, and access to the ` +
          `Chanak SIS and LMS platforms.`;
      } else {
        instPara =
          `${artCap} está ${inscrito} en el Programa Off-Campus de Chanak International Academy, ` +
          `un programa educativo internacional de carácter estructurado que ofrece formación académica ` +
          `rigurosa basada en el modelo pedagógico Mastery Learning. El programa incluye un Plan ` +
          `Educativo Individualizado (PEI), seguimiento académico personalizado con mentor asignado, ` +
          `y acceso a las plataformas institucionales SIS y LMS de Chanak.`;
      }
    }
    y = block(doc, y, instPara, M, 9.5);
    y += 2;
  } else if (letter?.institutional_paragraph) {
    y = block(doc, y, letter.institutional_paragraph, M, 9.5);
    y += 2;
  }

  // ── Divisor fino antes de la tabla de datos ───────────────────────────────
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 7;

  // ── Sección: datos del estudiante ─────────────────────────────────────────
  y = drawSectionLabel(doc, y, t.tableTitle, M);

  const tableW = W - M * 2;
  const tableH = 52;
  const col2   = M + tableW / 2 + 4;

  // Caja de datos — fondo muy claro, borde fino, sin barra de título navy
  doc.setFillColor(...PDF_LGRAY);
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.25);
  doc.roundedRect(M, y, tableW, tableH, 2, 2, 'FD');

  const studentIdValue =
    student?.student_id ||
    student?.id_document_number ||
    (letter?.student_id ? String(letter.student_id).substring(0, 8) : '—');

  const rows = [
    [t.student,   studentName,              t.year,      letter?.school_year || '—'],
    [t.program,   letter?.program || '—',   t.gradeES,   letter?.grade_level || '—'],
    [t.gradeUS,   letter?.us_grade_level || '—', t.startDate, letter?.start_date || '—'],
    [t.studentId, studentIdValue,           t.status,    t.confirmed],
  ];

  let ry = y + 7;
  rows.forEach(([l1, v1, l2, v2]) => {
    // Columna izquierda
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_GRAY);
    doc.text(l1 + ':', M + 4, ry);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const isConf1 = v1 === t.confirmed;
    doc.setTextColor(isConf1 ? 20 : 30, isConf1 ? 120 : 30, isConf1 ? 60 : 30);
    doc.text(String(v1 || '—'), M + 4, ry + 4.5);

    // Columna derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_GRAY);
    doc.text(l2 + ':', col2, ry);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const isConf2 = v2 === t.confirmed;
    doc.setTextColor(isConf2 ? 20 : 30, isConf2 ? 120 : 30, isConf2 ? 60 : 30);
    if (isConf2) doc.setFont('helvetica', 'bold');
    doc.text(String(v2 || '—'), col2, ry + 4.5);
    ry += 11;
  });

  y += tableH + 6;

  // ── Notas adicionales ─────────────────────────────────────────────────────
  if (letter?.notes) {
    y = block(doc, y, letter.notes, M, 9);
    y += 2;
  }

  // ── Nota institucional (pequeña, cursiva, siempre visible) ────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_GRAY);
  const noteLines = doc.splitTextToSize(t.instNote, W - M * 2);
  doc.text(noteLines, M, y);
  y += noteLines.length * 3.9 + 6;

  // ── Bloque de firma ───────────────────────────────────────────────────────
  const sigNeeded = 48;
  if (y + sigNeeded > pH(doc) - PDF_FOOTER_H - 4) {
    doc.addPage();
    drawOfficialHeader(doc, settings, { lang });
    y = 38;
  } else {
    y += 6;
  }

  const sigBoxW = 96;
  const sigBoxH = 44;

  // Caja con borde fino — sin barra de título navy
  doc.setFillColor(252, 253, 255); // blanco ligeramente azulado
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, sigBoxW, sigBoxH, 2, 2, 'FD');

  // Título de la firma (texto negrita, no barra azul)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(t.sigTitle, M + sigBoxW / 2, y + 7, { align: 'center' });

  // Línea fina bajo el título
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.line(M + 2, y + 9.5, M + sigBoxW - 2, y + 9.5);

  // Etiqueta de firma
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_GRAY);
  doc.text(`${t.signature}:`, M + 3, y + 18);

  // Imagen de firma (si existe) o línea en blanco
  const sigDrawn = addInstitutionSignature(doc, settings, M + 18, y + 11, 36, 13);
  doc.setDrawColor(...PDF_GRAY);
  doc.setLineWidth(0.3);
  doc.line(M + 18, y + (sigDrawn ? 25 : 18), M + sigBoxW - 3, y + (sigDrawn ? 25 : 18));

  const nameY = y + (sigDrawn ? 31 : 26);
  doc.text(`${t.name}:`, M + 3, nameY);
  doc.setTextColor(...PDF_BLACK);
  const dirName = letter?.director_signature_name || settings?.director_name || 'Mariela Andrade';
  doc.text(dirName, M + 15, nameY);

  doc.setTextColor(...PDF_GRAY);
  doc.text(`${t.date}:`, M + 3, y + 37);
  doc.setTextColor(...PDF_BLACK);
  doc.text(String(letter?.director_signature_date || '______________________'), M + 15, y + 37);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_NAVY);
  doc.text(t.role, M + 3, y + 43);

  // ── Footer en todas las páginas ───────────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, {
    pageLabel: lang === 'en' ? 'Page' : 'Pág.',
  });

  // ── Guardar ───────────────────────────────────────────────────────────────
  const ln  = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr  = (letter?.school_year || '').replace('-', '_');
  const pfx = lang === 'en' ? 'declaration_of_enrolment' : 'confirmacion_matricula';
  doc.save(`${pfx}_${ln}_${yr}.pdf`);
}
