import jsPDF from 'jspdf';
import {
  addInstitutionLogo,
  addInstitutionSeal,
  getDocumentFooter,
  getInstitutionEmail,
  getInstitutionFldoe,
  getInstitutionName,
  normalizeDocumentLanguage,
} from '@/lib/officialDocuments';
import {
  getGenderedEstudiante,
  getGenderedMatriculado,
  getGenderedAlumnoActivo,
  getGenderedInscrito,
} from '@/lib/genderUtils';

// ─── Palette ─────────────────────────────────────────────────────────────────
const NAVY  = [25, 61, 109];
const TEAL  = [32, 178, 170];
const GRAY  = [100, 116, 139];
const WHITE = [255, 255, 255];
const BLACK = [30, 30, 30];
const LGRAY = [248, 250, 252];

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

// ─── Text block helper ────────────────────────────────────────────────────────
function block(doc, y, text, M = 20, size = 10) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...BLACK);
  const lines = doc.splitTextToSize(text.replace(/\n{3,}/g, '\n\n'), pW(doc) - M * 2);
  doc.text(lines, M, y);
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

const OFFICIAL_FOOTER = 'Chanak TrainUp Education, Inc. d/b/a Chanak International Academy · 4883 NW 107th Path, Doral, FL 33178, USA · administration@chanakacademy.org · chanakacademy.org · FLDOE #134620 · EIN 36-5154011 · 501(c)(3) Nonprofit';

// ─── Main export ──────────────────────────────────────────────────────────────
export function generateEnrollmentLetterPDF({ letter, student, settings, lang: requestedLang }) {
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M    = 20;
  const W    = pW(doc);
  const lang = normalizeDocumentLanguage(requestedLang || letter?.letter_language || 'es');
  const t    = I18N[lang] || I18N.es;
  const institutionName = getInstitutionName(settings);
  const fldoe           = getInstitutionFldoe(settings);
  const gender          = student?.gender || '';
  const institutionEmail   = getInstitutionEmail(settings) || 'administration@chanakacademy.org';
  const institutionWebsite = settings?.website || 'chanakacademy.org';

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 48, 'F');
  doc.setFillColor(...TEAL);
  doc.rect(0, 47, W, 1.5, 'F');

  // Logo left · Seal right
  addInstitutionLogo(doc, settings, 10, 5, 22, 22);
  addInstitutionSeal(doc, settings, W - 32, 5, 22, 22);

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text(institutionName.toUpperCase(), W / 2, 12, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Florida Private School · FLDOE #${fldoe}`, W / 2, 18, { align: 'center' });
  doc.text('MSA-CESS Official Candidate for Accreditation', W / 2, 22.5, { align: 'center' });
  doc.text('501(c)(3) Nonprofit · EIN 36-5154011', W / 2, 27, { align: 'center' });
  doc.text(`${institutionEmail}  ·  ${institutionWebsite}`, W / 2, 31.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(t.title, W / 2, 41, { align: 'center' });
  doc.setTextColor(...BLACK);

  let y = 57;

  // ── Ref · Date line ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  if (letter?.letter_ref) {
    doc.text(`Ref: ${letter.letter_ref}`, M, y);
  }
  const dateLabel = lang === 'en' ? 'Date' : 'Fecha';
  doc.text(
    `${dateLabel}: ${letter?.issue_date || new Date().toISOString().split('T')[0]}`,
    W - M, y, { align: 'right' }
  );
  doc.setTextColor(...BLACK);
  y += 10;

  // ── Salutation ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(t.toWhom + ':', M, y);
  y += 10;

  // ── Body text ─────────────────────────────────────────────────────────────
  const studentName = student
    ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
    : '—';

  // Flag: does the DB have custom body text already?
  const hasCustomBody = !!(letter?.confirmation_text || letter?.body_text || letter?.content);
  let bodyText = letter?.confirmation_text || letter?.body_text || letter?.content || '';

  if (!bodyText) {
    if (lang === 'en') {
      bodyText = `By means of this letter, Chanak International Academy, an American Christian private educational institution registered with the Florida Department of Education (FLDOE #${fldoe}), hereby confirms that ${studentName} is an active and enrolled student in our international Off-Campus Programme for the ${letter?.school_year || 'current'} school year.`;
    } else {
      const articuloNombre = `${getGenderedEstudiante(gender).charAt(0).toUpperCase() + getGenderedEstudiante(gender).slice(1)} ${studentName}`;
      const alumnoActivo   = getGenderedAlumnoActivo(gender);
      const matriculado    = getGenderedMatriculado(gender);
      bodyText = `Por medio de la presente, Chanak International Academy, institución educativa privada cristiana americana registrada ante el Florida Department of Education (FLDOE #${fldoe}), confirma que ${articuloNombre} figura como ${alumnoActivo} y ${matriculado} en nuestro Programa Off-Campus internacional correspondiente al año académico ${letter?.school_year || '—'}.`;
    }
  }

  y = block(doc, y, bodyText, M, 10);
  y += 2;

  // ── Institutional paragraph ────────────────────────────────────────────────
  // ONLY auto-generated when body was NOT pulled from DB.
  // This prevents the duplicate when DB body already contains this paragraph.
  if (!hasCustomBody) {
    const inscrito = getGenderedInscrito(gender);
    const artCap   = getGenderedEstudiante(gender).charAt(0).toUpperCase() + getGenderedEstudiante(gender).slice(1);
    let instPara   = letter?.institutional_paragraph || '';
    if (!instPara) {
      if (lang === 'en') {
        instPara = `The student is enrolled in the Off-Campus Programme of Chanak International Academy, a structured international educational programme offering rigorous academic training based on the Mastery Learning model. The programme includes an Individualised Educational Plan (IEP), personalised academic follow-up with an assigned mentor, and access to the Chanak SIS and LMS platforms.`;
      } else {
        instPara = `${artCap} está ${inscrito} en el Programa Off-Campus de Chanak International Academy, un programa educativo internacional de carácter estructurado que ofrece formación académica rigurosa basada en el modelo pedagógico Mastery Learning. El programa incluye un Plan Educativo Individualizado (PEI), seguimiento académico personalizado con mentor asignado, y acceso a las plataformas institucionales SIS y LMS de Chanak.`;
      }
    }
    y = block(doc, y, instPara, M, 9.5);
    y += 2;
  } else if (letter?.institutional_paragraph) {
    // Only show if explicitly set in DB even when body is custom
    y = block(doc, y, letter.institutional_paragraph, M, 9.5);
    y += 2;
  }

  // ── Teal divider ──────────────────────────────────────────────────────────
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.line(M, y, W - M, y);
  y += 5;

  // ── Student data table ────────────────────────────────────────────────────
  const tableH = 57;
  const col2   = W / 2 + 4;

  // Table background
  doc.setFillColor(...LGRAY);
  doc.roundedRect(M, y, W - M * 2, tableH, 3, 3, 'F');
  doc.setDrawColor(210, 220, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, W - M * 2, tableH, 3, 3, 'S');

  // Table title bar (navy)
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, W - M * 2, 7.5, 3, 3, 'F');
  doc.rect(M, y + 3.5, W - M * 2, 4, 'F'); // square bottom corners of title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text(t.tableTitle, W / 2, y + 5.5, { align: 'center' });

  const studentIdValue = student?.student_id
    || student?.id_document_number
    || (letter?.student_id ? String(letter.student_id).substring(0, 8) : '—');

  const rows = [
    [t.student,   studentName,                     t.year,      letter?.school_year || '—'],
    [t.program,   letter?.program || '—',           t.gradeES,   letter?.grade_level || '—'],
    [t.gradeUS,   letter?.us_grade_level || '—',    t.startDate, letter?.start_date || '—'],
    [t.studentId, studentIdValue,                  t.status,    t.confirmed],
  ];

  let ry = y + 14;
  rows.forEach(([l1, v1, l2, v2]) => {
    // Left column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(l1 + ':', M + 4, ry);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const isConf1 = v1 === t.confirmed;
    doc.setTextColor(isConf1 ? 20 : 30, isConf1 ? 120 : 30, isConf1 ? 60 : 30);
    doc.text(String(v1 || '—'), M + 4, ry + 4.5);

    // Right column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.text(l2 + ':', col2, ry);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const isConf2 = v2 === t.confirmed;
    doc.setTextColor(isConf2 ? 20 : 30, isConf2 ? 120 : 30, isConf2 ? 60 : 30);
    if (isConf2) doc.setFont('helvetica', 'bold');
    doc.text(String(v2 || '—'), col2, ry + 4.5);
    ry += 11;
  });

  y += tableH + 4;

  // ── Additional notes ──────────────────────────────────────────────────────
  if (letter?.notes) {
    y = block(doc, y, letter.notes, M, 9);
    y += 2;
  }

  // ── Institutional note (small, always shown) ──────────────────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const noteLines = doc.splitTextToSize(t.instNote, W - M * 2);
  doc.text(noteLines, M, y);
  y += noteLines.length * 3.9 + 3;

  // ── Signature block ───────────────────────────────────────────────────────
  // Add a new page only if signature won't fit (needs ~50mm + footer bar)
  const sigNeeded = 50;
  if (y + sigNeeded > pH(doc) - 16) {
    doc.addPage();
    y = 20;
  } else {
    y += 8; // comfortable spacing
  }

  const sigW = 96;
  doc.setDrawColor(210, 220, 235);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, sigW, 42, 3, 3, 'S');

  // Signature title bar
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, y, sigW, 7, 3, 3, 'F');
  doc.rect(M, y + 3, sigW, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(t.sigTitle, M + sigW / 2, y + 5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`${t.signature}:`, M + 3, y + 14);
  doc.setDrawColor(...GRAY);
  doc.setLineWidth(0.3);
  doc.line(M + 18, y + 14, M + sigW - 3, y + 14);

  doc.text(`${t.name}:`, M + 3, y + 23);
  doc.setTextColor(...BLACK);
  const dirName = letter?.director_signature_name || settings?.director_name || 'Mariela Andrade';
  doc.text(dirName, M + 15, y + 23);

  doc.setTextColor(...GRAY);
  doc.text(`${t.date}:`, M + 3, y + 32);
  doc.setTextColor(...BLACK);
  doc.text(String(letter?.director_signature_date || '______________________'), M + 15, y + 32);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(t.role, M + 3, y + 39);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(t.subRole, M + 3, y + 43);

  // ── Footer bar ────────────────────────────────────────────────────────────
  const fH = pH(doc);
  doc.setFillColor(...NAVY);
  doc.rect(0, fH - 14, W, 14, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'normal');

  const footerText     = getDocumentFooter(settings, lang);
  const isDefaultFooter = !settings?.document_footer;

  if (isDefaultFooter) {
    // Split the official footer into 2 lines
    doc.setFontSize(5.5);
    const fLines = doc.splitTextToSize(OFFICIAL_FOOTER, W - 20);
    if (fLines.length >= 2) {
      doc.text(fLines[0], W / 2, fH - 9.5, { align: 'center' });
      doc.text(fLines[1], W / 2, fH - 5,   { align: 'center' });
    } else {
      doc.setFontSize(6);
      doc.text(OFFICIAL_FOOTER, W / 2, fH - 7, { align: 'center' });
    }
  } else {
    doc.setFontSize(6.5);
    doc.text(footerText, W / 2, fH - 9.5, { align: 'center' });
    doc.setFontSize(5);
    const fLines = doc.splitTextToSize(OFFICIAL_FOOTER, W - 20);
    doc.text(fLines[0] || '', W / 2, fH - 5, { align: 'center' });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const ln  = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr  = (letter?.school_year || '').replace('-', '_');
  const pfx = lang === 'en' ? 'declaration_of_enrolment' : 'confirmacion_matricula';
  doc.save(`${pfx}_${ln}_${yr}.pdf`);
}
