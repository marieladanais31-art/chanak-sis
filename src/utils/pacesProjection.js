
export function calculatePACESProjection(studentStartDate, currentGrades) {
  try {
    const startDate = new Date(studentStartDate);
    const currentDate = new Date();
    
    // Calculate months since enrollment
    const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                       (currentDate.getMonth() - startDate.getMonth());
    
    // Expected: 1 PACE per month (12 per year)
    const expectedTotalPACES = Math.max(1, monthsDiff);
    
    // Count actual PACES (grades with score >= 70)
    const actualPACES = currentGrades.filter(grade => parseFloat(grade.score) >= 70).length;
    
    // Calculate deficit
    const deficit = Math.max(0, expectedTotalPACES - actualPACES);
    
    // Determine if student is on track
    const isOnTrack = actualPACES >= expectedTotalPACES;
    
    // Status: 'active' (on track) or 'alert' (behind)
    const status = isOnTrack ? 'active' : 'alert';
    
    // Calculate percentage
    const percentage = expectedTotalPACES > 0 
      ? Math.min(100, Math.round((actualPACES / expectedTotalPACES) * 100))
      : 0;
    
    console.log(`📊 PACES Projection: Expected=${expectedTotalPACES}, Actual=${actualPACES}, Deficit=${deficit}, Status=${status}`);
    
    return {
      expectedTotalPACES,
      actualPACES,
      isOnTrack,
      deficit,
      status,
      percentage
    };
  } catch (error) {
    console.error('❌ Error calculating PACES projection:', error);
    return {
      expectedTotalPACES: 0,
      actualPACES: 0,
      isOnTrack: false,
      deficit: 0,
      status: 'alert',
      percentage: 0
    };
  }
}
