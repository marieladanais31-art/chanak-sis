import { useState, useCallback } from 'react';
import { db } from '@/lib/supabase';

const useProgressReport = () => {
  const [error, setError] = useState(null);

  const getGPAValue = useCallback(async (percent) => {
    if (percent === null || percent === undefined || percent === '') return 0;
    const numPercent = parseFloat(percent);
    const scale = await db.gpaScale.getAll();
    const grade = scale.find(g => numPercent >= g.min && numPercent <= g.max);
    return grade ? grade.val : 0.0;
  }, []);

  const calculateWeightedAverage = (coreLines, extensionLines, lifeSkillLines) => {
    const coreSum = coreLines.reduce((sum, line) => sum + (parseFloat(line.grade_percent) || 0), 0);
    const coreCount = coreLines.filter(l => l.grade_percent).length;
    const coreAvg = coreCount > 0 ? coreSum / coreCount : 0;

    const extSum = extensionLines.reduce((sum, line) => sum + (parseFloat(line.grade_percent) || 0), 0);
    const extCount = extensionLines.filter(l => l.grade_percent).length;
    const extAvg = extCount > 0 ? extSum / extCount : 0;

    const lifeSum = lifeSkillLines.reduce((sum, line) => sum + (parseFloat(line.grade_percent) || 0), 0);
    const lifeCount = lifeSkillLines.filter(l => l.grade_percent).length;
    const lifeAvg = lifeCount > 0 ? lifeSum / lifeCount : 0;

    // Weighted Formula: 60% Core + 20% Extension + 20% Life Skills
    // If sections are missing, we might need to re-weight, but for now assuming fixed structure
    return (coreAvg * 0.6) + (extAvg * 0.2) + (lifeAvg * 0.2);
  };

  const calculateGPA = (allLines) => {
    const validLines = allLines.filter(l => l.gpa_value !== undefined && l.gpa_value !== null);
    if (validLines.length === 0) return 0;
    const sum = validLines.reduce((acc, line) => acc + parseFloat(line.gpa_value), 0);
    return (sum / validLines.length).toFixed(2);
  };

  const validateMastery = (coreAvg) => {
    return coreAvg >= 80 ? 'mastery_met' : 'mastery_not_met';
  };

  const validateReport = (lines) => {
    const missingCore = lines
      .filter(l => l.category === 'CORE')
      .some(l => !l.grade_percent || !l.pace_numbers);
    
    if (missingCore) {
      return { valid: false, message: 'Missing Core Subjects Grade or PACE #' };
    }
    return { valid: true };
  };

  return {
    getGPAValue,
    calculateWeightedAverage,
    calculateGPA,
    validateMastery,
    validateReport,
    error
  };
};

export default useProgressReport;