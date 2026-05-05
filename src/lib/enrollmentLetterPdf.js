import jsPDF from 'jspdf';

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
    student:     'Estudiante',
    year:        'Año Académico',
    program:     'Programa',
    modality:    'Modalidad',
    gradeES:     'Nivel (ES)',
    gradeUS:     'Nivel (US)',
    startDate:   'Fecha de Inicio',
    status:      'Estado',
    confirmed:   'CONFIRMADO',
    signature:   'Firma',
    name:        'Nombre',
    date:        'Fecha',
    role:        'Head of School / Dirección',
    footer:      'Chanak International Academy · Documento Oficial · FLDOE #134620',
    legalFooter: 'CHANAK TRAINUP EDUCATION INC · EIN 36-5154011 · 7901 4th St N Ste 300, St. Petersburg FL 33702',
  },
  en: {
    title:       'DECLARATION OF ENROLMENT',
    toWhom:      'TO WHOM IT MAY CONCERN',
    student:     'Student',
    year:        'Academic Year',
    program:     'Programme',
    modality:    'Modality',
    gradeES:     'Grade (Local)',
    gradeUS:     'Grade (US)',
    startDate:   'Start Date',
    status:      'Status',
    confirmed:   'CONFIRMED',
    signature:   'Signature',
    name:        'Name',
    date:        'Date',
    role:        'Head of School',
    footer:      'Chanak International Academy · Official Document · FLDOE #134620',
    legalFooter: 'CHANAK TRAINUP EDUCATION INC · EIN 36-5154011 · 7901 4th St N Ste 300, St. Petersburg FL 33702',
  },
};

export function generateEnrollmentLetterPDF({ letter, student, settings }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M   = 20;
  const W   = pW(doc);
  const lang = letter?.letter_language || 'es';
  const t    = I18N[lang] || I18N.es;

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 40, 'F');
  doc.setFillColor(...TEAL);
  doc.rect(0, 39, W, 1.5, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CHANAK INTERNATIONAL ACADEMY', W / 2, 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `FLDOE #${settings?.fldoe_registration || '134620'}  ·  offcampus@chanakacademy.org  ·  www.chanakacademy.org`,
    W / 2, 19, { align: 'center' }
  );
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(t.title, W / 2, 31, { align: 'center' });
  doc.setTextColor(...BLACK);

  let y = 50;

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

  const bodyText = letter?.confirmation_text ||
    (lang === 'en'
      ? `This letter confirms that the following student is duly enrolled and registered with Chanak International Academy for the academic year ${letter?.school_year || '—'}. The student follows an Individualized Educational Plan (IEP) based on the Accelerated Christian Education (A.C.E.) curriculum, delivered through our structured distance learning model. Chanak International Academy assumes academic oversight and responsibility for the delivery, supervision, and evaluation of each student's educational programme in accordance with institutional policies. This confirmation is issued upon request for official administrative purposes.`
      : `Esta carta confirma que el/la siguiente estudiante está debidamente inscrito/a y registrado/a en Chanak International Academy para el año académico ${letter?.school_year || '—'}. El estudiante sigue un Plan Educativo Individualizado (PEI) basado en el currículo A.C.E. (Accelerated Christian Education), impartido mediante nuestro modelo estructurado de aprendizaje a distancia. Chanak International Academy asume la supervisión académica y la responsabilidad de la entrega, supervisión y evaluación del programa educativo de cada estudiante, conforme a las políticas institucionales. Esta confirmación se emite a petición de la familia para fines administrativos oficiales.`
    );

  y = block(doc, y, bodyText, M, 10);
  y += 4;

  // ── Student data table ────────────────────────────────────────────────────
  doc.setFillColor(...LGRAY);
  doc.roundedRect(M, y, W - M * 2, 58, 3, 3, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, W - M * 2, 58, 3, 3, 'S');

  const col2 = W / 2 + 4;
  const rows = [
    [t.student,   studentName,                    t.year,      letter?.school_year  || '—'],
    [t.program,   letter?.program   || '—',        t.modality,  letter?.modality     || '—'],
    [t.gradeES,   letter?.grade_level || '—',      t.gradeUS,   letter?.us_grade_level || '—'],
    [t.startDate, letter?.start_date || '—',       t.status,    t.confirmed],
  ];

  let ry = y + 7;
  rows.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(l1 + ':', M + 4, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(v1 === t.confirmed ? 20 : 30, v1 === t.confirmed ? 120 : 30, v1 === t.confirmed ? 60 : 30);
    doc.text(String(v1), M + 4, ry + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(l2 + ':', col2, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(v2 === t.confirmed ? 20 : 30, v2 === t.confirmed ? 120 : 30, v2 === t.confirmed ? 60 : 30);
    doc.text(String(v2), col2, ry + 4.5);
    ry += 13;
  });

  y += 62;

  // ── Additional notes ──────────────────────────────────────────────────────
  if (letter?.notes) {
    y += 4;
    y = block(doc, y, letter.notes, M, 9);
  }

  // ── Signature ─────────────────────────────────────────────────────────────
  y = Math.max(y + 10, pH(doc) - 75);
  const sigW = 90;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(M, y, sigW, 32, 'S');
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
  doc.text(t.role, M + sigW / 2, y + 31, { align: 'center' });

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, pH(doc) - 14, W, 14, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(t.legalFooter, W / 2, pH(doc) - 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(t.footer, W / 2, pH(doc) - 4, { align: 'center' });

  const ln   = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr   = (letter?.school_year || '').replace('-', '_');
  const pfx  = lang === 'en' ? 'declaration_of_enrolment' : 'confirmacion_matricula';
  doc.save(`${pfx}_${ln}_${yr}.pdf`);
}
