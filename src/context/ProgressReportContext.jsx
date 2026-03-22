import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import useProgressReport from '@/hooks/useProgressReport';

const ProgressReportContext = createContext(null);

export const useProgressReportContext = () => {
  const context = useContext(ProgressReportContext);
  if (!context) throw new Error('useProgressReportContext must be used within ProgressReportProvider');
  return context;
};

export const ProgressReportProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const reportUtils = useProgressReport();
  
  const [loading, setLoading] = useState(false);
  const [student, setStudent] = useState(null);
  const [report, setReport] = useState(null);
  const [lines, setLines] = useState([]);
  const [traits, setTraits] = useState([]);
  const [transferCredits, setTransferCredits] = useState([]);
  const [quarter, setQuarter] = useState(1);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear() + '-' + (new Date().getFullYear() + 1));

  const fetchReportData = async (studentId, qtr, year) => {
    setLoading(true);
    try {
      // Fetch Student
      const studentData = await db.students.getById(studentId);
      const userData = await db.users.getById(studentData?.user_id);
      setStudent({ ...studentData, ...userData }); // Merge user info like name/email

      // Fetch Report
      const reports = await db.progressReports.getByStudent(studentId);
      let currentReport = reports.find(r => r.quarter_number == qtr && r.academic_year == year);

      if (!currentReport) {
        // Initialize new draft report structure in memory
        currentReport = {
          student_id: studentId,
          quarter_number: qtr,
          academic_year: year,
          status: 'draft'
        };
        setLines(initializeLines());
        setTraits(initializeTraits());
      } else {
        const fetchedLines = await db.reportLines.getByReportId(currentReport.id);
        const fetchedTraits = await db.traits.getByReportId(currentReport.id);
        setLines(fetchedLines.length > 0 ? fetchedLines : initializeLines(currentReport.id));
        setTraits(fetchedTraits.length > 0 ? fetchedTraits : initializeTraits(currentReport.id));
      }
      setReport(currentReport);

      // Fetch Transfer Credits if Dual Diploma
      if (studentData?.program_type === 'dual') {
        const credits = await db.transferCredits.getByStudentId(studentId);
        setTransferCredits(credits);
      }

    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeLines = (reportId = null) => {
    const core = ['Math', 'English', 'Social Studies', 'Word Building', 'Science'].map(subj => ({
      report_id: reportId, category: 'CORE', subject: subj, pace_numbers: '', grade_percent: '', gpa_value: 0
    }));
    const ext = ['Spanish Language', 'Social Studies (Local)', 'Physical Education & Arts'].map(subj => ({
      report_id: reportId, category: 'EXTENSION', subject: subj, evidence_title: '', grade_percent: '', gpa_value: 0
    }));
    const life = [{
      report_id: reportId, category: 'LIFESKILLS', subject: 'Leadership & Christian Life', evidence_notes: '', grade_percent: '', gpa_value: 0
    }];
    return [...core, ...ext, ...life];
  };

  const initializeTraits = (reportId = null) => {
    return ['Honesty', 'Diligence', 'Responsibility', 'Respect', 'Compassion'].map(t => ({
      report_id: reportId, trait_name: t, rating: 'S', notes: ''
    }));
  };

  const saveReport = async () => {
    setLoading(true);
    try {
      // Upsert Report
      const savedReport = await db.progressReports.upsert(report);
      
      // Update IDs for lines and traits
      const linesWithId = lines.map(l => ({ ...l, report_id: savedReport.id }));
      const traitsWithId = traits.map(t => ({ ...t, report_id: savedReport.id }));
      
      await db.reportLines.upsertBatch(linesWithId);
      await db.traits.upsertBatch(traitsWithId);
      
      setReport(savedReport);
      setLines(linesWithId);
      setTraits(traitsWithId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateLine = async (index, field, value) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    
    // Auto-calculate GPA if grade changes
    if (field === 'grade_percent') {
      const gpa = await reportUtils.getGPAValue(value);
      newLines[index].gpa_value = gpa;
    }
    
    setLines(newLines);
  };

  const updateTrait = (index, field, value) => {
    const newTraits = [...traits];
    newTraits[index] = { ...newTraits[index], [field]: value };
    setTraits(newTraits);
  };

  return (
    <ProgressReportContext.Provider value={{
      student, report, lines, traits, transferCredits, loading,
      quarter, setQuarter, academicYear, setAcademicYear,
      fetchReportData, saveReport, updateLine, updateTrait,
      utils: reportUtils
    }}>
      {children}
    </ProgressReportContext.Provider>
  );
};