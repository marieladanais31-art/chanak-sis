/**
 * annualTranscriptPdf.js  v2 — Diseño de baja tinta
 * ──────────────────────────────────────────────────
 * Boletín Anual / Official Annual Transcript  (ES | EN)
 * jsPDF + jspdf-autotable
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

const GRADING_SCALE = TRANSCRIPT_GRADING_SCALE
  .filter(g => g.letter !== 'F')
  .map(g => ({ range: `${g.min} – ${g.max}`, letter: g.letter, label: 'ACE mastery' }));

function gradeToLetter(g) { return gradeToTranscriptLetter(g); }

function fmt(val) {
  if (val === null || val === undefined || val === '') return '—';
  return Number(val).toFixed(2);
}

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
  const lang = normalizeDocumentLanguage(requestedLang || settings?.primary_language || 'es');
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W    = doc.internal.pageSize.getWidth();

  // ── Header institucional (bajo consumo de tinta) ───────────────────────────
  const docTitle = lang === 'en'
    ? 'OFFICIAL ACADEMIC TRANSCRIPT'
    : 'EXPEDIENTE ACADÉMICO OFICIAL';
  const docSubtitle = lang === 'en'
    ? 'Official Transcript of Grades · Academic Record'
    : 'Historial Oficial de Calificaciones · Expediente Académico';

  let y = drawOfficialHeader(doc, settings, { docTitle, docSubtitle, lang });

  // Fecha de emisión (derecha, pequeña)
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
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
    ? new Date(student.date_of_birth).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

  const infoHead = lang === 'en'
    ? [['Field', 'Value', 'Field', 'Value']]
    : [['Campo', 'Valor', 'Campo', 'Valor']];

  const infoBody = lang === 'en' ? [
    ['Date of birth', dob, 'Country of residence', student.country || 'Spain'],
    ['Current level', student.grade_level || '—', 'Enrollment date', student.enrollment_date || '—'],
    ['Modality', student.modality || 'Off-Campus', 'Curriculum', student.curriculum_base || 'ACE'],
  ] : [
    ['Fecha de nacimiento', dob, 'País de residencia', student.country || 'España'],
    ['Nivel actual', student.grade_level || '—', 'Fecha de matriculación', student.enrollment_date || '—'],
    ['Modalidad', student.modality || 'Off-Campus', 'Currículo', student.curriculum_base || 'ACE'],
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
  const sec1Label = lang === 'en'
    ? '1. General registration information on yearly basis:'
    : '1. Información general de matrícula por año:';
  doc.text(sec1Label, PDF_MARGIN, y);
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

  const regHead = lang === 'en'
    ? [['School attended', 'Registration #', 'Level', 'School year', 'Observations']]
    : [['Centro educativo', 'N.º de matrícula', 'Nivel', 'Año escolar', 'Observaciones']];

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    head:   regHead,
    body:   regBody.length ? regBody : [[getInstitutionName(settings), '—', '—', '—', '']],
    ...TABLE_STYLES,
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección 2: Calificaciones por materia y año ────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_NAVY);
  const sec2Label = lang === 'en'
    ? '2. Official grades by subjects and years of studies (percentage):'
    : '2. Calificaciones oficiales por materias y años de estudio (%):';
  doc.text(sec2Label, PDF_MARGIN, y);
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
    isHighSchool ? (lang === 'en' ? 'Credits' : 'Créditos') : (lang === 'en' ? 'Avg.' : 'Prom.'),
  ]];

  const gradeBody = subjects.map(subj => {
    const row = [subj];
    let totalAvg = 0, countYears = 0, totalCredits = 0;

    years.forEach(yr => {
      const grades = [];
      let credits = 0;
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
        totalAvg += avg;
        countYears++;
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
      : '—',
    );
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
        data.cell.styles.fillColor  = [235, 242, 252];
        data.cell.styles.fontStyle  = 'bold';
        data.cell.styles.textColor  = PDF_NAVY;
      }
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección 3: Escala de calificación ─────────────────────────────────────
  const H = doc.internal.pageSize.getHeight();
  if (y > H - 80) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(lang === 'en' ? '3. Grading Scale' : '3. Escala de Calificación', PDF_MARGIN, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: PDF_MARGIN, right: PDF_MARGIN },
    tableWidth: 110,
    head:   [[lang === 'en' ? 'Range' : 'Rango', lang === 'en' ? 'Letter' : 'Letra', lang === 'en' ? 'Descriptor' : 'Descripción']],
    body:   GRADING_SCALE.map(g => [g.range, g.letter, g.label]),
    ...TABLE_STYLES,
    styles: { ...TABLE_STYLES.styles, fontSize: 7.5, cellPadding: 2 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección 4: Observaciones (caja vacía para rellenar) ────────────────────
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

  // ── Bloque de firma ────────────────────────────────────────────────────────
  const newH = doc.internal.pageSize.getHeight();
  if (y > newH - 50) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 110);
  const affirmText = lang === 'en'
    ? 'I hereby affirm that this is the official transcript and academic record of the above-named student.'
    : 'Certifico que el presente es el expediente académico oficial del estudiante indicado.';
  doc.text(affirmText, PDF_MARGIN, y);
  y += 12;

  // Dos líneas de firma
  const sigW = (W - 42) / 2;
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.4);
  doc.line(PDF_MARGIN, y, PDF_MARGIN + sigW, y);
  doc.line(PDF_MARGIN + sigW + 14, y, PDF_MARGIN + sigW * 2 + 14, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_NAVY);
  const role1 = lang === 'en' ? 'Head of School / Director' : 'Dirección';
  const role2 = lang === 'en' ? 'Registrar / Secretary' : 'Secretaría';
  doc.text(role1, PDF_MARGIN, y);
  doc.text(role2, PDF_MARGIN + sigW + 14, y);
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_GRAY);
  doc.text(getInstitutionName(settings), PDF_MARGIN, y);
  doc.text(getInstitutionName(settings), PDF_MARGIN + sigW + 14, y);

  // ── Footer en todas las páginas ───────────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, {
    pageLabel: lang === 'en' ? 'Page' : 'Pág.',
  });

  // ── Guardar ───────────────────────────────────────────────────────────────
  const lastName = (student.last_name || 'student').replace(/\s+/g, '_');
  doc.save(`${lang === 'en' ? 'annual_report' : 'boletin_anual'}_${lastName}.pdf`);
}
