
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BarChart2, Save } from 'lucide-react';

const Gradebook = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // Array of 12 grades
  const [grades, setGrades] = useState(Array(12).fill(''));

  useEffect(() => {
    if (userRole && !['Admin', 'SuperAdmin', 'Teacher', 'super_admin', 'admin'].includes(userRole)) {
      navigate('/');
      return;
    }
    fetchInitialData();
  }, [userRole, navigate]);

  useEffect(() => {
    if (selectedStudent && selectedCourse) {
      fetchGrades(selectedStudent, selectedCourse);
    } else {
      setGrades(Array(12).fill(''));
    }
  }, [selectedStudent, selectedCourse]);

  const fetchInitialData = async () => {
    console.log('📊 Gradebook: Fetching students and courses...');
    setLoading(true);
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name').order('last_name'),
        supabase.from('courses').select('id, name, subject').order('name')
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (coursesRes.error) throw coursesRes.error;

      setStudents(studentsRes.data || []);
      setCourses(coursesRes.data || []);
      console.log(`✅ Gradebook: Loaded ${studentsRes.data?.length} students and ${coursesRes.data?.length} courses`);
    } catch (error) {
      console.error('❌ Gradebook: Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load initial data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async (studentId, courseId) => {
    console.log(`📊 Gradebook: Fetching grades for student ${studentId} in course ${courseId}...`);
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('course_id', courseId);

      if (error) throw error;

      console.log(`✅ Gradebook: Grades loaded for current selection`);
      
      const newGrades = Array(12).fill('');
      if (data && data.length > 0) {
        data.forEach(grade => {
          if (grade.pace_number >= 1 && grade.pace_number <= 12) {
            newGrades[grade.pace_number - 1] = grade.score !== null ? grade.score.toString() : '';
          }
        });
      }
      setGrades(newGrades);
    } catch (error) {
      console.error('❌ Gradebook: Error fetching grades:', error);
      toast({ title: 'Error', description: 'Failed to load grades', variant: 'destructive' });
    }
  };

  const handleGradeChange = (index, value) => {
    // Only allow numbers and basic validation up to 100
    if (value !== '' && (isNaN(value) || Number(value) < 0 || Number(value) > 100)) {
      return;
    }
    const newGrades = [...grades];
    newGrades[index] = value;
    setGrades(newGrades);
  };

  const calculateAverage = () => {
    const validGrades = grades.filter(g => g !== '' && !isNaN(g)).map(Number);
    if (validGrades.length === 0) return 0;
    const sum = validGrades.reduce((a, b) => a + b, 0);
    return (sum / validGrades.length).toFixed(2);
  };

  const handleSave = async () => {
    if (!selectedStudent || !selectedCourse) {
      toast({ title: 'Validation Error', description: 'Please select both a student and a course', variant: 'destructive' });
      return;
    }

    console.log('📊 Gradebook: Saving grades...');
    setSaving(true);
    
    try {
      const gradesToUpsert = grades.map((score, index) => ({
        student_id: selectedStudent,
        course_id: selectedCourse,
        pace_number: index + 1,
        score: score === '' ? null : Number(score),
        updated_at: new Date().toISOString()
      })).filter(g => g.score !== null); // Only save actual entered values to save db space

      if (gradesToUpsert.length === 0) {
        toast({ title: 'Info', description: 'No grades to save' });
        setSaving(false);
        return;
      }

      // Upsert logic relies on the UNIQUE constraint (student_id, course_id, pace_number)
      const { error } = await supabase
        .from('grades')
        .upsert(gradesToUpsert, { onConflict: 'student_id, course_id, pace_number' });

      if (error) throw error;
      
      console.log('✅ Gradebook: Grades saved successfully');
      toast({ title: 'Success', description: 'Grades saved successfully' });
    } catch (error) {
      console.error('❌ Gradebook: Error saving grades:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save grades', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <BarChart2 className="w-8 h-8 text-indigo-600" />
        <h1 className="text-3xl font-bold text-slate-800">PACE Gradebook</h1>
      </div>

      <Card className="mb-6 shadow-md border-slate-200">
        <CardHeader>
          <CardTitle>Select Target</CardTitle>
          <CardDescription>Choose a student and course to manage PACE grades</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="student">Student</Label>
            <select
              id="student"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">-- Select Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="course">Course</Label>
            <select
              id="course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">-- Select Course --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {selectedStudent && selectedCourse && (
        <Card className="shadow-md border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Enter PACE Scores</CardTitle>
              <CardDescription>Values must be between 0 and 100</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 font-medium">Current Average</p>
              <p className="text-2xl font-bold text-indigo-600">{calculateAverage()}%</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              {grades.map((grade, index) => (
                <div key={index} className="space-y-1">
                  <Label htmlFor={`pace-${index + 1}`} className="text-xs font-semibold text-slate-500 uppercase">
                    PACE {index + 1}
                  </Label>
                  <Input
                    id={`pace-${index + 1}`}
                    type="number"
                    min="0"
                    max="100"
                    value={grade}
                    onChange={(e) => handleGradeChange(index, e.target.value)}
                    placeholder="Score"
                    className={`bg-white text-center font-medium ${grade !== '' && Number(grade) < 80 ? 'border-red-300 text-red-700 bg-red-50' : 'border-slate-300 text-slate-900'}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Grades</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Gradebook;
