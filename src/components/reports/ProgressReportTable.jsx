import React from 'react';
import { useProgressReportContext } from '@/context/ProgressReportContext';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ProgressReportTable = () => {
  const { lines, updateLine } = useProgressReportContext();
  const { language, currentUser } = useAuth();
  const { t } = useTranslation(language);

  // Role Checks
  const isTutor = currentUser?.role === 'tutor';
  const isAdmin = currentUser?.role === 'admin';
  const canEditCore = isAdmin;
  const canEditExt = isAdmin || isTutor;
  const canEditLife = isAdmin || isTutor;

  const renderRow = (line, index, canEdit) => (
    <TableRow key={index} className="border-b border-white/10">
      <TableCell className="font-medium text-white">{line.subject}</TableCell>
      
      {/* Evidence/PACE Column */}
      <TableCell>
        {line.category === 'CORE' ? (
          <Input 
            value={line.pace_numbers || ''}
            onChange={(e) => updateLine(index, 'pace_numbers', e.target.value)}
            disabled={!canEdit}
            placeholder="1096, 1097..."
            className="bg-transparent border-white/10 h-8"
          />
        ) : line.category === 'EXTENSION' ? (
          <Input 
            value={line.evidence_title || ''}
            onChange={(e) => updateLine(index, 'evidence_title', e.target.value)}
            disabled={!canEdit}
            placeholder="Project Title"
            className="bg-transparent border-white/10 h-8"
          />
        ) : (
          <Input 
            value={line.evidence_notes || ''}
            onChange={(e) => updateLine(index, 'evidence_notes', e.target.value)}
            disabled={!canEdit}
            placeholder="Notes"
            className="bg-transparent border-white/10 h-8"
          />
        )}
      </TableCell>

      {/* Grade % */}
      <TableCell>
        <Input 
          type="number"
          min="0"
          max="100"
          value={line.grade_percent || ''}
          onChange={(e) => updateLine(index, 'grade_percent', e.target.value)}
          disabled={!canEdit}
          className="bg-transparent border-white/10 h-8 w-20"
        />
      </TableCell>

      {/* GPA Value */}
      <TableCell className="text-right">
        <span className="font-mono">{parseFloat(line.gpa_value || 0).toFixed(2)}</span>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      {/* CORE SECTION */}
      <div className="rounded-lg border border-white/20 overflow-hidden">
        <div className="bg-purple-900/40 p-3 font-semibold text-white border-b border-white/20">
          {t('report_core_subjects')}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 hover:bg-white/5">
              <TableHead className="w-[30%]">{t('report_subject')}</TableHead>
              <TableHead className="w-[40%]">{t('report_pace')}</TableHead>
              <TableHead className="w-[15%]">{t('report_grade')}</TableHead>
              <TableHead className="w-[15%] text-right">{t('report_gpa')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, idx) => line.category === 'CORE' && renderRow(line, idx, canEditCore))}
          </TableBody>
        </Table>
      </div>

      {/* EXTENSION SECTION */}
      <div className="rounded-lg border border-white/20 overflow-hidden">
        <div className="bg-blue-900/40 p-3 font-semibold text-white border-b border-white/20">
          {t('report_extension_local')}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 hover:bg-white/5">
              <TableHead className="w-[30%]">{t('report_subject')}</TableHead>
              <TableHead className="w-[40%]">{t('report_evidence')}</TableHead>
              <TableHead className="w-[15%]">{t('report_grade')}</TableHead>
              <TableHead className="w-[15%] text-right">{t('report_gpa')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, idx) => line.category === 'EXTENSION' && renderRow(line, idx, canEditExt))}
          </TableBody>
        </Table>
      </div>

      {/* LIFE SKILLS SECTION */}
      <div className="rounded-lg border border-white/20 overflow-hidden">
        <div className="bg-green-900/40 p-3 font-semibold text-white border-b border-white/20">
          {t('report_life_skills')}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 hover:bg-white/5">
              <TableHead className="w-[30%]">{t('report_subject')}</TableHead>
              <TableHead className="w-[40%]">{t('report_notes')}</TableHead>
              <TableHead className="w-[15%]">{t('report_grade')}</TableHead>
              <TableHead className="w-[15%] text-right">{t('report_gpa')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, idx) => line.category === 'LIFESKILLS' && renderRow(line, idx, canEditLife))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProgressReportTable;