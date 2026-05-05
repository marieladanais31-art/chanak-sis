import jsPDF from 'jspdf';

const NAVY  = [25, 61, 109];
const TEAL  = [32, 178, 170];
const GRAY  = [100, 116, 139];
const WHITE = [255, 255, 255];
const BLACK = [30, 30, 30];

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

function header(doc, contract, settings) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pW(doc), 38, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CHANAK INTERNATIONAL ACADEMY', pW(doc) / 2, 11, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `FLDOE #${settings?.fldoe_registration || '134620'}  ·  CHANAK TRAINUP EDUCATION INC  ·  EIN 36-5154011`,
    pW(doc) / 2, 17, { align: 'center' }
  );
  doc.text(
    '7901 4th St N Ste 300, St. Petersburg FL 33702  ·  offcampus@chanakacademy.org',
    pW(doc) / 2, 22, { align: 'center' }
  );
  const title = contract?.modality === 'Dual Diploma'
    ? 'CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS — Programa Dual Diploma & Life Leadership'
    : 'CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS — Programa Off Campus';
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

function checkBreak(doc, y, contract, settings, need = 25) {
  if (y + need > pH(doc) - 20) {
    doc.addPage();
    header(doc, contract, settings);
    return 46;
  }
  return y;
}

function addPageNumbers(doc) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`Pág. ${i} / ${n}`, pW(doc) - 14, pH(doc) - 6, { align: 'right' });
    doc.setTextColor(...NAVY);
    doc.setFontSize(7);
    doc.text('Chanak International Academy · Contrato Confidencial · FLDOE #134620', 14, pH(doc) - 6);
  }
}

export function generateContractPDF({ contract, student, settings }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 14;
  header(doc, contract, settings);
  let y = 46;

  // Datos de las partes
  y = secTitle(doc, y, 'PARTES CONTRATANTES');
  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';
  const col2 = pW(doc) / 2 + 4;

  const pairs = [
    ['Institución', 'CHANAK TRAINUP EDUCATION INC', 'EIN', '36-5154011'],
    ['Estudiante', studentName, 'Año Académico', contract?.school_year || '—'],
    ['Familia / Tutor Legal', contract?.tutor_legal || contract?.family_name || '—', 'Programa', contract?.program || contract?.modality || '—'],
    ['Modalidad', contract?.modality || '—', 'Fecha de Inicio', contract?.start_date || '—'],
    ['Fecha de Fin', contract?.end_date || '—', 'Fecha de Emisión', contract?.issue_date || '—'],
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
    y = checkBreak(doc, y, contract, settings);
    y = secTitle(doc, y, 'OBJETO Y NATURALEZA DEL PROGRAMA');
    y = block(doc, y, contract.academic_services);
    y += 2;
  }

  if (contract?.chanak_responsibilities) {
    y = checkBreak(doc, y, contract, settings);
    y = secTitle(doc, y, 'OBLIGACIONES DE CHANAK INTERNATIONAL ACADEMY');
    y = block(doc, y, contract.chanak_responsibilities);
    y += 2;
  }

  if (contract?.family_responsibilities) {
    y = checkBreak(doc, y, contract, settings);
    y = secTitle(doc, y, 'OBLIGACIONES DE LA FAMILIA');
    y = block(doc, y, contract.family_responsibilities);
    y += 2;
  }

  if (contract?.economic_conditions) {
    y = checkBreak(doc, y, contract, settings);
    y = secTitle(doc, y, 'CONDICIONES ECONÓMICAS Y PAGOS');
    y = block(doc, y, contract.economic_conditions);
    y += 2;
  }

  if (contract?.notes) {
    y = checkBreak(doc, y, contract, settings);
    y = secTitle(doc, y, 'LEY APLICABLE Y ANEXO INFORMATIVO');
    y = block(doc, y, contract.notes);
    y += 2;
  }

  // Firmas
  y = checkBreak(doc, y, contract, settings, 55);
  y = secTitle(doc, y, 'FIRMAS');
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

  addPageNumbers(doc);

  const ln = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr = (contract?.school_year || '').replace('-', '_');
  const type = contract?.modality === 'Dual Diploma' ? 'dual' : 'offcampus';
  doc.save(`contrato_${type}_${ln}_${yr}.pdf`);
}
