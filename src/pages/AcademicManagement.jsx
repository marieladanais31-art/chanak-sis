
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, BookOpen, Save, Calculator, GraduationCap } from 'lucide-react';

const AcademicManagement = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState('paces');

  // PACEs state (12 fields)
  const [paces, setPaces] = useState(Array(12).fill(''));
  
  // Credits state
  const [credits, setCredits] = useState('');

  useEffect(() => {
    if (userRole && !['Admin', 'SuperAdmin', 'Teacher', 'super_admin', 'admin'].includes(userRole)) {
      console.warn('❌ Unauthorized access attempt to Academic Management');
      navigate('/');
      return;
    }
    fetchInitialData();
  }, [userRole, navigate]);

  useEffect(() => {
    if (selectedStudent && selectedCourse) {
      fetchGrades(selectedStudent, selectedCourse);
    } else {
      setPaces(Array(12).fill(''));
      setCredits('');
    }
  }, [selectedStudent, selectedCourse]);

  const fetchInitialData = async () => {
    console.log('📚 AcademicMgmt: Fetching students and courses...');
    setLoading(true);
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        supabase.from('students').select('id, first_name, last_name').order('last_name'),
        supabase.from('courses').select('id, name, subject, block').order('name')
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (coursesRes.error) throw coursesRes.error;

      setStudents(studentsRes.data || []);
      setCourses(coursesRes.data || []);
      console.log(`✅ AcademicMgmt: Loaded ${studentsRes.data?.length} students and ${coursesRes.data?.length} courses`);
    } catch (error) {
      console.error('❌ AcademicMgmt: Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load initial data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async (studentId, courseId) => {
    console.log(`📚 AcademicMgmt: Fetching records for student ${studentId} in course ${courseId}...`);
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*')
        .eq('student_id', studentId)
        .eq('course_id', courseId);

      if (error) throw error;

      console.log(`✅ AcademicMgmt: Records loaded for current selection`);
      
      const newPaces = Array(12).fill('');
      let currentCredits = '';

      if (data && data.length > 0) {
        data.forEach(record => {
          if (record.pace_number >= 1 && record.pace_number <= 12 && record.score !== null) {
            newPaces[record.pace_number - 1] = record.score.toString();
          }
          if (record.credit_value !== null) {
            currentCredits = record.credit_value.toString();
          }
        });
      }
      
      setPaces(newPaces);
      setCredits(currentCredits);
    } catch (error) {
      console.error('❌ AcademicMgmt: Error fetching records:', error);
      toast({ title: 'Error', description: 'Failed to load records', variant: 'destructive' });
    }
  };

  const handlePaceChange = (index, value) => {
    if (value !== '' && (isNaN(value) || Number(value) < 0 || Number(value) > 100)) return;
    const newPaces = [...paces];
    newPaces[index] = value;
    setPaces(newPaces);
  };

  const handleCreditsChange = (value) => {
    if (value !== '' && (isNaN(value) || Number(value) < 0)) return;
    setCredits(value);
  };

  const calculateAverage = () => {
    const validGrades = paces.filter(g => g !== '' && !isNaN(g)).map(Number);
    if (validGrades.length === 0) return 0;
    const sum = validGrades.reduce((a, b) => a + b, 0);
    return (sum / validGrades.length).toFixed(2);
  };

  const handleSave = async () => {
    if (!selectedStudent || !selectedCourse) {
      toast({ title: 'Validation Error', description: 'Please select both a student and a course', variant: 'destructive' });
      return;
    }

    console.log(`💾 AcademicMgmt: Saving data for tab: ${activeTab}...`);
    setSaving(true);
    
    try {
      let recordsToUpsert = [];
      const timestamp = new Date().toISOString();

      if (activeTab === 'paces') {
        recordsToUpsert = paces.map((score, index) => ({
          student_id: selectedStudent,
          course_id: selectedCourse,
          pace_number: index + 1,
          score: score === '' ? null : Number(score),
          updated_at: timestamp
        })).filter(g => g.score !== null);
      } else if (activeTab === 'credits') {
        recordsToUpsert = [{
          student_id: selectedStudent,
          course_id: selectedCourse,
          pace_number: 99, // Arbitrary number to differentiate credit entry if unique constraint involves pace_number
          credit_value: credits === '' ? null : Number(credits),
          updated_at: timestamp
        }].filter(g => g.credit_value !== null);
      }

      if (recordsToUpsert.length === 0) {
        toast({ title: 'Info', description: 'No data to save' });
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('grades')
        .upsert(recordsToUpsert, { onConflict: 'student_id, course_id, pace_number' });

      if (error) throw error;
      
      console.log('✅ AcademicMgmt: Data saved successfully');
      toast({ title: 'Success', description: 'Academic records saved successfully' });
    } catch (error) {
      console.error('❌ AcademicMgmt: Error saving records:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save records', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const selectedCourseDetails = courses.find(c => c.id === selectedCourse);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <GraduationCap className="w-8 h-8 text-indigo-600" />
        <h1 className="text-3xl font-bold text-slate-800">Academic Management</h1>
      </div>

      <Card className="mb-6 shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle>Select Target</CardTitle>
          <CardDescription>Choose a student and a course to manage academic records</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="student">Student</Label>
            <select
              id="student"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select Course --</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.block ? `Block ${c.block}` : 'No Block'})</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {selectedStudent && selectedCourse && (
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle>Record Entry: {selectedCourseDetails?.name}</CardTitle>
            <CardDescription>Manage grades or credits for this subject</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="paces">PACE Scores (0-100)</TabsTrigger>
                <TabsTrigger value="credits">Life Skills / Credits</TabsTrigger>
              </TabsList>
              
              <TabsContent value="paces" className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calculator className="w-5 h-5" />
                    <span className="font-medium">Calculated Average:</span>
                  </div>
                  <span className="text-2xl font-bold text-indigo-600">{calculateAverage()}%</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {paces.map((grade, index) => (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-500 uppercase">
                        PACE {index + 1}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={grade}
                        onChange={(e) => handlePaceChange(index, e.target.value)}
                        placeholder="Score"
                        className={`text-center font-medium ${grade !== '' && Number(grade) < 80 ? 'border-red-300 text-red-700 bg-red-50' : ''}`}
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="credits" className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                  <div className="max-w-xs mx-auto space-y-3">
                    <Label className="text-sm font-semibold text-slate-700">
                      Credits Earned
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={credits}
                      onChange={(e) => handleCreditsChange(e.target.value)}
                      placeholder="e.g. 1.0 or 0.5"
                      className="text-center text-lg"
                    />
                    <p className="text-xs text-slate-500 text-center">
                      Enter the credit value earned for Life Skills, Local Outings, or Special Projects.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <div className="flex justify-end pt-6 mt-6 border-t border-slate-100">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 min-w-[140px]"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Records
                </Button>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AcademicManagement;
