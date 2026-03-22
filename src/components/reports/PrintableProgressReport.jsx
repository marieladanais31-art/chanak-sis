import React from 'react';
import { useProgressReportContext } from '@/context/ProgressReportContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import ProgressReportTable from './ProgressReportTable';
import CharacterTraitsSection from './CharacterTraitsSection';
import SignatureBlock from './SignatureBlock';
import DualDiplomaPanel from './DualDiplomaPanel';
import PDFSeal from './PDFSeal';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const PrintableProgressReport = () => {
  const { student, quarter, academicYear, utils, lines } = useProgressReportContext();
  const { language } = useAuth();
  const { t } = useTranslation(language);

  // Calculate Finals
  const coreLines = lines.filter(l => l.category === 'CORE');
  const extLines = lines.filter(l => l.category === 'EXTENSION');
  const lifeLines = lines.filter(l => l.category === 'LIFESKILLS');
  
  const average = utils.calculateWeightedAverage(coreLines, extLines, lifeLines);
  const mastery = utils.validateMastery(average);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 p-4 print:hidden">
        <Button onClick={handlePrint} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
          <Printer className="w-4 h-4 mr-2" />
          {t('report_print')}
        </Button>
      </div>

      <div id="printable-area" className="bg-white text-black p-8 max-w-[21.59cm] mx-auto min-h-[27.94cm] shadow-xl print:shadow-none print:w-full relative">
        {/* Seal - Absolute Positioned for Print */}
        <div className="absolute top-4 right-4 opacity-90">
            <PDFSeal type="stamp" className="w-24 h-24" />
        </div>

        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-[#0B2D5C] pb-4 mb-6 pt-4">
          <img 
            src="https://horizons-cdn.hostinger.com/fecf9528-708e-4a5b-9228-805062d89fe9/4c172acccfd6da3811a3ad56c254d1fc.png" 
            alt="Logo" 
            className="h-20"
          />
          <div className="text-right pr-28">
            <h1 className="text-2xl font-bold text-[#0B2D5C] uppercase tracking-wide">
              {t('report_title')}
            </h1>
            <p className="text-[#2F80ED] font-semibold">{t('config_name')}</p>
            <p className="text-gray-500 text-sm">School Code: 134620</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded border border-gray-200">
          <div>
            <p className="text-sm text-gray-500">{t('student')}</p>
            <p className="font-bold text-lg text-[#0B2D5C]">{student?.name}</p>
          </div>
          <div className="text-right">
             <p className="text-sm text-gray-500">{t('report_academic_year')}</p>
             <p className="font-bold">{academicYear} | Q{quarter}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('report_program')}</p>
            <p className="font-semibold capitalize">{student?.program_type || 'Standard'}</p>
          </div>
          <div className="text-right">
             <p className="text-sm text-gray-500">{t('report_grade_level')}</p>
             <p className="font-semibold">{student?.grade_level || 'N/A'}</p>
          </div>
        </div>

        {/* Content using existing components but styled for print via CSS overriding or separate classes */}
        <div className="text-black [&_*]:text-black [&_input]:text-black [&_td]:text-black [&_th]:text-black [&_div]:border-gray-300 [&_table]:border-gray-300">
          <ProgressReportTable />
          
          <div className="flex justify-end mt-4 mb-6">
             <div className="bg-gray-50 p-4 rounded border border-[#0B2D5C]/20 text-right w-64">
                <p className="text-sm text-gray-600">{t('report_average')}</p>
                <p className="text-3xl font-bold text-[#0B2D5C]">{average.toFixed(1)}%</p>
                <p className={`text-sm font-semibold mt-1 ${average >= 80 ? 'text-green-700' : 'text-red-700'}`}>
                  {mastery === 'mastery_met' ? t('report_mastery_met') : t('report_mastery_not_met')}
                </p>
             </div>
          </div>

          <CharacterTraitsSection />
          <DualDiplomaPanel />
          <SignatureBlock />
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-end">
            <div className="text-xs text-gray-400">
                Generated: {new Date().toLocaleDateString()}
            </div>
            <PDFSeal type="monochromatic" className="w-12 h-12 opacity-50 grayscale" />
        </div>
      </div>
      
      <style>{`
        @media print {
          @page { margin: 0; size: letter; }
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0.5in;
            box-shadow: none;
            background: white !important;
            color: black !important;
          }
          .bg-white\\/5, .bg-white\\/10, .bg-black\\/20 {
            background-color: transparent !important;
            border: 1px solid #ddd !important;
          }
          input {
            border: none !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintableProgressReport;