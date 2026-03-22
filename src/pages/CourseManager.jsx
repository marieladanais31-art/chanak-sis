
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BookOpen, Trash2, Edit2, Plus } from 'lucide-react';

const CourseManager = () => {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    block: 'A',
    grade_level: ''
  });

  useEffect(() => {
    if (userRole && !['Admin', 'SuperAdmin', 'Teacher', 'super_admin', 'admin'].includes(userRole)) {
      navigate('/');
      return;
    }
    fetchCourses();
  }, [userRole, navigate]);

  const fetchCourses = async () => {
    console.log('📚 CourseManager: Fetching courses...');
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
      console.log(`✅ CourseManager: ${data?.length || 0} Courses loaded`);
    } catch (error) {
      console.error('❌ CourseManager: Error fetching courses:', error);
      toast({ title: 'Error', description: 'Failed to load courses', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📚 CourseManager: Submitting course data...', formData);
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('courses')
          .update({
            name: formData.name,
            subject: formData.subject,
            block: formData.block,
            grade_level: formData.grade_level,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: 'Success', description: 'Course updated successfully' });
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([{
            name: formData.name,
            subject: formData.subject,
            block: formData.block,
            grade_level: formData.grade_level,
            created_at: new Date().toISOString()
          }]);

        if (error) throw error;
        toast({ title: 'Success', description: 'Course created successfully' });
      }

      setFormData({ name: '', subject: '', block: 'A', grade_level: '' });
      setEditingId(null);
      fetchCourses();
    } catch (error) {
      console.error('❌ CourseManager: Error saving course:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save course', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (course) => {
    setEditingId(course.id);
    setFormData({
      name: course.name || '',
      subject: course.subject || '',
      block: course.block || 'A',
      grade_level: course.grade_level || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    console.log(`📚 CourseManager: Deleting course ${id}...`);
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Course deleted successfully' });
      fetchCourses();
    } catch (error) {
      console.error('❌ CourseManager: Error deleting course:', error);
      toast({ title: 'Error', description: 'Failed to delete course', variant: 'destructive' });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen className="w-8 h-8 text-indigo-600" />
        <h1 className="text-3xl font-bold text-slate-800">Course Manager</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <Card className="lg:col-span-1 shadow-md border-slate-200 h-fit">
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Course' : 'Create New Course'}</CardTitle>
            <CardDescription>Add or modify course details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Algebra I"
                  required
                  className="bg-white text-slate-900 border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="e.g. Mathematics"
                  required
                  className="bg-white text-slate-900 border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="block">Block</Label>
                <select
                  id="block"
                  name="block"
                  value={formData.block}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                  required
                >
                  <option value="A">Block A</option>
                  <option value="B">Block B</option>
                  <option value="C">Block C</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade_level">Grade Level</Label>
                <Input
                  id="grade_level"
                  name="grade_level"
                  value={formData.grade_level}
                  onChange={handleInputChange}
                  placeholder="e.g. 9th Grade"
                  required
                  className="bg-white text-slate-900 border-slate-300"
                />
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  {editingId ? 'Update Course' : 'Add Course'}
                </Button>
                {editingId && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditingId(null);
                      setFormData({ name: '', subject: '', block: 'A', grade_level: '' });
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* List Section */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : courses.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center h-64">
              <BookOpen className="w-12 h-12 text-slate-400 mb-4" />
              <p className="text-slate-500 font-medium">No courses found</p>
              <p className="text-slate-400 text-sm">Create your first course to get started.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {courses.map(course => (
                <Card key={course.id} className="shadow-sm hover:shadow-md transition-shadow border-slate-200 group">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-slate-800 line-clamp-1" title={course.name}>{course.name}</h3>
                      <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded font-semibold border border-indigo-200">
                        Block {course.block}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 mb-4 flex-1">
                      <p><span className="font-medium text-slate-700">Subject:</span> {course.subject}</p>
                      <p><span className="font-medium text-slate-700">Grade:</span> {course.grade_level}</p>
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm" className="h-8 text-slate-600" onClick={() => handleEdit(course)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" className="h-8" onClick={() => handleDelete(course.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseManager;
