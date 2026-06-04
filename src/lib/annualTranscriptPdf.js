/**
 * annualTranscriptPdf.js  v3 — Expediente Académico Oficial
 * ──────────────────────────────────────────────────
 * Official Annual Transcript  (ES | EN)
 * jsPDF + jspdf-autotable
 *
 * v3: Sin lenguaje interno ACE. Escala descriptiva bilingüe.
 *     Sección formal de certificación y firmas (Dirección + Secretaría + Sello).
 *
 * Requiere: settings = await preloadImages(rawSettings)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawOfficialHeader,
  applyOfficialFooterAllPages,
  getInstitutionFldoe,
  getInstitutionName,
  getInstitutionInfo,
  addInstitutionSeal,
  normalizeDocumentLanguage,
  PDF_NAVY,
  PDF_GRAY,
  PDF_LGRAY,
  PDF_BLACK,
  PDF_BLUE,
  PDF_BORDER,
  PDF_FOOTER_H,
  PDF_MARGIN,
} from '@/lib/officialDocuments';
import { gradeToTranscriptLetter, TRANSCRIPT_GRADING_SCALE } from '@/lib/academicUtils';

function gradeToLetter(g) { return gradeToTranscriptLetter(g); }

function fmt(val) {
  if (val === null || val === undefined || val === '') return '—';
  return Number(val).toFixed(2);
}

// ── Descriptores de calificación bilingüe (sin referencias a ACE) ───────────
const GRADE_LABELS = {
  es: {
    'A+': 'Dominio sobresaliente',
    'A':  'Dominio excelente',
    'A-': 'Dominio muy bueno',
    'B+': 'Dominio alto',
    'B':  'Dominio adecuado',
    'B-': 'Dominio satisfactorio',
    'C+': 'En progreso avanzado',
    'C':  'En progreso',
    'C-': 'Requiere seguimiento',
  },
  en: {
    'A+': 'Outstanding mastery',
    'A':  'Excellent mastery',
    'A-': 'Very good mastery',
    'B+': 'High mastery',
    'B':  'Adequate mastery',
    'B-': 'Satisfactory mastery',
    'C+': 'Advanced progress',
    'C':  'In progress',
    'C-': 'Requires follow-up',
  },
};

// Estilo común de tablas (bajo consumo de tinta)
const TABLE_STYLES = {
  styles:     { fontSize: 8, cellPadding: 2.5, lineColor: [210, 222, 234], lineWidth: 0.15 },
  headStyles: { fillColor: PDF_BLUE, textColor: PDF_NAVY, fontStyle: 'bold', fontSize: 7.5,
                lineColor: PDF_BORDER, lineWidth: 0.2 },
  alternateRowStyles: { fillColor: [248, 250, 253] },
};

/**
 * @param {object}   params.student   - { first_name, last_name, date_of_birth, country, grade_level, enrollment_date }
 * @param {object[]} params.years     - [{ school_year, grade_level, us_grade_level, records[] }]
 *   cada record: { quarter, subjects: [{ subject_name, final_grade, credits, subject_category }] }
 * @param {object}   params.settings  - institutional_settings (preloadImages aplicado)
 * @param {boolean}  params.isHighSchool
 */
export function generateAnnualTranscriptPDF({
  student, years, settings, isHighSchool = false, lang: requestedLang,
}) {
  const lang    = normalizeDocumentLanguage(requestedLang || settings?.primary_language || 'es');
  const doc     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W       = doc.internal.pageSize.getWidth();
  const PAGE_H  = () => doc.internal.pageSize.getHeight();

  // Escala de calificación con descriptores oficiales (sin ACE)
  const gradingScale = TRANSCRIPT_GRADING_SCALE
    .filter(g => g.letter !== 'F')
    .map(g => ({
      range:  `${g.min} – ${g.max}`,
      letter: g.letter,
      label:  (GRADE_LABELS[lang] || GRADE_LABELS.es)[g.letter]
              || (lang === 'en' ? 'Mastery achieved' : 'Dominio alcanzado'),
    }));

  // ── Header institucional ───────────────────────────────────────────────────
  const docTitle    = lang === 'en' ? 'OFFICIAL ACADEMIC TRANSCRIPT'   : 'EXPEDIENTE ACADÉMICO OFICIAL';
  const docSubtitle = lang === 'en' ? 'Student Academic Record'         : 'Historial de Calificaciones del Estudiante';

  let y = drawOfficialHeader(doc, settings, { docTitle, docSubtitle, lang });

  // Fecha de emisión (derecha, pequeña)
  const today = new Date().toLocaleDateString(
    lang === 'en' ? 'en-US' : 'es-ES',
    { day: '2-digit', month: 'long', year: 'numeric' },
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_GRAY);
  doc.text(`${lang === 'en' ? 'Issued' : 'Emitido'}: ${today}`, W - PDF_MARGIN, y - 6, { align: 'right' });
  doc.setTextColor(...PDF_BLACK);

  // ── Nombre del estudiante ──────────────────────────────────────────────────
  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PDF_NAVY);
  doc.text(studentName, PDF_MARGIN, y);
  y += 8;

  // ── Tabla de información del estudiante ───────────────────────────────────
  const dob = student.date_of_birth
    ? new Date(student.date_of_birth).toLocaleDateString(
        lang === 'en' ? 'en-US' : 'es-ES',
        { day: '2-digit', month: 'long', year: 'numeric' },
      )
    : '—';

  const infoHead = lang === 'en'
    ? [['Field', 'Value', 'Field', 'Value']]
    : [['Campo', 'Valor', 'Campo', 'Valor']];

  // Modalidad académica — sin referencia interna a ACE
  const modalityVal    = student.modality || 'Off-Campus';
  const programLabel   = lang === 'en'
    ? 'Individualized Academic Program'
    : 'Programa académico individualizado';
  const programKey     = lang === 'en' ? 'Academic Program'    : 'Programa Académico';
  const modalityKey    = lang === 'en' ? 'Modality'            : 'Modalidad';
  const dobKey         = lang === 'en' ? 'Date of birth'       : 'Fecha de nacimiento';
  const countryKey     = lang === 'en' ? 'Country of residence': 'País de residencia';
  const levelKey       = lang === 'en' ? 'Current level'       : 'Nivel actual';
  const enrollKey      = lang === 'en' ? 'Enrollment date'     : 'Fecha de matriculación';
  const countryVal     = student.country || (lang === 'en' ? 'Spain' : 'España');

  const infoBody = [
    [dobKey,      dob,         countryKey,   countryVal],
    [levelKey,    student.grade_level || '—', enrollKey, student.enrollment_date || '—'],
    [modalityKey, modalityVal, programKey,   programLabel],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    head:   infoHead,
    body:   infoBody,
    ...TABLE_STYLES,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 }, 2: { fontStyle: 'bold', cellWidth: 42 } },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección 1: Historial de matrícula ──────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(
    lang === 'en'
      ? '1. General registration information on yearly basis:'
      : '1. Información general de matrícula por año:',
    PDF_MARGIN, y,
  );
  y += 5;

  const regBody = years.map(yr => [
    getInstitutionName(settings),
    student.id ? student.id.slice(0, 8).toUpperCase() : '—',
    yr.hs_year_name
      ? `${yr.hs_year_name} — ${yr.us_grade_level || yr.grade_level || ''}`
      : (yr.us_grade_level || yr.grade_level || '—'),
    yr.school_year,
    '',
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    head: lang === 'en'
      ? [['School attended', 'Registration #', 'Level', 'School year', 'Observations']]
      : [['Centro educativo', 'N.º de matrícula', 'Nivel', 'Año escolar', 'Observaciones']],
    body: regBody.length ? regBody : [[getInstitutionName(settings), '—', '—', '—', '']],
    ...TABLE_STYLES,
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección 2: Calificaciones por materia y año ────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(
    lang === 'en'
      ? '2. Official grades by subjects and years of studies (percentage):'
      : '2. Calificaciones oficiales por materias y años de estudio (%):',
    PDF_MARGIN, y,
  );
  y += 5;

  const subjectSet = new Set();
  years.forEach(yr => yr.records.forEach(r => r.subjects.forEach(s => subjectSet.add(s.subject_name))));
  const subjects = Array.from(subjectSet);

  const yearLabels = years.map(yr =>
    isHighSchool && yr.hs_year_name ? `${yr.hs_year_name} (${yr.school_year})` : yr.school_year,
  );

  const gradeHead = [[
    lang === 'en' ? 'SUBJECT' : 'MATERIA',
    ...yearLabels,
    isHighSchool
      ? (lang === 'en' ? 'Credits' : 'Créditos')
      : (lang === 'en' ? 'Avg.'    : 'Prom.'),
  ]];

  const gradeBody = subjects.map(subj => {
    const row = [subj];
    let totalAvg = 0, countYears = 0, totalCredits = 0;
    years.forEach(yr => {
      const grades = [];
      let credits  = 0;
      yr.records.forEach(r => {
        const match = r.subjects.find(s => s.subject_name === subj);
        if (match && match.final_grade !== null && match.final_grade !== undefined) {
          grades.push(Number(match.final_grade));
          credits = match.credits || 0;
        }
      });
      if (grades.length > 0) {
        const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
        row.push(avg.toFixed(2));
        totalAvg    += avg;
        countYears  += 1;
        totalCredits += credits * grades.length;
      } else {
        row.push('—');
      }
    });
    if (isHighSchool) {
      row.push(totalCredits > 0 ? totalCredits.toFixed(2) : '—');
    } else {
      row.push(countYears > 0 ? (totalAvg / countYears).toFixed(2) : '—');
    }
    return row;
  });

  const avgLabel = lang === 'en' ? 'GENERAL AVERAGE' : 'PROMEDIO GENERAL';
  const avgRow   = [avgLabel];
  years.forEach(yr => {
    const allGrades = [];
    yr.records.forEach(r => r.subjects.forEach(s => {
      if (s.final_grade !== null && s.final_grade !== undefined) allGrades.push(Number(s.final_grade));
    }));
    avgRow.push(allGrades.length
      ? (allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(2)
      : '—');
  });
  if (isHighSchool) {
    avgRow.push('—');
  } else {
    const allNums = avgRow.slice(1).filter(v => v !== '—').map(Number);
    avgRow.push(allNums.length ? (allNums.reduce((a, b) => a + b, 0) / allNums.length).toFixed(2) : '—');
  }

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN, bottom: PDF_FOOTER_H + 6 },
    head:   gradeHead,
    body:   gradeBody.length ? [...gradeBody, avgRow] : [avgRow],
    ...TABLE_STYLES,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    didParseCell(data) {
      if (data.row.index === gradeBody.length) {
        data.cell.styles.fillColor = [235, 242, 252];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = PDF_NAVY;
      }
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección 3: Escala de calificación ─────────────────────────────────────
  if (y > PAGE_H() - 80) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(lang === 'en' ? '3. Grading Scale' : '3. Escala de Calificación', PDF_MARGIN, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    tableWidth: 110,
    head:   [[
      lang === 'en' ? 'Range'      : 'Rango',
      lang === 'en' ? 'Letter'     : 'Letra',
      lang === 'en' ? 'Descriptor' : 'Descripción',
    ]],
    body:   gradingScale.map(g => [g.range, g.letter, g.label]),
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 7.5, cellPadding: 2 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección 4: Observaciones ───────────────────────────────────────────────
  if (y > PAGE_H() - 40) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(lang === 'en' ? '4. Observations' : '4. Observaciones', PDF_MARGIN, y);
  y += 5;

  doc.setFillColor(...PDF_LGRAY);
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(PDF_MARGIN, y, W - PDF_MARGIN * 2, 20, 2, 2, 'FD');
  y += 26;

  // ── Sección 5: Certificación y firmas ─────────────────────────────────────
  if (y > PAGE_H() - 100) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(lang === 'en' ? '5. Certification' : '5. Certificación', PDF_MARGIN, y);
  y += 6;

  // Texto formal de certificación
  const certText = lang === 'en'
    ? 'We certify that this document corresponds to the official academic record of the student named herein, according to the academic records of Chanak International Academy for the corresponding school year.'
    : 'Certificamos que el presente documento corresponde al expediente académico oficial del estudiante indicado, según los registros académicos de Chanak International Academy para el año escolar correspondiente.';
  const certLines = doc.splitTextToSize(certText, W - PDF_MARGIN * 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 110);
  doc.text(certLines, PDF_MARGIN, y);
  y += certLines.length * 4.5 + 10;

  // Bloques de firma lado a lado
  const sigBlockW = (W - PDF_MARGIN * 2 - 16) / 2;
  const x1        = PDF_MARGIN;
  const x2        = PDF_MARGIN + sigBlockW + 16;

  const nameLabel = lang === 'en' ? 'Name'  : 'Nombre';
  const roleLabel = lang === 'en' ? 'Title' : 'Cargo';
  const dateLabel = lang === 'en' ? 'Date'  : 'Fecha';

  // Etiquetas de cada bloque de firma
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_NAVY);
  doc.text(lang === 'en' ? 'Director Signature:'          : 'Firma de Dirección:',   x1, y);
  doc.text(lang === 'en' ? 'Registrar / Academic Office:' : 'Firma de Secretaría:',  x2, y);
  y += 14;

  // Líneas de firma
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.4);
  doc.line(x1, y, x1 + sigBlockW, y);
  doc.line(x2, y, x2 + sigBlockW, y);
  y += 4;

  // Director(a) — nombre, cargo, fecha
  const instInfo = getInstitutionInfo(settings);
  const dirName  = instInfo.directorName || 'Mariela Andrade';
  const dirTitle = lang === 'en' ? 'Academic Director' : 'Directora Académica';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(`${nameLabel}: ${dirName}`,  x1, y);
  doc.text(`${roleLabel}: ${dirTitle}`, x1, y + 4.5);
  doc.text(`${dateLabel}: ${today}`,    x1, y + 9);

  // Secretaría / Academic Office — nombre en blanco, cargo, fecha
  const regTitle = lang === 'en' ? 'Academic Office' : 'Secretaría Académica';
  doc.text(`${nameLabel}: ______________________`, x2, y);
  doc.text(`${roleLabel}: ${regTitle}`,            x2, y + 4.5);
  doc.text(`${dateLabel}: ${today}`,               x2, y + 9);
  y += 18;

  // Sello institucional
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_NAVY);
  doc.text(lang === 'en' ? 'Institutional Seal:' : 'Sello institucional:', x1, y);
  y += 5;
  addInstitutionSeal(doc, settings, x1, y, 24, 24);

  // ── Footer en todas las páginas ───────────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, {
    pageLabel: lang === 'en' ? 'Page' : 'Pág.',
  });

  // ── Guardar ───────────────────────────────────────────────────────────────
  const lastName = (student.last_name || 'student').replace(/\s+/g, '_');
  const yearStr  = years.length > 0 ? years[0].school_year.replace(/\//g, '-') : '';
  doc.save(
    lang === 'en'
      ? `official_transcript_${lastName}_${yearStr}_en.pdf`
      : `expediente_academico_${lastName}_${yearStr}_es.pdf`,
  );
}
