/**
 * enrollmentLetterPdf.js
 * Genera la carta de confirmación de matrícula en PDF.
 * PENDIENTE EDGE FUNCTION: firma digital criptográfica.
 */

import jsPDF from 'jspdf';

const NAVY  = [25, 61, 109];
const TEAL  = [32, 178, 170];
const GRAY  = [100, 116, 139];
const WHITE = [255, 255, 255];
const BLACK = [30, 30, 30];

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

function block(doc, y, text, M = 20) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, pW(doc) - M * 2);
  doc.text(lines, M, y);
  return y + lines.length * 5.5 + 4;
}

/**
 * @param {{ letter, student, settings }}
 *   letter   — fila de enrollment_letters
 *   student  — { first_name, last_name }
 *   settings — fila de institutional_settings
 */
export function generateEnrollmentLetterPDF({ letter, student, settings }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M   = 20;
  const W   = pW(doc);

  // ── Encabezado institucional ─────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 36, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CHANAK INTERNATIONAL ACADEMY', W / 2, 14, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`FLDOE #${settings?.fldoe_registration || '134620'}  ·  ${settings?.website || 'www.chanakacademy.org'}`, W / 2, 22, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CARTA DE CONFIRMACIÓN DE MATRÍCULA', W / 2, 31, { align: 'center' });
  doc.setTextColor(...BLACK);

  let y = 48;

  // Fecha de emisión
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Fecha de emisión: ${letter?.issue_date || new Date().toISOString().split('T')[0]}`, W - M, y, { align: 'right' });
  doc.setTextColor(...BLACK);
  y += 8;

  // Encabezado de la carta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('A QUIEN CORRESPONDA', M, y);
  y += 10;

  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';

  // Cuerpo principal
  const defaultText = `Por medio de la presente, Chanak International Academy, institución de educación registrada ante el Florida Department of Education (FLDOE #${settings?.fldoe_registration || '134620'}), confirma la matrícula del/la estudiante ${studentName} para el año académico ${letter?.school_year || '—'}.`;
  y = block(doc, y, letter?.confirmation_text || defaultText, M);

  // Tabla de datos del estudiante
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(M, y, W - M * 2, 54, 3, 3, 'F');
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, W - M * 2, 54, 3, 3, 'S');

  const col2 = W / 2 + 4;
  const rows = [
    ['Estudiante', studentName,                          'Año Académico',  letter?.school_year || '—'],
    ['Programa',   letter?.program  || '—',              'Modalidad',      letter?.modality   || '—'],
    ['Grado (ES)', letter?.grade_level    || '—',        'Grado (US)',     letter?.us_grade_level || '—'],
    ['Fecha de Inicio', letter?.start_date || '—',       'Estado',         'CONFIRMADO'],
  ];

  let ry = y + 6;
  rows.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(l1 + ':', M + 4, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    doc.text(String(v1), M + 4, ry + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(l2 + ':', col2, ry);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(v2 === 'CONFIRMADO' ? 20 : 30, v2 === 'CONFIRMADO' ? 120 : 30, v2 === 'CONFIRMADO' ? 60 : 30);
    doc.text(String(v2), col2, ry + 4);
    ry += 12;
  });

  y += 58;

  // Texto institucional legal
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  const legalText = settings?.legal_text_es || 'Este documento es emitido por Chanak International Academy, institución registrada ante el Florida Department of Education (FLDOE #134620).';
  const legalLines = doc.splitTextToSize(legalText, W - M * 2);
  doc.text(legalLines, M, y);
  doc.setTextColor(...BLACK);
  y += legalLines.length * 4.5 + 8;

  // Datos de contacto
  if (settings?.email || settings?.phone) {
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text('Contacto:', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    if (settings.email) { doc.text(settings.email, M + 22, y); }
    if (settings.phone) { doc.text(settings.phone, M + 22, y + 5); }
    y += 14;
  }

  // Firma
  y = Math.max(y, pH(doc) - 80);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  const sigW = 80;
  doc.rect(M, y, sigW, 28, 'S');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Firma:', M + 3, y + 9);
  doc.line(M + 15, y + 9, M + sigW - 3, y + 9);
  doc.text('Nombre:', M + 3, y + 17);
  doc.setTextColor(...BLACK);
  doc.text(letter?.director_signature_name || settings?.director_name || '______________________', M + 18, y + 17);
  doc.setTextColor(...GRAY);
  doc.text('Fecha:', M + 3, y + 23);
  doc.setTextColor(...BLACK);
  doc.text(String(letter?.director_signature_date || '______________________'), M + 18, y + 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text('Head of School / Dirección', M + sigW / 2, y + 27, { align: 'center' });

  // Sello / pie
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Chanak International Academy · Documento Oficial · FLDOE #134620', W / 2, pH(doc) - 6, { align: 'center' });

  const ln = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr = (letter?.school_year || '').replace('-', '_');
  doc.save(`confirmacion_matricula_${ln}_${yr}.pdf`);
}
