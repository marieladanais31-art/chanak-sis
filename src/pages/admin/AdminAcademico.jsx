
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, X, Edit, Trash2, Plus, BookOpen, GraduationCap, FileText, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import AdminLayout from '@/components/AdminLayout';

export default function AdminAcademico() {
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Adding new grade state
  const [isAdding, setIsAdding] = useState(false);
  const [newGradeData, setNewGradeData] = useState({ subject: '', pace_number: '', score: '' });

  // Inline editing state for grades
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [editFormData, setEditFormData] = useState({ subject: '', pace_number: '', score: '' });

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentAcademicData(selectedStudentId);
    } else {
      setGrades([]);
      setIsAdding(false);
      setEditingGradeId(null);
    }
  }, [selectedStudentId]);

  const fetchStudents = async () => {
    try {
      console.log('📚 [AdminAcademico] Fetching students list...');
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, grade_level, academic_level')
        .order('first_name');
        
      if (error) throw error;
      setStudents(data || []);
      console.log(`✅ [AdminAcademico] Loaded ${data?.length || 0} students.`);
    } catch (err) {
      console.error('❌ [AdminAcademico] Error fetching students:', err);
      toast({ title: "Error", description: "Failed to load students.", variant: "destructive" });
    }
  };

  const loadStudentAcademicData = async (studentId) => {
    setLoading(true);
    try {
      console.log(`📚 [AdminAcademico] Fetching PACEs for student: ${studentId}`);
      
      const { data: gradesData, error: gradesError } = await supabase
        .from('student_grades')
        .select('*')
        .eq('student_id', studentId)
        .order('subject', { ascending: true })
        .order('pace_number', { ascending: true });
        
      if (gradesError) throw gradesError;
      setGrades(gradesData || []);
      
      console.log(`✅ [AdminAcademico] Loaded ${gradesData?.length || 0} PACE records successfully.`);
    } catch (err) {
      console.error('❌ [AdminAcademico] Error loading academic data:', err);
      toast({ title: "Error", description: "Failed to load academic data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGrade = async () => {
    if (!newGradeData.subject || !newGradeData.pace_number) {
      toast({ title: "Warning", description: "Subject and PACE number are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      console.log(`➕ [AdminAcademico] Adding new PACE record for student: ${selectedStudentId}`);
      const payload = {
        student_id: selectedStudentId,
        subject: newGradeData.subject,
        pace_number: parseInt(newGradeData.pace_number, 10),
        score: newGradeData.score ? parseFloat(newGradeData.score) : null,
      };

      const { error } = await supabase.from('student_grades').insert([payload]);
      if (error) throw error;

      console.log(`✅ [AdminAcademico] New PACE added successfully.`);
      toast({ title: "Success", description: "PACE record added successfully." });
      setNewGradeData({ subject: '', pace_number: '', score: '' });
      setIsAdding(false);
      loadStudentAcademicData(selectedStudentId);
    } catch (err) {
      console.error('❌ [AdminAcademico] Error adding PACE:', err);
      toast({ title: "Error", description: "Failed to add PACE record.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const startEditGrade = (grade) => {
    setEditingGradeId(grade.id);
    setEditFormData({
      subject: grade.subject || '',
      pace_number: grade.pace_number || '',
      score: grade.score || ''
    });
  };

  const cancelEditGrade = () => {
    setEditingGradeId(null);
    setEditFormData({ subject: '', pace_number: '', score: '' });
  };

  const saveGrade = async (gradeId) => {
    setSaving(true);
    try {
      console.log(`✏️ [AdminAcademico] Updating PACE ID: ${gradeId}`);
      const { error } = await supabase
        .from('student_grades')
        .update({
          subject: editFormData.subject,
          pace_number: editFormData.pace_number ? parseInt(editFormData.pace_number, 10) : null,
          score: editFormData.score ? parseFloat(editFormData.score) : null
        })
        .eq('id', gradeId);

      if (error) throw error;
      console.log(`✅ [AdminAcademico] PACE updated successfully.`);
      toast({ title: "Success", description: "PACE updated successfully." });
      cancelEditGrade();
      loadStudentAcademicData(selectedStudentId);
    } catch (err) {
      console.error('❌ [AdminAcademico] Error updating PACE:', err);
      toast({ title: "Error", description: "Failed to update PACE.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteGrade = async (gradeId) => {
    if (!window.confirm('Are you sure you want to delete this PACE record?')) return;
    try {
      console.log(`🗑️ [AdminAcademico] Deleting PACE ID: ${gradeId}`);
      const { error } = await supabase.from('student_grades').delete().eq('id', gradeId);
      if (error) throw error;
      console.log(`✅ [AdminAcademico] PACE deleted successfully.`);
      toast({ title: "Success", description: "PACE deleted successfully." });
      loadStudentAcademicData(selectedStudentId);
    } catch (err) {
      console.error('❌ [AdminAcademico] Error deleting PACE:', err);
      toast({ title: "Error", description: "Failed to delete PACE.", variant: "destructive" });
    }
  };

  const getStatusBadge = (score) => {
    if (score === null || score === undefined || score === '') return <span className="text-slate-400 text-xs font-medium">Pending</span>;
    const numScore = parseFloat(score);
    if (numScore >= 80) return <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold"><CheckCircle2 className="w-3 h-3"/> Passed</span>;
    if (numScore >= 60) return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-bold"><AlertTriangle className="w-3 h-3"/> In Progress</span>;
    return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold"><XCircle className="w-3 h-3"/> Needs Work</span>;
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const totalPaces = grades.length;
  const completedPaces = grades.filter(g => g.score !== null && g.score >= 80).length;
  const avgScore = grades.filter(g => g.score !== null).reduce((acc, curr, _, arr) => acc + (parseFloat(curr.score) / arr.length), 0).toFixed(1);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-white">PACE Management</h1>
          <p className="text-white/60">Track and update student PACE scores and progress.</p>
        </div>

        <Card className="border-indigo-100 shadow-md">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              Student Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-w-md">
              <Label className="text-slate-700 mb-2 block">Select Student</Label>
              <select
                className="w-full bg-white text-slate-900 border border-slate-200 rounded-md px-3 py-2 h-10 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">-- Choose a student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name} {s.academic_level || s.grade_level ? `(${s.academic_level || s.grade_level})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {selectedStudentId && (
          <>
            {loading ? (
              <div className="flex justify-center p-12 bg-white rounded-xl shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Stats / Info Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><BookOpen className="w-6 h-6"/></div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Total PACEs</p>
                        <p className="text-2xl font-bold text-slate-800">{totalPaces}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 bg-green-100 text-green-700 rounded-lg"><CheckCircle2 className="w-6 h-6"/></div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Passed PACEs</p>
                        <p className="text-2xl font-bold text-slate-800">{completedPaces}</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3 bg-amber-100 text-amber-700 rounded-lg"><GraduationCap className="w-6 h-6"/></div>
                      <div>
                        <p className="text-sm text-slate-500 font-medium">Average Score</p>
                        <p className="text-2xl font-bold text-slate-800">{isNaN(avgScore) ? '0' : avgScore}%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* PACEs Table */}
                <Card className="shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between border-b pb-4 bg-slate-50">
                    <div>
                      <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        PACE Records
                      </CardTitle>
                      <CardDescription>Manage individual PACE scores for {selectedStudent?.first_name}</CardDescription>
                    </div>
                    {!isAdding && (
                      <Button onClick={() => setIsAdding(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Plus className="w-4 h-4 mr-2" /> Add PACE
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-3">Subject</th>
                            <th className="px-6 py-3">PACE #</th>
                            <th className="px-6 py-3">Score (%)</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          
                          {/* Add Form Row */}
                          {isAdding && (
                            <tr className="bg-indigo-50/50">
                              <td className="px-6 py-3">
                                <Input 
                                  placeholder="e.g. Math" 
                                  value={newGradeData.subject} 
                                  onChange={e => setNewGradeData({...newGradeData, subject: e.target.value})}
                                  className="h-8 bg-white"
                                />
                              </td>
                              <td className="px-6 py-3">
                                <Input 
                                  type="number" 
                                  placeholder="#" 
                                  value={newGradeData.pace_number} 
                                  onChange={e => setNewGradeData({...newGradeData, pace_number: e.target.value})}
                                  className="w-20 h-8 bg-white"
                                />
                              </td>
                              <td className="px-6 py-3">
                                <Input 
                                  type="number" 
                                  placeholder="0-100" 
                                  value={newGradeData.score} 
                                  onChange={e => setNewGradeData({...newGradeData, score: e.target.value})}
                                  className="w-24 h-8 bg-white"
                                />
                              </td>
                              <td className="px-6 py-3">-</td>
                              <td className="px-6 py-3 text-right space-x-2">
                                <Button variant="ghost" size="sm" onClick={handleAddGrade} disabled={saving} className="text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 h-8">
                                  Save
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} disabled={saving} className="text-slate-500 hover:bg-slate-100 px-3 h-8">
                                  Cancel
                                </Button>
                              </td>
                            </tr>
                          )}

                          {/* Existing Records */}
                          {grades.length === 0 && !isAdding ? (
                            <tr>
                              <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                <div className="flex flex-col items-center justify-center">
                                  <FileText className="w-10 h-10 text-slate-300 mb-3" />
                                  <p>No PACE records found for this student.</p>
                                </div>
                              </td>
                            </tr>
                          ) : (
                            grades.map(grade => {
                              const isEditing = editingGradeId === grade.id;
                              return (
                                <tr key={grade.id} className={isEditing ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}>
                                  
                                  <td className="px-6 py-3 font-medium text-slate-800">
                                    {isEditing ? (
                                      <Input 
                                        value={editFormData.subject} 
                                        onChange={e => setEditFormData({...editFormData, subject: e.target.value})}
                                        className="h-8 bg-white"
                                      />
                                    ) : (
                                      grade.subject || 'Unknown'
                                    )}
                                  </td>
                                  
                                  <td className="px-6 py-3">
                                    {isEditing ? (
                                      <Input 
                                        type="number" 
                                        value={editFormData.pace_number} 
                                        onChange={e => setEditFormData({...editFormData, pace_number: e.target.value})}
                                        className="w-20 h-8 bg-white"
                                      />
                                    ) : (
                                      <span className="inline-flex items-center justify-center min-w-[2rem] h-6 bg-slate-100 border border-slate-200 rounded text-xs font-bold text-slate-700">
                                        {grade.pace_number || '-'}
                                      </span>
                                    )}
                                  </td>
                                  
                                  <td className="px-6 py-3">
                                    {isEditing ? (
                                      <Input 
                                        type="number" 
                                        value={editFormData.score} 
                                        onChange={e => setEditFormData({...editFormData, score: e.target.value})}
                                        className="w-24 h-8 bg-white"
                                      />
                                    ) : (
                                      <span className="font-semibold text-slate-700">{grade.score !== null ? `${grade.score}%` : '-'}</span>
                                    )}
                                  </td>
                                  
                                  <td className="px-6 py-3">
                                    {!isEditing && getStatusBadge(grade.score)}
                                  </td>
                                  
                                  <td className="px-6 py-3 text-right space-x-1">
                                    {isEditing ? (
                                      <>
                                        <Button variant="ghost" size="sm" onClick={() => saveGrade(grade.id)} disabled={saving} className="text-green-600 hover:text-green-700 hover:bg-green-50 px-2 h-8">
                                          <Save className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={cancelEditGrade} disabled={saving} className="text-slate-500 hover:bg-slate-100 px-2 h-8">
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button variant="ghost" size="sm" onClick={() => startEditGrade(grade)} className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 h-8">
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => deleteGrade(grade.id)} className="text-red-600 hover:text-red-800 hover:bg-red-50 px-2 h-8">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
