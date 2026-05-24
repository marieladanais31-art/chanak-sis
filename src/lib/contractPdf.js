/**
 * contractPdf.js
 * Genera contratos de prestación de servicios educativos.
 * Usa jsPDF — ya instalado en el proyecto.
 *
 * HOTFIX 2026-05-24: Rediseño low-ink. Logo/sello/firma activos via preloadImages().
 */

import jsPDF from 'jspdf';
import {
  addInstitutionSeal,
  addInstitutionSignature,
  applyOfficialFooterAllPages,
  drawOfficialHeader,
  getInstitutionInfo,
  normalizeDocumentLanguage,
  PDF_BLACK,
  PDF_BORDER,
  PDF_FOOTER_H,
  PDF_GRAY,
  PDF_MARGIN,
  PDF_NAVY,
} from '@/lib/officialDocuments';

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

const M = PDF_MARGIN; // 14 mm

// ── I18N ─────────────────────────────────────────────────────────────────────
const I18N = {
  es: {
    titlePrefix: 'CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS',
    parties:     'PARTES CONTRATANTES',
    institution: 'Institución',
    student:     'Estudiante',
    year:        'Año Académico',
    family:      'Familia / Tutor Legal',
    program:     'Programa',
    modality:    'Modalidad',
    start:       'Fecha de Inicio',
    end:         'Fecha de Fin',
    issue:       'Fecha de Emisión',
    objective:   'OBJETO Y NATURALEZA DEL PROGRAMA',
    chanak:      'OBLIGACIONES DE LA INSTITUCIÓN',
    familyResp:  'OBLIGACIONES DE LA FAMILIA',
    economics:   'CONDICIONES ECONÓMICAS Y PAGOS',
    notes:       'LEY APLICABLE Y NOTAS',
    signatures:  'FIRMAS',
    page:        'Pág.',
    dirRole:     'Head of School / Dirección — Chanak',
    parentRole:  'Padre / Madre / Tutor Legal',
    signLabel:   'Firma:',
    nameLabel:   'Nombre:',
    dateLabel:   'Fecha:',
  },
  en: {
    titlePrefix: 'EDUCATIONAL SERVICES AGREEMENT',
    parties:     'CONTRACTING PARTIES',
    institution: 'Institution',
    student:     'Student',
    year:        'Academic Year',
    family:      'Family / Legal Guardian',
    program:     'Programme',
    modality:    'Modality',
    start:       'Start Date',
    end:         'End Date',
    issue:       'Issue Date',
    objective:   'PROGRAM PURPOSE AND NATURE',
    chanak:      'INSTITUTION RESPONSIBILITIES',
    familyResp:  'FAMILY RESPONSIBILITIES',
    economics:   'ECONOMIC TERMS AND PAYMENTS',
    notes:       'GOVERNING LAW AND NOTES',
    signatures:  'SIGNATURES',
    page:        'Page',
    dirRole:     'Head of School — Chanak',
    parentRole:  'Parent / Legal Guardian',
    signLabel:   'Signature:',
    nameLabel:   'Name:',
    dateLabel:   'Date:',
  },
};

/** Etiqueta de sección con fondo azul muy claro + borde navy. */
function secTitle(doc, y, txt) {
  doc.setFillColor(240, 246, 255);
  doc.rect(PDF_MARGIN, y, pW(doc) - PDF_MARGIN * 2, 7, 'F');
  doc.setDrawColor(...PDF_NAVY);
  doc.setLineWidth(0.3);
  doc.rect(PDF_MARGIN, y, pW(doc) - PDF_MARGIN * 2, 7, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(txt, PDF_MARGIN + 3, y + 5);
  doc.setTextColor(...PDF_BLACK);
  return y + 11;
}

function block(doc, y, text, M = PDF_MARGIN) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_BLACK);
  const lines = doc.splitTextToSize(text, pW(doc) - M * 2);
  doc.text(lines, M, y);
  return y + lines.length * 4.5 + 3;
}

function checkBreak(doc, contract, settings, lang, y, need = 25) {
  if (y + need > pH(doc) - PDF_FOOTER_H - 6) {
    doc.addPage();
    const t = I18N[lang] || I18N.es;
    const docSubtitle = `${t.titlePrefix} — ${contract?.program || contract?.modality || ''}`.trim();
    return drawOfficialHeader(doc, settings, { docTitle: docSubtitle, lang });
  }
  return y;
}

export function generateContractPDF({ contract, student, settings, lang: requestedLang }) {
  const lang = normalizeDocumentLanguage(requestedLang || contract?.language || 'es');
  const t    = I18N[lang] || I18N.es;
  const info = getInstitutionInfo(settings);
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ── Encabezado institucional (low-ink) ──────────────────────────────────────
  const docSubtitle = `${t.titlePrefix} — ${contract?.program || contract?.modality || ''}`.trim();
  let y = drawOfficialHeader(doc, settings, { docTitle: docSubtitle, lang });

  // ── Datos de las partes ──────────────────────────────────────────────────────
  y = secTitle(doc, y, t.parties);
  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';
  const col2 = pW(doc) / 2 + 4;

  const pairs = [
    [t.institution, info.name, 'FLDOE', info.fldoe],
    [t.student,  studentName,                     t.year,     contract?.school_year || settings?.active_school_year || '—'],
    [t.family,   contract?.tutor_legal || contract?.family_name || '—', t.program, contract?.program || contract?.modality || '—'],
    [t.modality, contract?.modality || '—',       t.start,    contract?.start_date || '—'],
    [t.end,      contract?.end_date  || '—',      t.issue,    contract?.issue_date  || '—'],
  ];

  pairs.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...PDF_GRAY);
    doc.text(`${l1}:`, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_BLACK);
    const v1Lines = doc.splitTextToSize(String(v1), pW(doc) / 2 - M - 4);
    doc.text(v1Lines, M, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...PDF_GRAY);
    doc.text(`${l2}:`, col2, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...PDF_BLACK);
    doc.text(String(v2), col2, y + 4);
    y += 10;
  });
  y += 3;

  // ── Cláusulas ────────────────────────────────────────────────────────────────
  if (contract?.academic_services) {
    y = checkBreak(doc, contract, settings, lang, y);
    y = secTitle(doc, y, t.objective);
    y = block(doc, y, contract.academic_services);
    y += 2;
  }

  if (contract?.chanak_responsibilities) {
    y = checkBreak(doc, contract, settings, lang, y);
    y = secTitle(doc, y, t.chanak);
    y = block(doc, y, contract.chanak_responsibilities);
    y += 2;
  }

  if (contract?.family_responsibilities) {
    y = checkBreak(doc, contract, settings, lang, y);
    y = secTitle(doc, y, t.familyResp);
    y = block(doc, y, contract.family_responsibilities);
    y += 2;
  }

  if (contract?.economic_conditions) {
    y = checkBreak(doc, contract, settings, lang, y);
    y = secTitle(doc, y, t.economics);
    y = block(doc, y, contract.economic_conditions);
    y += 2;
  }

  if (contract?.notes) {
    y = checkBreak(doc, contract, settings, lang, y);
    y = secTitle(doc, y, t.notes);
    y = block(doc, y, contract.notes);
    y += 2;
  }

  // ── Firmas ───────────────────────────────────────────────────────────────────
  // Director box: 42mm. Sello debajo: 3mm gap + 22mm = 25mm extra.
  // Total mínimo desde y: secTitle(11) + padding(4) + sigBoxH(42) + sello(25) = 82mm
  const sigBoxH = 42;
  const sealSz  = 22;                       // tamaño del sello (ancho = alto)
  y = checkBreak(doc, contract, settings, lang, y, sigBoxH + 38);
  y = secTitle(doc, y, t.signatures);
  y += 4;

  const sigW = (pW(doc) - M * 2 - 10) / 2;
  const s2X  = M + sigW + 10;

  const sigBlocks = [
    {
      x:    M,
      name: contract?.director_signature_name || info.directorName,
      date: contract?.director_signature_date,
      role: t.dirRole,
      drawImg: true,   // ← imagen de firma del director
    },
    {
      x:    s2X,
      name: contract?.parent_signature_name || '______________________',
      date: contract?.parent_signature_date,
      role: t.parentRole,
      drawImg: false,
    },
  ];

  sigBlocks.forEach(sig => {
    // Caja de firma (solo borde, sin relleno)
    doc.setDrawColor(...PDF_NAVY);
    doc.setLineWidth(0.3);
    doc.rect(sig.x, y, sigW, sigBoxH, 'S');

    // Imagen de firma del director (si existe y corresponde)
    let imgDrawn = false;
    if (sig.drawImg) {
      imgDrawn = addInstitutionSignature(doc, settings, sig.x + 3, y + 3, 38, 16);
    }

    const lineY = imgDrawn ? y + 22 : y + 14;

    // Línea horizontal de firma
    doc.setDrawColor(...PDF_BORDER);
    doc.setLineWidth(0.25);
    doc.line(sig.x + 3, lineY, sig.x + sigW - 3, lineY);

    // Si NO hay imagen: etiqueta "Firma:" discreta antes de la línea
    if (!imgDrawn) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...PDF_GRAY);
      doc.text(t.signLabel, sig.x + 3, lineY - 2);
    }

    // Nombre
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...PDF_GRAY);
    doc.text(t.nameLabel, sig.x + 3, lineY + 7);
    doc.setTextColor(...PDF_BLACK);
    doc.text(sig.name, sig.x + 19, lineY + 7);

    // Fecha
    doc.setTextColor(...PDF_GRAY);
    doc.text(t.dateLabel, sig.x + 3, lineY + 14);
    doc.setTextColor(...PDF_BLACK);
    doc.text(String(sig.date || '______________________'), sig.x + 17, lineY + 14);

    // Rol (centrado, negrita, abajo del bloque)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...PDF_NAVY);
    doc.text(sig.role, sig.x + sigW / 2, y + sigBoxH - 2, { align: 'center' });
  });

  // Sello institucional debajo del bloque Chanak (lado izquierdo, centrado en sigW)
  const sealX = M + (sigW - sealSz) / 2;
  addInstitutionSeal(doc, settings, sealX, y + sigBoxH + 3, sealSz, sealSz);

  // ── Footer en todas las páginas ─────────────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, { pageLabel: t.page });

  // ── Guardar ─────────────────────────────────────────────────────────────────
  const ln   = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr   = (contract?.school_year || '').replace('-', '_');
  const type = (contract?.modality || 'contract').toLowerCase().replace(/\s+/g, '_');
  doc.save(`${lang === 'en' ? 'contract' : 'contrato'}_${type}_${ln}_${yr}.pdf`);
}
