
export const US_GRADE_LEVELS = [
  { value: 'K', label: 'Kindergarten' },
  { value: '1st', label: '1st Grade' },
  { value: '2nd', label: '2nd Grade' },
  { value: '3rd', label: '3rd Grade' },
  { value: '4th', label: '4th Grade' },
  { value: '5th', label: '5th Grade' },
  { value: '6th', label: '6th Grade' },
  { value: '7th', label: '7th Grade' },
  { value: '8th', label: '8th Grade' },
  { value: '9th', label: '9th Grade / Freshman' },
  { value: '10th', label: '10th Grade / Sophomore' },
  { value: '11th', label: '11th Grade / Junior' },
  { value: '12th', label: '12th Grade / Senior' }
];

export const getGradeLabel = (value) => {
  const grade = US_GRADE_LEVELS.find(g => g.value === value);
  return grade ? grade.label : value;
};
