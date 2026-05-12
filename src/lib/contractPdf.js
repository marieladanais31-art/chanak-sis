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

const NAVY  = [25, 61, 109];
const TEAL  = [32, 178, 170];
const GRAY  = [100, 116, 139];
const WHITE = [255, 255, 255];
const BLACK = [30, 30, 30];

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

const I18N = {
  es: { titlePrefix: 'CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS', parties: 'PARTES CONTRATANTES', institution: 'Institución', student: 'Estudiante', year: 'Año Académico', family: 'Familia / Tutor Legal', program: 'Programa', modality: 'Modalidad', start: 'Fecha de Inicio', end: 'Fecha de Fin', issue: 'Fecha de Emisión', objective: 'OBJETO Y NATURALEZA DEL PROGRAMA', chanak: 'OBLIGACIONES DE LA INSTITUCIÓN', familyResp: 'OBLIGACIONES DE LA FAMILIA', economics: 'CONDICIONES ECONÓMICAS Y PAGOS', notes: 'LEY APLICABLE Y NOTAS', signatures: 'FIRMAS', page: 'Pág.' },
  en: { titlePrefix: 'EDUCATIONAL SERVICES AGREEMENT', parties: 'CONTRACTING PARTIES', institution: 'Institution', student: 'Student', year: 'Academic Year', family: 'Family / Legal Guardian', program: 'Program', modality: 'Modality', start: 'Start Date', end: 'End Date', issue: 'Issue Date', objective: 'PROGRAM PURPOSE AND NATURE', chanak: 'INSTITUTION RESPONSIBILITIES', familyResp: 'FAMILY RESPONSIBILITIES', economics: 'ECONOMIC TERMS AND PAYMENTS', notes: 'GOVERNING LAW AND NOTES', signatures: 'SIGNATURES', page: 'Page' },
};

function header(doc, contract, settings, lang = 'es') {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pW(doc), 38, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  addInstitutionLogo(doc, settings, 10, 5, 21, 21);
  doc.setFontSize(12);
  doc.text(getInstitutionName(settings), pW(doc) / 2, 11, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `FLDOE #${getInstitutionFldoe(settings)}`,
    pW(doc) / 2, 17, { align: 'center' }
  );
  doc.text(
    [getInstitutionAddress(settings), getInstitutionEmail(settings), settings?.website].filter(Boolean).join('  ·  '),
    pW(doc) / 2, 22, { align: 'center' }
  );
  const t = I18N[lang] || I18N.es;
  const title = `${t.titlePrefix} — ${contract?.program || contract?.modality || ''}`.trim();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(title, pW(doc) / 2, 31, { align: 'center' });
  doc.setFillColor(...TEAL);
  doc.rect(0, 37, pW(doc), 1.5, 'F');
  doc.setTextColor(...BLACK);
}

function secTitle(doc, y, txt) {
  doc.setFillColor(240, 246, 255);
  doc.rect(14, y, pW(doc) - 28, 7, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(14, y, pW(doc) - 28, 7, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text(txt, 17, y + 5);
  doc.setTextColor(...BLACK);
  return y + 11;
}

function block(doc, y, text, M = 14) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BLACK);
  const lines = doc.splitTextToSize(text, pW(doc) - M * 2);
  doc.text(lines, M, y);
  return y + lines.length * 4.5 + 3;
}

function checkBreak(doc, y, contract, settings, lang, need = 25) {
  if (y + need > pH(doc) - 20) {
    doc.addPage();
    header(doc, contract, settings, lang);
    return 46;
  }
  return y;
}

function addPageNumbers(doc, settings, lang = 'es') {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`${(I18N[lang] || I18N.es).page} ${i} / ${n}`, pW(doc) - 14, pH(doc) - 6, { align: 'right' });
    doc.setTextColor(...NAVY);
    doc.setFontSize(7);
    doc.text(getDocumentFooter(settings, lang), 14, pH(doc) - 6);
  }
}

export function generateContractPDF({ contract, student, settings, lang: requestedLang }) {
  const lang = normalizeDocumentLanguage(requestedLang || contract?.language || 'es');
  const t = I18N[lang] || I18N.es;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 14;
  header(doc, contract, settings, lang);
  let y = 46;

  // Datos de las partes
  y = secTitle(doc, y, t.parties);
  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';
  const col2 = pW(doc) / 2 + 4;

  const pairs = [
    [t.institution, getInstitutionName(settings), 'FLDOE', getInstitutionFldoe(settings)],
    [t.student, studentName, t.year, contract?.school_year || settings?.active_school_year || '—'],
    [t.family, contract?.tutor_legal || contract?.family_name || '—', t.program, contract?.program || contract?.modality || '—'],
    [t.modality, contract?.modality || '—', t.start, contract?.start_date || '—'],
    [t.end, contract?.end_date || '—', t.issue, contract?.issue_date || '—'],
  ];

  pairs.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(l1 + ':', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    const v1Lines = doc.splitTextToSize(String(v1), pW(doc) / 2 - M - 4);
    doc.text(v1Lines, M, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(l2 + ':', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(String(v2), col2, y + 4);
    y += 10;
  });
  y += 3;

  // Cláusulas
  if (contract?.academic_services) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.objective);
    y = block(doc, y, contract.academic_services);
    y += 2;
  }

  if (contract?.chanak_responsibilities) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.chanak);
    y = block(doc, y, contract.chanak_responsibilities);
    y += 2;
  }

  if (contract?.family_responsibilities) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.familyResp);
    y = block(doc, y, contract.family_responsibilities);
    y += 2;
  }

  if (contract?.economic_conditions) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.economics);
    y = block(doc, y, contract.economic_conditions);
    y += 2;
  }

  if (contract?.notes) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.notes);
    y = block(doc, y, contract.notes);
    y += 2;
  }

  // Firmas
  y = checkBreak(doc, y, contract, settings, lang, 55);
  y = secTitle(doc, y, t.signatures);
  y += 4;

  const sigW = (pW(doc) - M * 2 - 10) / 2;
  const s2X  = M + sigW + 10;

  [
    { x: M,   name: contract?.director_signature_name || settings?.director_name || '______________________', date: contract?.director_signature_date, role: 'Head of School / Dirección — Chanak' },
    { x: s2X, name: contract?.parent_signature_name   || '______________________',                           date: contract?.parent_signature_date,    role: 'Padre / Madre / Tutor Legal' },
  ].forEach(sig => {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    doc.rect(sig.x, y, sigW, 34, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Firma:', sig.x + 3, y + 11);
    doc.line(sig.x + 16, y + 11, sig.x + sigW - 3, y + 11);
    doc.text('Nombre:', sig.x + 3, y + 19);
    doc.setTextColor(...BLACK);
    doc.text(sig.name, sig.x + 19, y + 19);
    doc.setTextColor(...GRAY);
    doc.text('Fecha:', sig.x + 3, y + 26);
    doc.setTextColor(...BLACK);
    doc.text(String(sig.date || '______________________'), sig.x + 17, y + 26);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text(sig.role, sig.x + sigW / 2, y + 33, { align: 'center' });
  });

  addPageNumbers(doc, settings, lang);

  const ln = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr = (contract?.school_year || '').replace('-', '_');
  const type = (contract?.modality || 'contract').toLowerCase().replace(/\s+/g, '_');
  doc.save(`${lang === 'en' ? 'contract' : 'contrato'}_${type}_${ln}_${yr}.pdf`);
}
