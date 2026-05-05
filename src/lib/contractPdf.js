/**
 * contractPdf.js
 * Genera el PDF del contrato de matrícula/servicios.
 * PENDIENTE EDGE FUNCTION: firma digital criptográfica.
 */

import jsPDF from 'jspdf';

const NAVY  = [25, 61, 109];
const TEAL  = [32, 178, 170];
const LGRAY = [241, 245, 249];
const GRAY  = [100, 116, 139];
const WHITE = [255, 255, 255];
const BLACK = [30, 30, 30];

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

function header(doc, settings) {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pW(doc), 32, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('CHANAK INTERNATIONAL ACADEMY', pW(doc) / 2, 12, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`FLDOE #${settings?.fldoe_registration || '134620'}  ·  ${settings?.website || 'www.chanakacademy.org'}`, pW(doc) / 2, 19, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTRATO DE MATRÍCULA Y SERVICIOS EDUCATIVOS', pW(doc) / 2, 28, { align: 'center' });
  doc.setTextColor(...BLACK);
}

function secTitle(doc, y, txt) {
  doc.setFillColor(...TEAL);
  doc.rect(14, y, pW(doc) - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text(txt.toUpperCase(), 17, y + 5);
  doc.setTextColor(...BLACK);
  return y + 11;
}

function block(doc, y, text, M = 14) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, pW(doc) - M * 2);
  doc.text(lines, M, y);
  return y + lines.length * 4.5 + 3;
}

function checkBreak(doc, y, settings, need = 25) {
  if (y + need > pH(doc) - 20) {
    doc.addPage();
    header(doc, settings);
    return 38;
  }
  return y;
}

function addPages(doc) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`Pág. ${i} / ${n}`, pW(doc) - 14, pH(doc) - 6, { align: 'right' });
    doc.setTextColor(...NAVY);
    doc.setFontSize(7);
    doc.text('Chanak International Academy · Contrato Confidencial', 14, pH(doc) - 6);
  }
}

/**
 * @param {{ contract, student, settings }}
 *   contract — fila de enrollment_contracts
 *   student  — { first_name, last_name }
 *   settings — fila de institutional_settings
 */
export function generateContractPDF({ contract, student, settings }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 14;
  header(doc, settings);
  let y = 40;

  // Datos del contrato
  y = secTitle(doc, y, 'Datos del Contrato');

  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';
  const pairs = [
    ['Estudiante', studentName, 'Año Académico', contract?.school_year || '—'],
    ['Familia / Tutor Legal', contract?.family_name || '—', 'Programa', contract?.program || '—'],
    ['Modalidad', contract?.modality || '—', 'Fecha de Inicio', contract?.start_date || '—'],
    ['Fecha de Fin', contract?.end_date || '—', 'Fecha de Emisión', contract?.issue_date || '—'],
  ];

  const col2 = pW(doc) / 2 + 4;
  pairs.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(l1 + ':', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(String(v1), M, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(l2 + ':', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(String(v2), col2, y + 4);
    y += 9;
  });
  y += 4;

  // Servicios académicos
  y = checkBreak(doc, y, settings);
  y = secTitle(doc, y, '1. Servicios Académicos Contratados');
  y = block(doc, y, contract?.academic_services || 'Programa de educación individualizada bajo el currículo A.C.E. con seguimiento de tutor certificado.');
  y = checkBreak(doc, y, settings);

  // Condiciones económicas
  y = secTitle(doc, y, '2. Condiciones Económicas');
  y = block(doc, y, contract?.economic_conditions || 'Las condiciones económicas serán establecidas según el plan de pago acordado entre la familia y Chanak International Academy.');
  y = checkBreak(doc, y, settings);

  // Responsabilidades de la familia
  y = secTitle(doc, y, '3. Responsabilidades de la Familia');
  const familyDefault = '• Garantizar el espacio y tiempo de estudio del estudiante.\n• Supervisar el avance de PACEs según la proyección acordada.\n• Comunicar oportunamente cualquier situación que afecte el desempeño académico.\n• Cumplir con los compromisos de pago en las fechas establecidas.';
  y = block(doc, y, contract?.family_responsibilities || familyDefault);
  y = checkBreak(doc, y, settings);

  // Responsabilidades de Chanak
  y = secTitle(doc, y, '4. Responsabilidades de Chanak International Academy');
  const chanakDefault = '• Proporcionar el material curricular A.C.E. correspondiente al nivel del estudiante.\n• Asignar un tutor certificado para el acompañamiento académico.\n• Emitir reportes de progreso trimestrales.\n• Mantener confidencialidad de los datos del estudiante y la familia.';
  y = block(doc, y, contract?.chanak_responsibilities || chanakDefault);
  y = checkBreak(doc, y, settings);

  // Notas adicionales
  if (contract?.notes) {
    y = secTitle(doc, y, '5. Notas y Acuerdos Adicionales');
    y = block(doc, y, contract.notes);
    y = checkBreak(doc, y, settings);
  }

  // Firmas
  y = checkBreak(doc, y, settings, 50);
  y = secTitle(doc, y, 'Firmas');
  y += 4;

  const sigW = (pW(doc) - M * 2 - 10) / 2;
  const s2X  = M + sigW + 10;

  // Director
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(M, y, sigW, 30, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Firma:', M + 3, y + 10);
  doc.line(M + 15, y + 10, M + sigW - 3, y + 10);
  doc.text('Nombre:', M + 3, y + 18);
  doc.setTextColor(...BLACK);
  doc.text(contract?.director_signature_name || settings?.director_name || '______________________', M + 18, y + 18);
  doc.setTextColor(...GRAY);
  doc.text('Fecha:', M + 3, y + 24);
  doc.setTextColor(...BLACK);
  doc.text(String(contract?.director_signature_date || '______________________'), M + 18, y + 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('Head of School / Dirección', M + sigW / 2, y + 29, { align: 'center' });

  // Padre/Tutor
  doc.setTextColor(...BLACK);
  doc.setDrawColor(...NAVY);
  doc.rect(s2X, y, sigW, 30, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Firma:', s2X + 3, y + 10);
  doc.line(s2X + 15, y + 10, s2X + sigW - 3, y + 10);
  doc.text('Nombre:', s2X + 3, y + 18);
  doc.setTextColor(...BLACK);
  doc.text(contract?.parent_signature_name || '______________________', s2X + 18, y + 18);
  doc.setTextColor(...GRAY);
  doc.text('Fecha:', s2X + 3, y + 24);
  doc.setTextColor(...BLACK);
  doc.text(String(contract?.parent_signature_date || '______________________'), s2X + 18, y + 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('Padre / Madre / Tutor Legal', s2X + sigW / 2, y + 29, { align: 'center' });

  addPages(doc);

  const ln = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr = (contract?.school_year || '').replace('-', '_');
  doc.save(`contrato_${ln}_${yr}.pdf`);
}
