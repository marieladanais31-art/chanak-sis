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

const OFFICIAL_FOOTER = 'Chanak TrainUp Education, Inc. d/b/a Chanak International Academy · 4883 NW 107th Path, Doral, FL 33178, USA · administration@chanakacademy.org · chanakacademy.org · FLDOE #134620 · EIN 36-5154011 · 501(c)(3) Nonprofit';

function pW(doc) { return doc.internal.pageSize.getWidth(); }
function pH(doc) { return doc.internal.pageSize.getHeight(); }

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
    modality:    'Modalidad',
    start:       'Fecha de Inicio',
    end:         'Fecha de Fin',
    issue:       'Fecha de Emisión',
    objective:   'CLÁUSULA PRIMERA — OBJETO',
    nature:      'CLÁUSULA SEGUNDA — NATURALEZA DEL SERVICIO',
    economics:   'CLÁUSULA CUARTA — CONDICIONES ECONÓMICAS',
    dataProtect: 'CLÁUSULA SÉPTIMA — PROTECCIÓN DE DATOS',
    governing:   'CLÁUSULA DÉCIMA — LEY APLICABLE',
    customClause:'CLÁUSULAS ADICIONALES',
    notes:       'NOTAS',
    legalNotice: 'NOTA LEGAL',
    signatures:  'FIRMAS',
    page:        'Pág.',
    signChanak:  'Chanak International Academy / Chanak TrainUp Education, Inc.',
    signFamily:  'La Familia',
    caoRole:     'Chief Administrative Officer',
    parentRole:  'Padre / Madre / Tutor Legal',
    fieldName:   'Nombre',
    fieldId:     'DNI/NIE/Pasaporte',
    fieldSign:   'Firma',
    fieldPlace:  'Lugar y fecha',
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
    modality:    'Modality',
    start:       'Start Date',
    end:         'End Date',
    issue:       'Issue Date',
    objective:   'CLAUSE ONE — PURPOSE',
    nature:      'CLAUSE TWO — NATURE OF SERVICE',
    economics:   'CLAUSE FOUR — ECONOMIC TERMS',
    dataProtect: 'CLAUSE SEVEN — DATA PROTECTION',
    governing:   'CLAUSE TEN — GOVERNING LAW',
    customClause:'ADDITIONAL CLAUSES',
    notes:       'NOTES',
    legalNotice: 'LEGAL NOTICE',
    signatures:  'SIGNATURES',
    page:        'Page',
    signChanak:  'Chanak International Academy / Chanak TrainUp Education, Inc.',
    signFamily:  'The Family',
    caoRole:     'Chief Administrative Officer',
    parentRole:  'Father / Mother / Legal Guardian',
    fieldName:   'Name',
    fieldId:     'ID / Passport',
    fieldSign:   'Signature',
    fieldPlace:  'Place and date',
  },
};

// Default Off-Campus clause texts (ES)
const DEFAULT_CLAUSES_ES = {
  legal_notice:
    'El presente acuerdo regula la prestación de servicios educativos internacionales por parte de Chanak International Academy, institución registrada en el Estado de Florida, EE.UU. Este documento no constituye, ni pretende constituir, sustitución alguna de la escolarización obligatoria establecida por la legislación educativa vigente en el país de residencia del estudiante. La familia conserva en todo momento la plena responsabilidad legal sobre el cumplimiento de las obligaciones educativas que correspondan según la normativa aplicable.',

  academic_services:
    'El presente acuerdo tiene por objeto la prestación, por parte de CHANAK, de servicios educativos internacionales a través del Programa Off-Campus, que incluye: (a) diagnóstico académico inicial; (b) elaboración del Plan Educativo Individualizado (PEI); (c) provisión de materiales curriculares según el PEI asignado; (d) acceso a las plataformas SIS y LMS de CHANAK; (e) seguimiento académico mensual con mentor asignado; (f) emisión de reportes, boletines y transcript académico; y (g) emisión del High School Diploma estadounidense al cumplir los requisitos del programa.',

  family_responsibilities:
    'Los servicios prestados por CHANAK tienen carácter internacional y complementario. CHANAK actúa exclusivamente como institución educativa registrada en Florida, EE.UU., sin establecimiento físico en España ni actividad docente presencial en territorio español. LA FAMILIA asume plena e íntegra responsabilidad por el cumplimiento de cualesquiera obligaciones que imponga la legislación educativa española vigente, incluidas las relativas a la escolarización obligatoria.',

  economic_conditions:
    'Los servicios del Programa Off-Campus quedan sujetos a la siguiente estructura económica:\n• Matrícula de apertura de expediente: 180 €.\n• Paquete curricular anual: 480 €.\n• Mensualidad de seguimiento académico: 70 €/mes.\n\nLos pagos se realizarán mediante los métodos habilitados en el portal SIS de CHANAK o por los medios autorizados por la administración institucional. La falta de pago de dos (2) mensualidades consecutivas faculta a CHANAK para suspender temporalmente el acceso a los servicios.',

  data_protection:
    'Los datos personales facilitados serán tratados por CHANAK TRAINUP EDUCATION, INC. con la finalidad de gestionar la relación académica y administrativa del estudiante. La base legal del tratamiento es la ejecución del presente contrato. Los datos no serán cedidos a terceros salvo obligación legal. LA FAMILIA tiene derecho de acceso, rectificación, supresión, portabilidad y oposición dirigiéndose a administration@chanakacademy.org.',

  governing_law:
    'El presente contrato se regirá conforme a las leyes del Estado de Florida, Estados Unidos de América. Para cualquier controversia, ambas partes se someten a los tribunales del condado de Miami-Dade, Florida, EE.UU., sin perjuicio de los derechos que asistan al consumidor conforme a la normativa española.',
};

const DEFAULT_CLAUSES_EN = {
  legal_notice:
    'This agreement governs the provision of international educational services by Chanak International Academy, an institution registered in the State of Florida, USA. This document does not constitute, nor intends to constitute, a replacement for the compulsory schooling established by the applicable educational law in the student\'s country of residence. The family retains full legal responsibility for compliance with all educational obligations applicable under local law.',

  academic_services:
    'The purpose of this agreement is the provision, by CHANAK, of international educational services through the Off-Campus Programme, including: (a) initial academic assessment; (b) preparation of the Individualised Educational Plan (IEP); (c) provision of curricular materials as per the assigned IEP; (d) access to the CHANAK SIS and LMS platforms; (e) monthly academic follow-up with an assigned mentor; (f) issuance of reports, transcripts and academic records; and (g) issuance of the US High School Diploma upon meeting programme requirements.',

  family_responsibilities:
    'Services provided by CHANAK are of an international and complementary nature. CHANAK operates exclusively as an educational institution registered in Florida, USA, without a physical presence in Spain or in-person teaching activities on Spanish territory. THE FAMILY assumes full and complete responsibility for compliance with all obligations imposed by applicable Spanish educational legislation, including those relating to compulsory schooling.',

  economic_conditions:
    'Services under the Off-Campus Programme are subject to the following economic structure:\n• Enrolment fee: €180.\n• Annual curriculum package: €480.\n• Monthly academic follow-up fee: €70/month.\n\nPayments shall be made through the methods enabled in the CHANAK SIS portal or by the means authorised by institutional administration. Failure to pay two (2) consecutive monthly fees entitles CHANAK to temporarily suspend access to services.',

  data_protection:
    'Personal data provided will be processed by CHANAK TRAINUP EDUCATION, INC. for the purpose of managing the student\'s academic and administrative relationship. The legal basis for processing is the performance of this contract. Data will not be shared with third parties except as required by law. THE FAMILY has the right of access, rectification, erasure, portability and objection by contacting administration@chanakacademy.org.',

  governing_law:
    'This agreement shall be governed by the laws of the State of Florida, United States of America. For any dispute, both parties submit to the courts of Miami-Dade County, Florida, USA, without prejudice to consumer rights under Spanish law.',
};

function header(doc, contract, settings, lang = 'es') {
  const t = I18N[lang] || I18N.es;
  const fldoe = getInstitutionFldoe(settings);

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pW(doc), 42, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  addInstitutionLogo(doc, settings, 10, 5, 21, 21);
  doc.setFontSize(12);
  doc.text('CHANAK INTERNATIONAL ACADEMY', pW(doc) / 2, 11, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`FLDOE #${fldoe} · EIN 36-5154011`, pW(doc) / 2, 17, { align: 'center' });
  doc.text('MSA-CESS Official Candidate · 501(c)(3) Nonprofit · Florida, USA', pW(doc) / 2, 21, { align: 'center' });
  const contactLine = [getInstitutionEmail(settings) || 'administration@chanakacademy.org', settings?.website || 'chanakacademy.org', getInstitutionAddress(settings)].filter(Boolean).join('  ·  ');
  doc.text(contactLine, pW(doc) / 2, 25, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const schoolYear = contract?.school_year || settings?.active_school_year || '';
  const titleLine = `${t.titlePrefix} — ${t.subtitle}${schoolYear ? ' · ' + schoolYear : ''}`;
  doc.text(titleLine, pW(doc) / 2, 34, { align: 'center' });

  doc.setFillColor(...TEAL);
  doc.rect(0, 41, pW(doc), 1.5, 'F');
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
    return 50;
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
    doc.setFontSize(6.5);
    // Use official footer or settings footer
    const footerLine = settings?.document_footer || OFFICIAL_FOOTER;
    doc.text(footerLine, 14, pH(doc) - 6);
  }
}

export function generateContractPDF({ contract, student, settings, lang: requestedLang }) {
  const lang = normalizeDocumentLanguage(requestedLang || contract?.language || 'es');
  const t = I18N[lang] || I18N.es;
  const defaults = lang === 'en' ? DEFAULT_CLAUSES_EN : DEFAULT_CLAUSES_ES;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const M = 14;
  header(doc, contract, settings, lang);
  let y = 50;

  // ── Nota Legal ────────────────────────────────────────────────────────────
  const legalNoticeText = contract?.legal_notice || defaults.legal_notice;
  if (legalNoticeText) {
    y = secTitle(doc, y, t.legalNotice);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GRAY);
    const legalLines = doc.splitTextToSize(legalNoticeText, pW(doc) - M * 2);
    doc.text(legalLines, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    y += legalLines.length * 4.2 + 5;
  }

  // ── Partes contratantes ───────────────────────────────────────────────────
  y = checkBreak(doc, y, contract, settings, lang, 55);
  y = secTitle(doc, y, t.parties);
  const studentName = `${student?.first_name || ''} ${student?.last_name || ''}`.trim() || '—';
  const col2 = pW(doc) / 2 + 4;

  const pairs = [
    [t.institution, getInstitutionName(settings), 'FLDOE / EIN', `${getInstitutionFldoe(settings)} / 36-5154011`],
    [t.student,     studentName,                   t.year,        contract?.school_year || settings?.active_school_year || '—'],
    [t.family,      contract?.tutor_legal || contract?.family_name || '—', t.program, contract?.program || 'Off-Campus'],
    [t.start,       contract?.start_date || '—',   t.end,         contract?.end_date || '—'],
    [t.issue,       contract?.issue_date || new Date().toISOString().split('T')[0], '', ''],
  ];

  pairs.forEach(([l1, v1, l2, v2]) => {
    if (!l1) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(l1 + ':', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    const v1Lines = doc.splitTextToSize(String(v1 || '—'), pW(doc) / 2 - M - 4);
    doc.text(v1Lines, M, y + 4);
    if (l2) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(l2 + ':', col2, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...BLACK);
      doc.text(String(v2 || '—'), col2, y + 4);
    }
    y += 10;
  });
  y += 3;

  // ── Cláusula Primera — Objeto ──────────────────────────────────────────────
  const academicServices = contract?.academic_services || defaults.academic_services;
  if (academicServices) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.objective);
    y = block(doc, y, academicServices);
    y += 2;
  }

  // ── Cláusula Segunda — Naturaleza del servicio ────────────────────────────
  const familyResp = contract?.family_responsibilities || defaults.family_responsibilities;
  if (familyResp) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.nature);
    y = block(doc, y, familyResp);
    y += 2;
  }

  // ── Cláusula Cuarta — Condiciones Económicas ──────────────────────────────
  const economicConditions = contract?.economic_conditions || defaults.economic_conditions;
  if (economicConditions) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.economics);
    y = block(doc, y, economicConditions);
    y += 2;
  }

  // ── Obligaciones de Chanak (si existe) ────────────────────────────────────
  if (contract?.chanak_responsibilities) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, lang === 'en' ? 'INSTITUTION RESPONSIBILITIES' : 'OBLIGACIONES DE LA INSTITUCIÓN');
    y = block(doc, y, contract.chanak_responsibilities);
    y += 2;
  }

  // ── Cláusula Séptima — Protección de Datos ────────────────────────────────
  const dataProtection = contract?.data_protection || defaults.data_protection;
  if (dataProtection) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.dataProtect);
    y = block(doc, y, dataProtection);
    y += 2;
  }

  // ── Cláusula Décima — Ley Aplicable ──────────────────────────────────────
  const governingLaw = contract?.governing_law || contract?.notes || defaults.governing_law;
  if (governingLaw) {
    y = checkBreak(doc, y, contract, settings, lang);
    y = secTitle(doc, y, t.governing);
    y = block(doc, y, governingLaw);
    y += 2;
  }

  // ── Firmas ────────────────────────────────────────────────────────────────
  y = checkBreak(doc, y, contract, settings, lang, 75);
  y = secTitle(doc, y, t.signatures);
  y += 6;

  const sigW = (pW(doc) - M * 2 - 10) / 2;
  const s2X  = M + sigW + 10;

  const dirName = contract?.director_signature_name || settings?.director_name || 'Mariela Andrade';
  const fldoe = getInstitutionFldoe(settings);

  // CHANAK signature block
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(M, y, sigW, 44, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(t.signChanak, M + sigW / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(`FLDOE #${fldoe} · EIN 36-5154011`, M + sigW / 2, y + 11, { align: 'center' });
  doc.text(`${t.fieldSign}:`, M + 3, y + 18);
  doc.line(M + 16, y + 18, M + sigW - 3, y + 18);
  doc.text(`${t.fieldName}: ${dirName}`, M + 3, y + 25);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(t.caoRole, M + 3, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`${lang === 'en' ? 'Date' : 'Fecha'}: ${contract?.director_signature_date || '_______________'}`, M + 3, y + 36);

  // Family signature block
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.rect(s2X, y, sigW, 44, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text(t.signFamily, s2X + sigW / 2, y + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text(`${t.fieldName}: ___________________________`, s2X + 3, y + 14);
  doc.text(`${t.fieldId}: ___________________________`, s2X + 3, y + 21);
  doc.text(`${t.fieldSign}:`, s2X + 3, y + 28);
  doc.line(s2X + 16, y + 28, s2X + sigW - 3, y + 28);
  doc.text(`${t.fieldPlace}: ________________________`, s2X + 3, y + 36);

  addPageNumbers(doc, settings, lang);

  const ln = student?.last_name?.toLowerCase().replace(/\s+/g, '_') || 'estudiante';
  const yr = (contract?.school_year || '').replace('-', '_');
  doc.save(`${lang === 'en' ? 'contract' : 'contrato'}_offcampus_${ln}_${yr}.pdf`);
}
