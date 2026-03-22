import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Building2, Users, UserPlus, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/supabase';

const HubManagement = () => {
  const { language } = useAuth();
  const { t } = useTranslation(language);
  const { toast } = useToast();
  
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTutor, setSelectedTutor] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allUsers = await db.users.getAll();
    const tutorUsers = allUsers.filter(u => u.role === 'tutor');
    const studentUsers = allUsers.filter(u => u.role === 'student');
    
    setTutors(tutorUsers);
    setStudents(studentUsers);

    const allAssignments = await db.hubAssignments.getAll();
    setAssignments(allAssignments);
  };

  const handleAssignStudent = async () => {
    if (!selectedStudent || !selectedTutor) {
      toast({
        title: "Error",
        description: "Please select both student and tutor",
        variant: "destructive",
      });
      return;
    }

    try {
      await db.hubAssignments.create({
        student_id: selectedStudent,
        tutor_id: selectedTutor,
      });

      toast({
        title: "Success",
        description: t('hubs_assigned'),
      });

      setSelectedStudent('');
      setSelectedTutor('');
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      await db.hubAssignments.delete(assignmentId);

      toast({
        title: "Success",
        description: t('hubs_removed'),
      });

      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTutorAssignments = (tutorId) => {
    return assignments.filter(a => a.tutor_id === tutorId);
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student?.name || student?.email || 'Unknown';
  };

  return (
    <AdminLayout>
      <Helmet>
        <title>Hub Management - CHANAK International Academy</title>
        <meta name="description" content="Manage hub tutors and student assignments" />
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('hubs_title')}</h1>
          <p className="text-white/60">Manage hub tutors and their assigned students</p>
        </div>

        {/* Assign Student to Tutor */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              <CardTitle>{t('hubs_assign')}</CardTitle>
            </div>
            <CardDescription>Create a new student-tutor relationship</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="student">{t('hubs_student')}</Label>
                <Select
                  id="student"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  <option value="">-- Select Student --</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.name} ({student.email})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="tutor">{t('hubs_tutor')}</Label>
                <Select
                  id="tutor"
                  value={selectedTutor}
                  onChange={(e) => setSelectedTutor(e.target.value)}
                >
                  <option value="">-- Select Hub Tutor --</option>
                  {tutors.map(tutor => (
                    <option key={tutor.id} value={tutor.id}>
                      {tutor.name} ({tutor.email})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <Button
              onClick={handleAssignStudent}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Student
            </Button>
          </CardContent>
        </Card>

        {/* Hub Tutors List */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-4">{t('hubs_tutors')}</h2>
          
          {tutors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Building2 className="w-12 h-12 mx-auto text-white/40 mb-3" />
                <p className="text-white/60">No hub tutors found</p>
                <p className="text-sm text-white/40 mt-1">Create tutor users in User Management first</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {tutors.map(tutor => {
                const tutorAssignments = getTutorAssignments(tutor.id);
                
                return (
                  <Card key={tutor.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <Building2 className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{tutor.name}</CardTitle>
                            <CardDescription>{tutor.email}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-white/60">
                          <Users className="w-4 h-4" />
                          <span className="text-sm font-medium">{tutorAssignments.length}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {tutorAssignments.length === 0 ? (
                        <p className="text-white/40 text-sm text-center py-4">
                          No students assigned yet
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {tutorAssignments.map(assignment => (
                            <div
                              key={assignment.id}
                              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                            >
                              <div>
                                <p className="text-white font-medium">
                                  {getStudentName(assignment.student_id)}
                                </p>
                                <p className="text-xs text-white/60">
                                  Assigned: {new Date(assignment.assigned_date).toLocaleDateString()}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveAssignment(assignment.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default HubManagement;