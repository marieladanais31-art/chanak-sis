import React from 'react';
import { useProgressReportContext } from '@/context/ProgressReportContext';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DualDiplomaPanel = () => {
  const { student, transferCredits } = useProgressReportContext();
  const { language } = useAuth();
  const { t } = useTranslation(language);

  if (student?.program_type !== 'dual') return null;

  const totalTransfer = transferCredits.reduce((sum, c) => sum + parseFloat(c.credits || 0), 0);
  const progress = Math.min((totalTransfer / 24) * 100, 100);

  return (
    <div className="rounded-lg border border-purple-500/50 overflow-hidden mt-6 bg-purple-900/10">
      <div className="bg-purple-900/40 p-3 font-semibold text-white border-b border-purple-500/30 flex justify-between items-center">
        <span>{t('report_dual_diploma')}</span>
        <span className="text-sm bg-purple-500 px-2 py-0.5 rounded text-white">
          {totalTransfer} / 24 Credits
        </span>
      </div>
      
      <div className="p-4">
        <div className="w-full bg-white/10 rounded-full h-2.5 mb-6">
          <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-purple-500/30">
              <TableHead className="text-white/80">{t('report_subject')}</TableHead>
              <TableHead className="text-white/80">{t('report_source')}</TableHead>
              <TableHead className="text-white/80">{t('report_year')}</TableHead>
              <TableHead className="text-white/80 text-right">{t('report_credits')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transferCredits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-white/40 italic">
                  No transfer credits recorded
                </TableCell>
              </TableRow>
            ) : (
              transferCredits.map((credit, idx) => (
                <TableRow key={idx} className="border-purple-500/20">
                  <TableCell className="text-white">{credit.course_name}</TableCell>
                  <TableCell className="text-white/70">{credit.source_school}</TableCell>
                  <TableCell className="text-white/70">{credit.year_completed}</TableCell>
                  <TableCell className="text-right text-white font-mono">{credit.credits}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DualDiplomaPanel;