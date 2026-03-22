
export const SCHOOL_YEAR = {
  START_MONTH: 8, // September
  END_MONTH: 5,   // June
  QUARTERS: {
    Q1: { id: 'Q1', name: 'Q1 (Sept-Dic)', expectedPACES: 4 },
    Q2: { id: 'Q2', name: 'Q2 (Ene-Mar)', expectedPACES: 3 },
    Q3: { id: 'Q3', name: 'Q3 (Abr-Jun)', expectedPACES: 3 }
  }
};

export const QUARTERS = {
  Q1: 'Q1',
  Q2: 'Q2',
  Q3: 'Q3',
};

export function isValidQuarter(quarter) {
  return ['Q1', 'Q2', 'Q3'].includes(quarter);
}

export function getCurrentQuarter() {
  const month = new Date().getMonth(); 
  if (month >= 8 && month <= 11) return QUARTERS.Q1; // Sept - Dec
  if (month >= 0 && month <= 2) return QUARTERS.Q2;  // Jan - Mar
  if (month >= 3 && month <= 5) return QUARTERS.Q3;  // Apr - Jun
  return QUARTERS.Q1; // Default
}

export function getQuarterName(quarter) {
  if (!isValidQuarter(quarter)) return SCHOOL_YEAR.QUARTERS.Q1.name;
  return SCHOOL_YEAR.QUARTERS[quarter].name;
}

export function calculateTrimestralPACES(studentStartDate, currentGrades, targetQuarter = null) {
  try {
    const evalQuarter = isValidQuarter(targetQuarter) ? targetQuarter : getCurrentQuarter();
    const expectedPACESPerQuarter = SCHOOL_YEAR.QUARTERS[evalQuarter].expectedPACES;

    const actualPACES = currentGrades.filter(g => {
      const q = isValidQuarter(g.quarter) ? g.quarter : 'Q1';
      return parseFloat(g.score) >= 70 && q === evalQuarter;
    }).length;

    const deficit = expectedPACESPerQuarter - actualPACES;
    const isOnTrack = deficit <= 0;
    const status = isOnTrack ? 'active' : 'alert';
    const percentage = Math.min(100, Math.round((actualPACES / expectedPACESPerQuarter) * 100)) || 0;

    console.log(`📊 PACES Calc [${evalQuarter}]: Expected=${expectedPACESPerQuarter}, Actual=${actualPACES}`);

    return {
      quarter: evalQuarter,
      quarterName: getQuarterName(evalQuarter),
      expectedPACESPerQuarter,
      actualPACES,
      isOnTrack,
      deficit: Math.max(0, deficit),
      status,
      percentage
    };
  } catch (error) {
    console.error("❌ Error calculating PACES:", error);
    return {
      quarter: 'Q1', quarterName: getQuarterName('Q1'), expectedPACESPerQuarter: 4,
      actualPACES: 0, isOnTrack: false, deficit: 4, status: 'alert', percentage: 0
    };
  }
}
