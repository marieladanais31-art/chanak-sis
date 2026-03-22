import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import AdminLayout from '@/components/AdminLayout';
import { ProgressReportProvider, useProgressReportContext } from '@/context/ProgressReportContext';
import PrintableProgressReport from '@/components/reports/PrintableProgressReport';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/context/AuthContext';
import { Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ReportContent = () => {
  const { id, quarter: routeQuarter } = useParams();
  const { 
    fetchReportData, 
    saveReport, 
    loading, 
    quarter, setQuarter,
    academicYear, setAcademicYear 
  } = useProgressReportContext();
  
  const { language } = useAuth();
  const { t } = useTranslation(language);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      if (routeQuarter) setQuarter(routeQuarter);
      fetchReportData(id, routeQuarter || 1, academicYear);
    }
  }, [id, routeQuarter, academicYear]);

  const handleSave = async () => {
    const result = await saveReport();
    if (result.success) {
      toast({
        title: "Success",
        description: "Report saved successfully",
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  if (loading) return <div className="text-white p-8">Loading report data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/10 print:hidden">
        <div className="flex gap-4">
          <select 
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="bg-black/20 border border-white/20 rounded p-2 text-white"
          >
            <option value="1">Quarter 1</option>
            <option value="2">Quarter 2</option>
            <option value="3">Quarter 3</option>
            <option value="4">Quarter 4</option>
          </select>
          
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="bg-black/20 border border-white/20 rounded p-2 text-white"
          >
            <option value="2023-2024">2023-2024</option>
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
          </select>
        </div>
        
        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          {t('save')}
        </Button>
      </div>

      <PrintableProgressReport />
    </div>
  );
};

const ProgressReportPage = () => {
  return (
    <AdminLayout>
      <Helmet>
        <title>Student Progress Report - CHANAK Academy</title>
      </Helmet>
      <ProgressReportProvider>
        <ReportContent />
      </ProgressReportProvider>
    </AdminLayout>
  );
};

export default ProgressReportPage;