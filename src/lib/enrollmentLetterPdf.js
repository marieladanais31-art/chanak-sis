import jsPDF from 'jspdf';
import {
  addInstitutionLogo,
  getDocumentFooter,
  getInstitutionAddress,
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

const NAVY  = [25, 61, 109];
const TEAL  = [32, 178, 170];
const GRAY  = [100, 116, 139];
const WHITE = [255, 255, 255];
const BLACK = [30, 30, 30];
const LGRAY = [248, 250, 252];

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

function block(doc, y, text, M = 20, size = 10) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  doc.setTextColor(...BLACK);
  const lines = doc.splitTextToSize(text, pW(doc) - M * 2);
  doc.text(lines, M, y);
  return y + lines.length * (size * 0.52) + 4;
}

const I18N = {
  es: {
    title:       'CONFIRMACIÓN DE MATRÍCULA',
    toWhom:      'A QUIEN CORRESPONDA',
    student:     'Nombre completo',
    year:        'Año Académico',
    program:     'Programa',
    gradeES:     'Nivel (ES)',
    gradeUS:     'Nivel (US)',
    startDate:   'Fecha de Inicio',
    studentId:   'ID de Estudiante',
    status:      'Estado',
    confirmed:   'CONFIRMADO',
    signature:   'Firma',
    name:        'Nombre',
    date:        'Fecha',
    role:        'Chief Administrative Officer',
    subRole:     'Chanak International Academy',
  },
  en: {
    title:       'DECLARATION OF ENROLMENT',
    toWhom:      'TO WHOM IT MAY CONCERN',
    student:     'Full Name',
    year:        'School Year',
    program:     'Programme',
    gradeES:     'Grade Level (ES)',
    gradeUS:     'Grade Level (US)',
    startDate:   'Start Date',
    studentId:   'Student ID',
    status:      'Status',
    confirmed:   'CONFIRMED',
    signature:   'Signature',
    name:        'Name',
    date:        'Date',
    role:        'Chief Administrative Officer',
    subRole:     'Chanak International Academy',
  },
};

const OFFICIAL_FOOTER = 'Chanak TrainUp Education, Inc. d/b/a Chanak International Academy · 4883 NW 107th Path, Doral, FL 33178, USA · administration@chanakacademy.org · chanakacademy.org · FLDOE #134620 · EIN 36-5154011 · 501(c)(3) Nonprofit';

export function generateEnrollmentLetterPDF({ letter, student, settings, lang: requestedLang }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M   = 20;
  const W   = pW(doc);
  const lang = normalizeDocumentLanguage(requestedLang || letter?.letter_language || 'es');
  const t    = I18N[lang] || I18N.es;
  const institutionName = getInstitutionName(settings);
  const fldoe = getInstitutionFldoe(settings);
  const gender = student?.gender || '';

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 48, 'F');
  doc.setFillColor(...TEAL);
  doc.rect(0, 47, W, 1.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  addInstitutionLogo(doc, settings, 10, 5, 22, 22);

  doc.setFontSize(14);
  doc.text('CHANAK INTERNATIONAL ACADEMY', W / 2, 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Florida Private School · FLDOE #${fldoe}`, W / 2, 18, { align: 'center' });
  doc.text('MSA-CESS Official Candidate for Accreditation', W / 2, 22.5, { align: 'center' });
  doc.text(`501(c)(3) Nonprofit · EIN 36-5154011`, W / 2, 27, { align: 'center' });

  const contactLine = [getInstitutionEmail(settings) || 'administration@chanakacademy.org', settings?.website || 'chanakacademy.org'].filter(Boolean).join('  ·  ');
  doc.text(contactLine, W / 2, 31.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(t.title, W / 2, 41, { align: 'center' });
  doc.setTextColor(...BLACK);

  let y = 58;

  // ── Ref + Date ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  if (letter?.letter_ref) {
    doc.text(`Ref: ${letter.letter_ref}`, M, y);
  }
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${letter?.issue_date || new Date().toISOString().split('T')[0]}`, W - M, y, { align: 'right' });
  doc.setTextColor(...BLACK);
  y += 10;

  // ── Salutation ────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(t.toWhom, M, y);
  y += 10;

  // ── Body text ─────────────────────────────────────────────────────────────
  const studentName = student
    ? `${student.first_name || ''} ${student.last_name || ''}`.trim()
    : '—';

  let bodyText = letter?.confirmation_text || letter?.body_text || letter?.content || '';

  if (!bodyText) {
    if (lang === 'en') {
      bodyText = `By means of this letter, Chanak International Academy, an American Christian private educational institution registered with the Florida Department of Education of the United States of America, hereby confirms that ${studentName} is an active and enrolled student in our international academic programme.`;
    } else {
      const articuloNombre = `${getGenderedEstudiante(gender).charAt(0).toUpperCase() + getGenderedEstudiante(gender).slice(1)} ${studentName}`;
      const alumnoActivo = getGenderedAlumnoActivo(gender);
      const matriculado = getGenderedMatriculado(gender);
      bodyText = `Por medio de la presente, Chanak International Academy, institución educativa privada cristiana americana registrada ante el Florida Department of Education de los Estados Unidos de América, confirma que ${articuloNombre} figura como ${alumnoActivo} y ${matriculado} en nuestro programa académico internacional.`;
    }
  }

  y = block(doc, y, bodyText, M, 10);
  y += 4;

  // ── Párrafo institucional ──────────────────────────────────────────────────
  let institutionalParagraph = letter?.institutional_paragraph || '';
  if (!institutionalParagraph) {
    const inscrito = getGenderedInscrito(gender);
    const articuloCapitalized = getGenderedEstudiante(gender).charAt(0).toUpperCase() + getGenderedEstudiante(gender).slice(1);
    if (lang === 'en') {
      institutionalParagraph = `The student is enrolled in the Off-Campus Programme of Chanak International Academy, an international structured educational programme offering rigorous academic training based on the Mastery Learning pedagogical model. The programme includes an Individualized Educational Plan (IEP), personalised academic follow-up with an assigned mentor, and access to the Chanak SIS and LMS institutional platforms.`;
    } else {
      institutionalParagraph = `${articuloCapitalized} está ${inscrito}/a en el Programa Off-Campus de Chanak International Academy, un programa educativo internacional de carácter estructurado que ofrece formación académica rigurosa basada en el modelo pedagógico Mastery Learning. El programa incluye un Plan Educativo Individualizado (PEI), seguimiento académico personalizado con mentor asignado, y acceso a las plataformas institucionales SIS y LMS de Chanak.`;
    }
  }

  y = block(doc, y, institutionalParagraph, M, 9.5);
  y += 6;

  // ── Student data table ────────────────────────────────────────────────────
  const tableH = 58;
  doc.setFillColor(...LGRAY);
  doc.roundedRect(M, y, W - M * 2, tableH, 3, 3, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, W - M * 2, tableH, 3, 3, 'S');

  const col2 = W / 2 + 4;

  // Build rows WITHOUT modality
  const studentIdValue = student?.student_id || student?.id_document_number || (letter?.student_id ? String(letter.student_id).substring(0, 8) : '—');
  const rows = [
    [t.student,    studentName,                     t.year,       letter?.school_year  || '—'],
    [t.program,    letter?.program   || '—',         t.gradeES,    letter?.grade_level || '—'],
    [t.gradeUS,    letter?.us_grade_level || '—',    t.startDate,  letter?.start_date || '—'],
    [t.studentId,  studentIdValue,                  t.status,     t.confirmed],
  ];

  let ry = y + 7;
  rows.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(l1 + ':', M + 4, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const isConfirmed1 = v1 === t.confirmed;
    doc.setTextColor(isConfirmed1 ? 20 : 30, isConfirmed1 ? 120 : 30, isConfirmed1 ? 60 : 30);
    doc.text(String(v1 || '—'), M + 4, ry + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(l2 + ':', col2, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const isConfirmed2 = v2 === t.confirmed;
    doc.setTextColor(isConfirmed2 ? 20 : 30, isConfirmed2 ? 120 : 30, isConfirmed2 ? 60 : 30);
    doc.text(String(v2 || '—'), col2, ry + 4.5);
    ry += 13;
  });

  y += tableH + 4;

  // ── Additional notes ──────────────────────────────────────────────────────
  if (letter?.notes) {
    y += 2;
    y = block(doc, y, letter.notes, M, 9);
  }

  // ── Signature ─────────────────────────────────────────────────────────────
  y = Math.max(y + 10, pH(doc) - 80);
  const sigW = 95;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(M, y, sigW, 38, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`${t.signature}:`, M + 3, y + 10);
  doc.line(M + 20, y + 10, M + sigW - 3, y + 10);
  doc.text(`${t.name}:`, M + 3, y + 19);
  doc.setTextColor(...BLACK);
  const dirName = letter?.director_signature_name || settings?.director_name || 'Mariela Andrade';
  doc.text(dirName, M + 20, y + 19);
  doc.setTextColor(...GRAY);
  doc.text(`${t.date}:`, M + 3, y + 26);
  doc.setTextColor(...BLACK);
  doc.text(String(letter?.director_signature_date || '______________________'), M + 20, y + 26);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(t.role, M + 3, y + 33);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(t.subRole, M + 3, y + 37);
  doc.text(`FLDOE #${fldoe} · EIN 36-5154011`, M + 3, y + 41);
  doc.text('administration@chanakacademy.org · chanakacademy.org', M + 3, y + 45);

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, pH(doc) - 14, W, 14, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  // Use custom footer or the official standard footer
  const footerText = getDocumentFooter(settings, lang);
  const isDefaultFooter = !settings?.document_footer;
  doc.text(
    isDefaultFooter ? OFFICIAL_FOOTER : footerText,
    W / 2,
    pH(doc) - 7,
    { align: 'center' }
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  if (!isDefaultFooter) {
    doc.text(OFFICIAL_FOOTER, W / 2, pH(doc) - 4, { align: 'center' });
  }

  const ln   = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr   = (letter?.school_year || '').replace('-', '_');
  const pfx  = lang === 'en' ? 'declaration_of_enrolment' : 'confirmacion_matricula';
  doc.save(`${pfx}_${ln}_${yr}.pdf`);
}
