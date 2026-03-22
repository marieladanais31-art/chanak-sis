import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, BookOpen, GraduationCap, Users, UserCircle } from 'lucide-react';
import AdminDashboard from '@/pages/AdminDashboard'; // Import existing dashboard for admin view

const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
           console.error('Error fetching profile:', error);
           // Fallback if profile doesn't exist yet (handled in login but safe to have)
        }
        
        setProfile(data);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-[#0B2D5C]" />
      </div>
    );
  }

  // Role-based rendering
  const role = profile?.role || 'student'; // Default to student if undefined

  // Super Admin View (reuse existing component if possible or render content)
  if (role === 'super_admin' || role === 'admin') {
     return <AdminDashboard />;
  }

  // Student View
  if (role === 'student') {
    return (
      <AdminLayout>
         <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Student Dashboard</h1>
            <p className="text-white/60">Welcome back, {profile?.first_name || 'Student'}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Courses</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">5</div>
                        <p className="text-xs text-muted-foreground">Active enrollments</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">GPA</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3.8</div>
                        <p className="text-xs text-muted-foreground">Cumulative</p>
                    </CardContent>
                </Card>
            </div>
         </div>
      </AdminLayout>
    );
  }

  // Parent View
  if (role === 'parent') {
    return (
       <AdminLayout>
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Parent Portal</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Children</CardTitle>
                        <CardDescription>View progress reports and attendance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <UserCircle className="w-10 h-10 text-gray-400" />
                            <div>
                                <p className="font-medium">No students linked yet.</p>
                                <p className="text-sm text-gray-500">Contact administration to link accounts.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
          </div>
       </AdminLayout>
    );
  }

  // Tutor View
  if (role === 'tutor' || role === 'hub_tutor') {
      return (
        <AdminLayout>
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-white">Tutor Dashboard</h1>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Assigned Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground">Active students</p>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
      );
  }

  // Fallback
  return (
    <AdminLayout>
      <div className="p-8 text-white">
        <h1 className="text-2xl">Access Denied</h1>
        <p>Your role ({role}) does not have a dashboard view configured.</p>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;