
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [isParent, setIsParent] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const checkRole = async () => {
      console.log('🛡️ AdminRoute: Checking authorization...');
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          console.warn('❌ AdminRoute: No authenticated user found.');
          setAuthorized(false);
          setLoading(false);
          return;
        }

        console.log(`✅ AdminRoute: User authenticated (${user.email}). Fetching profile...`);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          console.error('❌ AdminRoute: Failed to fetch user profile explicitly.', profileError?.message || 'No profile found.');
          setAuthorized(false);
          setLoading(false);
          return;
        }

        let role = profile.role;
        if (!role || typeof role !== 'string') {
          console.warn('⚠️ AdminRoute: Profile role is missing, null, or not a string. Denying access.');
          setAuthorized(false);
          setLoading(false);
          return;
        }

        // Normalize to lowercase for safe comparisons
        role = role.toLowerCase().trim();
        console.log(`✅ AdminRoute: Normalized user role is '${role}'`);

        if (role === 'parent') {
          console.log('⚠️ AdminRoute: Parent user trying to access admin route, redirecting to /portal-familia');
          setIsParent(true);
          setAuthorized(false);
        } else if (['admin', 'super admin', 'super_admin', 'teacher'].includes(role)) {
          console.log('✅ AdminRoute: User authorized for admin route.');
          setAuthorized(true);
        } else {
           console.log(`⚠️ AdminRoute: Unknown/Guest role '${role}'. Denying access.`);
           setAuthorized(false);
        }
      } catch (err) {
        console.error('❌ AdminRoute: Unexpected error during role check:', err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkRole();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B2D5C]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
          <p className="text-white text-sm animate-pulse">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (isParent) {
    return <Navigate to="/portal-familia" replace />;
  }

  if (!authorized) {
    console.warn('⚠️ AdminRoute: Redirecting unauthorized or unauthenticated user to login.');
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminRoute;
