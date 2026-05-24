/**
 * contractPdf.js  v3 — Diseño de baja tinta
 * ──────────────────────────────────────────
 * Acuerdo de Prestación de Servicios Educativos / Educational Services Agreement  (ES | EN)
 * jsPDF
 *
 * Diseño:
 * - Sin bloques sólidos azules grandes.
 * - Header: drawOfficialHeader (logo + texto + línea fina).
 * - Secciones: drawSectionLabel (acento 2 mm + negrita + línea fina).
 * - Tabla de partes: fondo gris muy claro, bordes grises finos.
 * - Firmas: cajas con borde fino, sin barra de título navy.
 * - Footer: línea fina + texto gris pequeño.
 * - Paginación completa: Pág. X / Y.
 */

import jsPDF from 'jspdf';
import {
  addInstitutionSignature,
  drawOfficialHeader,
  drawSectionLabel,
  applyOfficialFooterAllPages,
  getInstitutionAddress,
  getInstitutionEmail,
  getInstitutionFldoe,
  getInstitutionName,
  normalizeDocumentLanguage,
  PDF_NAVY,
  PDF_GRAY,
  PDF_LGRAY,
  PDF_BLACK,
  PDF_BORDER,
  PDF_FOOTER_H,
  PDF_MARGIN,
} from '@/lib/officialDocuments';

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

const M = PDF_MARGIN; // 14 mm

// ── I18N ─────────────────────────────────────────────────────────────────────
const I18N = {
  es: {
    titlePrefix: 'ACUERDO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS INTERNACIONALES',
    subtitle:    'Programa Off-Campus',
    parties:     'PARTES CONTRATANTES',
    institution: 'Institución',
    student:     'Estudiante',
    year:        'Año Académico',
    family:      'Familia / Tutor Legal',
    program:     'Programa',
    start:       'Fecha de Inicio',
    end:         'Fecha de Fin',
    issue:       'Fecha de Emisión',
    legalNotice: 'AVISO LEGAL',
    sec1:        'I. OBJETO Y SERVICIOS ACADÉMICOS',
    sec2:        'II. COMPROMISOS DE LA INSTITUCIÓN',
    sec3:        'III. RESPONSABILIDADES DE LA FAMILIA',
    sec4:        'IV. CONDICIONES ECONÓMICAS',
    sec5:        'V. PROTECCIÓN DE DATOS',
    sec6:        'VI. DISPOSICIONES GENERALES',
    signatures:  'FIRMAS DEL ACUERDO',
    page:        'Pág.',
    signChanak:  'Chanak International Academy',
    signFamily:  'La Familia',
    caoRole:     'Chief Administrative Officer',
    fieldName:   'Nombre',
    fieldId:     'DNI / NIE / Pasaporte',
    fieldSign:   'Firma',
    fieldPlace:  'Lugar y fecha',
    date:        'Fecha',
  },
  en: {
    titlePrefix: 'INTERNATIONAL EDUCATIONAL SERVICES AGREEMENT',
    subtitle:    'Off-Campus Programme',
    parties:     'CONTRACTING PARTIES',
    institution: 'Institution',
    student:     'Student',
    year:        'Academic Year',
    family:      'Family / Legal Guardian',
    program:     'Program',
    start:       'Start Date',
    end:         'End Date',
    issue:       'Issue Date',
    legalNotice: 'LEGAL NOTICE',
    sec1:        'I. PURPOSE AND ACADEMIC SERVICES',
    sec2:        'II. INSTITUTION COMMITMENTS',
    sec3:        'III. FAMILY RESPONSIBILITIES',
    sec4:        'IV. ECONOMIC CONDITIONS',
    sec5:        'V. DATA PROTECTION',
    sec6:        'VI. GENERAL PROVISIONS',
    signatures:  'AGREEMENT SIGNATURES',
    page:        'Page',
    signChanak:  'Chanak International Academy',
    signFamily:  'The Family',
    caoRole:     'Chief Administrative Officer',
    fieldName:   'Name',
    fieldId:     'ID / Passport',
    fieldSign:   'Signature',
    fieldPlace:  'Place and date',
    date:        'Date',
  },
};

// ── Cláusulas por defecto ─────────────────────────────────────────────────────
const DEFAULT_CLAUSES_ES = {
  legal_notice:
    'El presente acuerdo regula la prestación de servicios educativos internacionales por parte de Chanak International Academy, institución registrada en el Estado de Florida, EE.UU. Este documento no sustituye la escolarización obligatoria en el país de residencia del estudiante. La familia conserva plena responsabilidad legal sobre el cumplimiento de las obligaciones educativas locales aplicables.',

  academic_services:
    'CHANAK presta al estudiante servicios educativos internacionales a través del Programa Off-Campus, que incluye: (a) diagnóstico académico inicial; (b) elaboración del Plan Educativo Individualizado (PEI); (c) provisión de materiales curriculares según el PEI; (d) acceso a las plataformas SIS y LMS; (e) seguimiento académico mensual con mentor asignado; (f) emisión de reportes, boletines y transcript académico; y (g) High School Diploma estadounidense al cumplir los requisitos del programa.\n\nVigencia: un (1) año académico, prorrogable automáticamente salvo notificación de no renovación con al menos treinta (30) días de antelación al término del período en curso.',

  chanak_responsibilities:
    'CHANAK se compromete a: (a) asignar un mentor académico al estudiante; (b) elaborar el PEI en un plazo máximo de quince (15) días hábiles desde el diagnóstico; (c) garantizar el acceso operativo a las plataformas SIS y LMS; (d) emitir reportes académicos trimestrales; (e) custodiar el expediente académico conforme a los estándares de FLDOE y MSA-CESS; (f) emitir el High School Diploma cuando el estudiante complete los requisitos establecidos.',

  family_responsibilities:
    'LA FAMILIA se compromete a: (a) supervisar el trabajo académico diario del estudiante conforme al modelo CHANAK; (b) custodiar las claves de corrección y los PACE Tests bajo su responsabilidad; (c) registrar las calificaciones en el SIS con exactitud y honestidad; (d) mantener las credenciales de acceso a las plataformas en confidencialidad; (e) comunicar a CHANAK cualquier incidencia académica relevante; (f) abonar puntualmente las cuotas establecidas; (g) cumplir de forma autónoma con cualquier obligación que imponga la normativa educativa española aplicable.',

  economic_conditions:
    'Los servicios del Programa Off-Campus quedan sujetos a la siguiente estructura económica:\n\n• Matrícula de apertura de expediente: 180 €\n• Paquete curricular anual: 480 €\n• Mensualidad de seguimiento académico: 70 €/mes\n\nLos pagos se realizarán mediante los métodos habilitados en el portal SIS de CHANAK o por los medios autorizados por la administración institucional. La falta de pago de dos (2) mensualidades consecutivas faculta a CHANAK para suspender temporalmente el acceso a los servicios.',

  data_protection:
    'Los datos personales facilitados serán tratados por CHANAK TRAINUP EDUCATION, INC. con la única finalidad de gestionar la relación académica y administrativa del estudiante. La base legal del tratamiento es la ejecución del presente contrato. Los datos no serán cedidos a terceros salvo obligación legal. LA FAMILIA tiene derecho de acceso, rectificación, supresión, portabilidad y oposición, dirigiéndose a administration@chanakacademy.org. En el caso de estudiantes menores de 18 años, el responsable legal presta el consentimiento en nombre del menor.',

  governing_law:
    'El presente contrato se rige por las leyes del Estado de Florida, EE.UU. Para cualquier controversia, las partes se someten a los tribunales del condado de Miami-Dade, Florida, sin perjuicio de los derechos que asistan al consumidor conforme a la normativa española de protección de consumidores.\n\nCualquiera de las partes puede resolver el acuerdo mediante notificación escrita con un preaviso de treinta (30) días. CHANAK puede resolver de forma inmediata ante incumplimiento grave o falsificación de evidencias académicas. La resolución no genera derecho a devolución de cantidades ya abonadas, salvo incumplimiento imputable exclusivamente a CHANAK.',
};

const DEFAULT_CLAUSES_EN = {
  legal_notice:
    "This agreement governs the provision of international educational services by Chanak International Academy, an institution registered in the State of Florida, USA. This document does not replace compulsory schooling in the student's country of residence. The family retains full legal responsibility for compliance with all applicable local educational obligations.",

  academic_services:
    "CHANAK provides the student with international educational services through the Off-Campus Programme, including: (a) initial academic assessment; (b) preparation of the Individualised Educational Plan (IEP); (c) provision of curricular materials per the assigned IEP; (d) access to the CHANAK SIS and LMS platforms; (e) monthly academic follow-up with an assigned mentor; (f) issuance of reports, transcripts and academic records; and (g) US High School Diploma upon meeting programme requirements.\n\nTerm: one (1) academic year, automatically renewable unless either party gives at least thirty (30) days' written notice of non-renewal before the end of the current period.",

  chanak_responsibilities:
    "CHANAK undertakes to: (a) assign an academic mentor to the student; (b) prepare the IEP within 15 working days of assessment; (c) ensure operational access to the SIS and LMS platforms; (d) issue quarterly academic reports; (e) maintain the academic record in accordance with FLDOE and MSA-CESS standards; (f) issue the US High School Diploma upon completion of requirements.",

  family_responsibilities:
    "THE FAMILY undertakes to: (a) supervise the student's daily academic work per CHANAK's model; (b) safeguard correction keys and PACE Tests; (c) record grades in the SIS accurately and honestly; (d) keep platform credentials confidential; (e) report any relevant academic incidents to CHANAK; (f) pay all fees on time; (g) independently comply with all obligations imposed by applicable Spanish educational regulations.",

  economic_conditions:
    "Services under the Off-Campus Programme are subject to the following economic structure:\n\n• Enrolment fee: €180\n• Annual curriculum package: €480\n• Monthly academic follow-up fee: €70/month\n\nPayments shall be made via methods enabled in the CHANAK SIS portal or other means authorised by institutional administration. Failure to pay two (2) consecutive monthly fees entitles CHANAK to temporarily suspend access to services.",

  data_protection:
    "Personal data provided will be processed by CHANAK TRAINUP EDUCATION, INC. solely for the purpose of managing the student's academic and administrative relationship. Legal basis: performance of this contract. Data will not be shared with third parties except as required by law. THE FAMILY has the right of access, rectification, erasure, portability and objection by contacting administration@chanakacademy.org. For students under 18, the legal guardian provides consent on their behalf.",

  governing_law:
    "This agreement is governed by the laws of the State of Florida, USA. Disputes shall be submitted to the courts of Miami-Dade County, Florida, without prejudice to consumer rights under Spanish law.\n\nEither party may terminate this agreement with thirty (30) days' written notice. CHANAK may terminate immediately in the event of serious breach or academic evidence falsification. Termination does not entitle either party to a refund of amounts already paid, except in the event of breach solely attributable to CHANAK.",
};

// ── Bloque de texto paginado ──────────────────────────────────────────────────
function blockPaged(doc, y, text, contract, settings, lang) {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...PDF_BLACK);
  const lines = doc.splitTextToSize(text, pW(doc) - M * 2);
  for (const line of lines) {
    if (y + 5 > pH(doc) - PDF_FOOTER_H - 8) {
      doc.addPage();
      drawOfficialHeader(doc, settings, { lang });
      y = 36;
    }
    doc.text(line, M, y);
    y += 4.5;
  }
  return y + 3;
}

// ── Control de salto de página ────────────────────────────────────────────────
function checkBreak(doc, y, contract, settings, lang, need = 35) {
  if (y + need > pH(doc) - PDF_FOOTER_H - 8) {
    doc.addPage();
    drawOfficialHeader(doc, settings, { lang });
    return 36;
  }
  return y;
}

// ── Generador principal ───────────────────────────────────────────────────────
export function generateContractPDF({ contract, student, settings, lang: requestedLang }) {
  const lang     = normalizeDocumentLanguage(requestedLang || contract?.language || 'es');
  const t        = I18N[lang] || I18N.es;
  const defaults = lang === 'en' ? DEFAULT_CLAUSES_EN : DEFAULT_CLAUSES_ES;
  const doc      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W        = pW(doc);
  const fldoe    = getInstitutionFldoe(settings);

  // ── Header de primera página (con título + subtítulo) ─────────────────────
  const schoolYear  = contract?.school_year || settings?.active_school_year || '';
  const docTitle    = `${t.titlePrefix}${schoolYear ? ' — ' + schoolYear : ''}`;
  let y = drawOfficialHeader(doc, settings, { docTitle, docSubtitle: t.subtitle, lang });

  // ── Aviso Legal ────────────────────────────────────────────────────────────
  const legalNoticeText = contract?.legal_notice || defaults.legal_notice;
  if (legalNoticeText) {
    y = checkBreak(doc, y, contract, settings, lang, 20);
    y = drawSectionLabel(doc, y, t.legalNotice);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_GRAY);
    const legalLines = doc.splitTextToSize(legalNoticeText, W - M * 2);
    doc.text(legalLines, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_BLACK);
    y += legalLines.length * 4.2 + 6;
  }

  // ── Partes contratantes (tabla de datos) ──────────────────────────────────
  y = checkBreak(doc, y, contract, settings, lang, 60);
  y = drawSectionLabel(doc, y, t.parties);

  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';
  const col2  = W / 2 + 4;
  const rowH  = 10;

  const tableRows = [
    [t.institution, getInstitutionName(settings), 'FLDOE / EIN', `${fldoe} / 36-5154011`],
    [t.student,  studentName,                     t.year,    contract?.school_year || settings?.active_school_year || '—'],
    [t.family,   contract?.tutor_legal || contract?.family_name || '—', t.program, contract?.program || 'Off-Campus'],
    [t.start,    contract?.start_date || '—',     t.end,     contract?.end_date || '—'],
    [t.issue,    contract?.issue_date || new Date().toISOString().split('T')[0], '', ''],
  ];

  const tableH = tableRows.length * rowH;
  doc.setFillColor(...PDF_LGRAY);
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.rect(M, y, W - M * 2, tableH, 'FD');

  tableRows.forEach(([l1, v1, l2, v2], idx) => {
    const ry = y + idx * rowH;
    if (idx > 0) {
      doc.setDrawColor(...PDF_BORDER);
      doc.setLineWidth(0.15);
      doc.line(M, ry, W - M, ry);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...PDF_GRAY);
    doc.text((l1 || '') + ':', M + 2, ry + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_BLACK);
    const v1Lines = doc.splitTextToSize(String(v1 || '—'), W / 2 - M - 6);
    doc.text(v1Lines, M + 2, ry + 7.5);

    if (l2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(...PDF_GRAY);
      doc.text(l2 + ':', col2, ry + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...PDF_BLACK);
      doc.text(String(v2 || '—'), col2, ry + 7.5);
    }
  });
  y += tableH + 8;

  // ── I. Objeto y Servicios Académicos ──────────────────────────────────────
  const academicServices = contract?.academic_services || defaults.academic_services;
  if (academicServices) {
    y = checkBreak(doc, y, contract, settings, lang, 20);
    y = drawSectionLabel(doc, y, t.sec1);
    y = blockPaged(doc, y, academicServices, contract, settings, lang);
    y += 2;
  }

  // ── II. Compromisos de la Institución ─────────────────────────────────────
  const chaResp = contract?.chanak_responsibilities || defaults.chanak_responsibilities;
  if (chaResp) {
    y = checkBreak(doc, y, contract, settings, lang, 20);
    y = drawSectionLabel(doc, y, t.sec2);
    y = blockPaged(doc, y, chaResp, contract, settings, lang);
    y += 2;
  }

  // ── III. Responsabilidades de la Familia ──────────────────────────────────
  const famResp = contract?.family_responsibilities || defaults.family_responsibilities;
  if (famResp) {
    y = checkBreak(doc, y, contract, settings, lang, 20);
    y = drawSectionLabel(doc, y, t.sec3);
    y = blockPaged(doc, y, famResp, contract, settings, lang);
    y += 2;
  }

  // ── IV. Condiciones Económicas ────────────────────────────────────────────
  const econCond = contract?.economic_conditions || defaults.economic_conditions;
  if (econCond) {
    y = checkBreak(doc, y, contract, settings, lang, 20);
    y = drawSectionLabel(doc, y, t.sec4);
    y = blockPaged(doc, y, econCond, contract, settings, lang);
    y += 2;
  }

  // ── V. Protección de Datos ────────────────────────────────────────────────
  // Compatibilidad retroactiva: si hay `notes` heredadas, no duplicar esta sección
  const hasLegacyNotes = !!(contract?.notes && contract.notes.trim());
  const dataProtection = contract?.data_protection || (hasLegacyNotes ? null : defaults.data_protection);
  if (dataProtection) {
    y = checkBreak(doc, y, contract, settings, lang, 20);
    y = drawSectionLabel(doc, y, t.sec5);
    y = blockPaged(doc, y, dataProtection, contract, settings, lang);
    y += 2;
  }

  // ── VI. Disposiciones Generales ───────────────────────────────────────────
  const governingLaw = contract?.governing_law || contract?.notes || defaults.governing_law;
  if (governingLaw) {
    y = checkBreak(doc, y, contract, settings, lang, 20);
    y = drawSectionLabel(doc, y, t.sec6);
    y = blockPaged(doc, y, governingLaw, contract, settings, lang);
    y += 2;
  }

  // ── Firmas ────────────────────────────────────────────────────────────────
  y = checkBreak(doc, y, contract, settings, lang, 64);
  y = drawSectionLabel(doc, y, t.signatures);
  y += 4;

  const sigW   = (W - M * 2 - 10) / 2;
  const s2X    = M + sigW + 10;
  const sigH   = 50;
  const dirName = contract?.director_signature_name || settings?.director_name || 'Mariela Andrade';

  // ── Caja Chanak — sin barra de título navy ────────────────────────────────
  doc.setFillColor(252, 253, 255);
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(M, y, sigW, sigH, 'FD');

  // Título de la caja (texto negrita, no fill)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(t.signChanak, M + sigW / 2, y + 7, { align: 'center' });

  // Línea fina bajo el título
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.line(M + 2, y + 9.5, M + sigW - 2, y + 9.5);

  // FLDOE info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_GRAY);
  doc.text(`FLDOE #${fldoe} · EIN 36-5154011`, M + sigW / 2, y + 15, { align: 'center' });

  // Etiqueta de firma
  doc.text(`${t.fieldSign}:`, M + 3, y + 22);

  // Imagen de firma o línea
  const sigDrawn = addInstitutionSignature(doc, settings, M + 14, y + 14, 34, 13);
  doc.setDrawColor(...PDF_GRAY);
  doc.setLineWidth(0.3);
  doc.line(M + 14, y + (sigDrawn ? 28 : 23), M + sigW - 3, y + (sigDrawn ? 28 : 23));

  doc.setTextColor(...PDF_BLACK);
  doc.setFontSize(8);
  doc.text(`${t.fieldName}: ${dirName}`, M + 3, y + (sigDrawn ? 35 : 30));
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...PDF_NAVY);
  doc.text(t.caoRole, M + 3, y + 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(
    `${t.date}: ${contract?.director_signature_date || '_______________'}`,
    M + 3, y + 46,
  );

  // ── Caja Familia — sin barra de título navy ───────────────────────────────
  doc.setFillColor(252, 253, 255);
  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(s2X, y, sigW, sigH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_NAVY);
  doc.text(t.signFamily, s2X + sigW / 2, y + 7, { align: 'center' });

  doc.setDrawColor(...PDF_BORDER);
  doc.setLineWidth(0.2);
  doc.line(s2X + 2, y + 9.5, s2X + sigW - 2, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_GRAY);
  doc.text(`${t.fieldName}: ___________________________`, s2X + 3, y + 18);
  doc.text(`${t.fieldId}: _______________________`, s2X + 3, y + 26);
  doc.text(`${t.fieldSign}:`, s2X + 3, y + 34);
  doc.line(s2X + 14, y + 34, s2X + sigW - 3, y + 34);
  doc.text(`${t.fieldPlace}: ________________________`, s2X + 3, y + 46);

  // ── Footer en todas las páginas ───────────────────────────────────────────
  applyOfficialFooterAllPages(doc, settings, { pageLabel: t.page });

  // ── Guardar ───────────────────────────────────────────────────────────────
  const ln = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr = (contract?.school_year || '').replace('-', '_');
  doc.save(`${lang === 'en' ? 'contract' : 'contrato'}_offcampus_${ln}_${yr}.pdf`);
}
