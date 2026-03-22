import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/supabase';
const EnrollmentWizard = () => {
  const {
    language
  } = useAuth();
  const {
    t
  } = useTranslation(language);
  const {
    toast
  } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [students, setStudents] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [formData, setFormData] = useState({
    student_id: '',
    new_student_name: '',
    new_student_email: '',
    program_type: 'offcampus',
    activation_date: '',
    hub_tutor_id: ''
  });
  const totalSteps = 5;
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    const allUsers = await db.users.getAll();
    const studentUsers = allUsers.filter(u => u.role === 'student');
    const tutorUsers = allUsers.filter(u => u.role === 'tutor');
    setStudents(studentUsers);
    setTutors(tutorUsers);
  };
  const handleNext = () => {
    if (currentStep === 1 && !formData.student_id && !formData.new_student_name) {
      toast({
        title: "Error",
        description: "Please select a student or create a new one",
        variant: "destructive"
      });
      return;
    }
    if (currentStep === 3 && !formData.activation_date) {
      toast({
        title: "Error",
        description: "Please set an activation date",
        variant: "destructive"
      });
      return;
    }
    if (currentStep === 4 && formData.program_type === 'hub' && !formData.hub_tutor_id) {
      toast({
        title: "Error",
        description: "Please assign a Hub Tutor",
        variant: "destructive"
      });
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  const handleSubmit = async () => {
    try {
      let studentId = formData.student_id;

      // Create new student if needed
      if (!studentId && formData.new_student_name) {
        const newUser = await db.users.create({
          name: formData.new_student_name,
          email: formData.new_student_email,
          role: 'student',
          status: 'active',
          language_preference: 'en',
          password_hash: 'temp123'
        });
        studentId = newUser.id;
      }

      // Create student enrollment record
      await db.students.create({
        user_id: studentId,
        program_type: formData.program_type,
        activation_date: formData.activation_date,
        hub_tutor_id: formData.program_type === 'hub' ? formData.hub_tutor_id : null
      });

      // Create hub assignment if hub-based program
      if (formData.program_type === 'hub' && formData.hub_tutor_id) {
        await db.hubAssignments.create({
          student_id: studentId,
          tutor_id: formData.hub_tutor_id
        });
      }
      toast({
        title: "Success",
        description: t('enroll_success')
      });

      // Reset form
      setFormData({
        student_id: '',
        new_student_name: '',
        new_student_email: '',
        program_type: 'offcampus',
        activation_date: '',
        hub_tutor_id: ''
      });
      setCurrentStep(1);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <div className="space-y-4">
            <div>
              <Label htmlFor="student">{t('enroll_select_student')}</Label>
              <Select id="student" value={formData.student_id} onChange={e => setFormData({
              ...formData,
              student_id: e.target.value
            })}>
                <option value="">-- Select Student --</option>
                {students.map(student => <option key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </option>)}
              </Select>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gradient-to-br from-slate-900 to-purple-900 px-2 text-white/60">
                  {t('enroll_create_student')}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="new_name">New Student Name</Label>
              <Input id="new_name" value={formData.new_student_name} onChange={e => setFormData({
              ...formData,
              new_student_name: e.target.value
            })} placeholder="Student Name" />
            </div>
            
            <div>
              <Label htmlFor="new_email">New Student Email</Label>
              <Input id="new_email" type="email" value={formData.new_student_email} onChange={e => setFormData({
              ...formData,
              new_student_email: e.target.value
            })} placeholder="student@example.com" />
            </div>
          </div>;
      case 2:
        return <div className="space-y-4">
            <Label>Select Program Type</Label>
            <div className="space-y-3">
              <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.program_type === 'offcampus' ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 bg-white/5'}`}>
                <input type="radio" name="program" value="offcampus" checked={formData.program_type === 'offcampus'} onChange={e => setFormData({
                ...formData,
                program_type: e.target.value
              })} className="mt-1" />
                <div className="ml-3">
                  <p className="font-semibold text-white">{t('enroll_program_offcampus')}</p>
                  <p className="text-sm text-white/60">Self-paced learning with 60/20/20 curriculum split</p>
                </div>
              </label>

              <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.program_type === 'dual' ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 bg-white/5'}`}>
                <input type="radio" name="program" value="dual" checked={formData.program_type === 'dual'} onChange={e => setFormData({
                ...formData,
                program_type: e.target.value
              })} className="mt-1" />
                <div className="ml-3">
                  <p className="font-semibold text-white">{t('enroll_program_dual')}</p>
                  <p className="text-sm text-white/60">Transfer up to 75% of credits from previous school</p>
                </div>
              </label>

              <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.program_type === 'hub' ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 bg-white/5'}`}>
                <input type="radio" name="program" value="hub" checked={formData.program_type === 'hub'} onChange={e => setFormData({
                ...formData,
                program_type: e.target.value
              })} className="mt-1" />
                <div className="ml-3">
                  <p className="font-semibold text-white">{t('enroll_program_hub')}</p>
                  <p className="text-sm text-white/60">In-person support at designated hub locations</p>
                </div>
              </label>
            </div>
          </div>;
      case 3:
        return <div className="space-y-4">
            <div>
              <Label htmlFor="activation_date">{t('enroll_activation')}</Label>
              <Input id="activation_date" type="date" value={formData.activation_date} onChange={e => setFormData({
              ...formData,
              activation_date: e.target.value
            })} />
              <p className="text-sm text-white/60 mt-2">
                This date triggers personal trimester calculations for the student
              </p>
            </div>
          </div>;
      case 4:
        if (formData.program_type !== 'hub') {
          return <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
              <p className="text-white/60">
                Hub Tutor assignment is only required for Hub-based programs
              </p>
            </div>;
        }
        return <div className="space-y-4">
            <div>
              <Label htmlFor="tutor">{t('enroll_tutor')}</Label>
              <Select id="tutor" value={formData.hub_tutor_id} onChange={e => setFormData({
              ...formData,
              hub_tutor_id: e.target.value
            })}>
                <option value="">-- Select Hub Tutor --</option>
                {tutors.map(tutor => <option key={tutor.id} value={tutor.id}>
                    {tutor.name} ({tutor.email})
                  </option>)}
              </Select>
            </div>
          </div>;
      case 5:
        const selectedStudent = students.find(s => s.id === formData.student_id);
        const selectedTutor = tutors.find(t => t.id === formData.hub_tutor_id);
        return <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">{t('enroll_confirm')}</h3>
            
            <div className="bg-white/5 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-white/60">Student:</span>
                <span className="text-white font-medium">
                  {selectedStudent?.name || formData.new_student_name}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/60">Email:</span>
                <span className="text-white font-medium">
                  {selectedStudent?.email || formData.new_student_email}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/60">Program Type:</span>
                <span className="text-white font-medium">
                  {formData.program_type === 'offcampus' && 'Off-Campus (60/20/20)'}
                  {formData.program_type === 'dual' && 'Dual Diploma (75% transfer)'}
                  {formData.program_type === 'hub' && 'Hub-based'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-white/60">Activation Date:</span>
                <span className="text-white font-medium">{formData.activation_date}</span>
              </div>
              
              {formData.program_type === 'hub' && formData.hub_tutor_id && <div className="flex justify-between">
                  <span className="text-white/60">Hub Tutor:</span>
                  <span className="text-white font-medium">{selectedTutor?.name}</span>
                </div>}
            </div>
          </div>;
      default:
        return null;
    }
  };
  return <AdminLayout>
      <Helmet>
        <title>Enrollment Wizard - CHANAK International Academy</title>
        <meta name="description" content="Enroll students in academic programs" />
      </Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('enroll_title')}</h1>
          <p className="text-white/60">Step-by-step student enrollment process</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map(step => <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${currentStep >= step ? 'bg-purple-500 border-purple-500 text-white' : 'bg-white/5 border-white/20 text-white/40'}`}>
                {step}
              </div>
              {step < 5 && <div className={`flex-1 h-1 mx-2 transition-all ${currentStep > step ? 'bg-purple-500' : 'bg-white/20'}`} />}
            </div>)}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Step {currentStep}: {currentStep === 1 ? t('enroll_step1') : currentStep === 2 ? t('enroll_step2') : currentStep === 3 ? t('enroll_step3') : currentStep === 4 ? t('enroll_step4') : t('enroll_step5')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}

            <div className="flex justify-between mt-6 pt-6 border-t border-white/10">
              <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1} className="text-white/70 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('enroll_back')}
              </Button>
              
              {currentStep < totalSteps ? <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700">
                  {t('enroll_next')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button> : <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('enroll_confirm')}
                </Button>}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>;
};
export default EnrollmentWizard;