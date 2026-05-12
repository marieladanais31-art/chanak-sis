import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDocumentFooter, getInstitutionFldoe, getInstitutionName, normalizeDocumentLanguage } from '@/lib/officialDocuments';
import { gradeToTranscriptLetter, TRANSCRIPT_GRADING_SCALE } from '@/lib/academicUtils';

const NAVY = [25, 61, 109];
const TEAL = [32, 178, 170];
const LIGHT_GRAY = [245, 246, 248];
const MID_GRAY = [180, 185, 195];
const DARK = [30, 35, 50];

const GRADING_SCALE = TRANSCRIPT_GRADING_SCALE.filter((grade) => grade.letter !== 'F')
  .map((grade) => ({
    range: `${grade.min} – ${grade.max}`,
    letter: grade.letter,
    label: 'ACE mastery',
  }));

function gradeToLetter(g) {
  return gradeToTranscriptLetter(g);
}

function fmt(val) {
  if (val === null || val === undefined || val === '') return '—';
  return Number(val).toFixed(2);
}

function addPageNumbers(doc, settings, lang = 'en') {
  const total = doc.internal.getNumberOfPages();
  const footer = getDocumentFooter(settings, lang);
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...MID_GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(footer, w / 2, h - 8, { align: 'center' });
    doc.text(`${lang === 'en' ? 'Page' : 'Pág.'} ${i} / ${total}`, w - 14, h - 8, { align: 'right' });
    doc.setDrawColor(...MID_GRAY);
    doc.setLineWidth(0.3);
    doc.line(14, h - 12, w - 14, h - 12);
  }
}

/**
 * @param {object} params
 * @param {object} params.student - { first_name, last_name, date_of_birth, country, grade_level, enrollment_date }
 * @param {object[]} params.years  - array of { school_year, grade_level, us_grade_level, records[] }
 *   each record: { quarter, subjects: [{ subject_name, final_grade, credits, subject_category }] }
 * @param {object} params.settings - institutional_settings row
 * @param {boolean} params.isHighSchool
 */
export function generateAnnualTranscriptPDF({ student, years, settings, isHighSchool = false, lang: requestedLang }) {
  const lang = normalizeDocumentLanguage(requestedLang || settings?.primary_language || 'es');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 0;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 42, 'F');

  // Institution name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(getInstitutionName(settings), W / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(...TEAL.map(v => Math.min(v + 100, 255)));
  doc.text(lang === 'en' ? 'Official Transcript of Grades · Academic Record' : 'Boletín Anual Oficial · Expediente Académico', W / 2, 21, { align: 'center' });

  // Issue date top right
  doc.setFontSize(7);
  doc.setTextColor(200, 210, 230);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Issued: ${today}`, W - 14, 10, { align: 'right' });
  doc.text(`FLDOE #${getInstitutionFldoe(settings)}`, W - 14, 15, { align: 'right' });

  y = 50;

  // ── Student info box ────────────────────────────────────────────────────────
  const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...DARK);
  doc.text(studentName, 14, y);
  y += 8;

  // Info row
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 90, 110);

  const dob = student.date_of_birth
    ? new Date(student.date_of_birth).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3, textColor: DARK },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    head: [['Field', 'Value', 'Field', 'Value']],
    body: [
      ['Date of birth', dob, 'Country of residence', student.country || 'Spain'],
      ['Current level', student.grade_level || '—', 'Enrollment date', student.enrollment_date || '—'],
      ['Modality', student.modality || 'Off-Campus', 'Curriculum', student.curriculum_base || 'ACE'],
    ],
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 8;

  // ── Section 1: Registration history ─────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('1. General registration information on yearly basis:', 14, y);
  y += 4;

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
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    head: [['School attended', 'Registration #', 'Level', 'School year', 'Observations']],
    body: regBody.length ? regBody : [[getInstitutionName(settings), '—', '—', '—', '']],
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Section 2: Grades by subject and year ───────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('2. Official grades by subjects and years of studies (percentage)', 14, y);
  y += 4;

  // Collect all unique subjects across all years
  const subjectSet = new Set();
  years.forEach(yr => {
    yr.records.forEach(r => {
      r.subjects.forEach(s => subjectSet.add(s.subject_name));
    });
  });
  const subjects = Array.from(subjectSet);

  // Build columns: Subject | annual avg per year | Letter / Credits
  const yearLabels = years.map(yr =>
    isHighSchool && yr.hs_year_name ? `${yr.hs_year_name} (${yr.school_year})` : yr.school_year
  );

  const gradeHead = [
    ['SUBJECT', ...yearLabels, isHighSchool ? 'Credits' : 'Avg.'],
  ];

  const gradeBody = subjects.map(subj => {
    const row = [subj];
    let totalAvg = 0;
    let countYears = 0;
    let totalCredits = 0;

    years.forEach(yr => {
      // Find this subject across Q1/Q2/Q3 of this year
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

  // General average row
  const avgRow = ['GENERAL AVERAGE'];
  years.forEach(yr => {
    const allGrades = [];
    yr.records.forEach(r => {
      r.subjects.forEach(s => {
        if (s.final_grade !== null && s.final_grade !== undefined) {
          allGrades.push(Number(s.final_grade));
        }
      });
    });
    avgRow.push(allGrades.length ? (allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(2) : '—');
  });
  if (isHighSchool) {
    avgRow.push('—');
  } else {
    const allNums = avgRow.slice(1).filter(v => v !== '—').map(Number);
    avgRow.push(allNums.length ? (allNums.reduce((a, b) => a + b, 0) / allNums.length).toFixed(2) : '—');
  }

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    head: gradeHead,
    body: gradeBody.length ? [...gradeBody, avgRow] : [avgRow],
    theme: 'grid',
    didParseCell(data) {
      if (data.row.index === gradeBody.length) {
        data.cell.styles.fillColor = [235, 240, 250];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Section 3: Grading scale ─────────────────────────────────────────────
  if (y > 220) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('3. Grading Scale', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    tableWidth: 100,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7 },
    head: [['Range', 'Letter', 'Descriptor']],
    body: GRADING_SCALE.map(g => [g.range, g.letter, g.label]),
    theme: 'grid',
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Section 4: Observations ──────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('4. Observations', 14, y);
  y += 5;

  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(14, y, W - 28, 20, 2, 2, 'F');
  y += 25;

  // ── Signature ────────────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20; }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 110);
  doc.text('I hereby affirm that this is the official transcript and academic record of the above-named student.', 14, y);
  y += 12;

  // Two signature boxes
  const sigW = (W - 42) / 2;
  doc.setDrawColor(...MID_GRAY);
  doc.setLineWidth(0.5);
  doc.line(14, y, 14 + sigW, y);
  doc.line(28 + sigW, y, 28 + sigW * 2, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('Head of School / Dirección', 14, y);
  doc.text('Registrar / Secretaría', 28 + sigW, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 110, 130);
  doc.text(getInstitutionName(settings), 14, y);
  doc.text(getInstitutionName(settings), 28 + sigW, y);

  // Page numbers / footer
  addPageNumbers(doc, settings, lang);

  const lastName = (student.last_name || 'student').replace(/\s+/g, '_');
  doc.save(`${lang === 'en' ? 'annual_report' : 'boletin_anual'}_${lastName}.pdf`);
}
