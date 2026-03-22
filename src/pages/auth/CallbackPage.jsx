
import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Loader2 } from 'lucide-react';

const CallbackPage = () => {
  const hasProcessed = useRef(false);
  const [status, setStatus] = useState('Processing verification...');
  const [redirectPath, setRedirectPath] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      console.log('🔐 [AuthCallback] Init', window.location.href);
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const next = urlParams.get('next') || '/';
        const type = urlParams.get('type');
        
        console.log(`➡️ [AuthCallback] Params -> code: ${!!code}, type: ${type}, next: ${next}`);

        if (code) {
          console.log('🔐 [AuthCallback] Exchanging code for session...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('❌ [AuthCallback] Session exchange failed:', error);
            throw error;
          }
          
          console.log('✅ [AuthCallback] Session exchange successful', data.session?.user?.id);
          
          // Clean the URL
          window.history.replaceState({}, document.title, window.location.pathname);
          console.log('✅ [AuthCallback] URL cleaned.');

          // User metadata inspection
          const metadata = data.session?.user?.user_metadata || {};
          console.log('➡️ [AuthCallback] User Metadata:', metadata);

          if (type === 'recovery' || type === 'invite') {
            console.log(`➡️ [AuthCallback] Type is ${type}, redirecting to /auth/reset`);
            setRedirectPath('/auth/reset');
          } else {
            console.log(`➡️ [AuthCallback] Redirecting to next: ${next}`);
            setRedirectPath(next);
          }
        } else {
          console.log('➡️ [AuthCallback] No code found in URL, checking session directly...');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('✅ [AuthCallback] Session found natively');
            const hash = window.location.hash;
            if (hash && hash.includes('type=recovery')) {
               console.log('➡️ [AuthCallback] Hash contains recovery, redirecting to /auth/reset');
               setRedirectPath('/auth/reset');
            } else {
               console.log('➡️ [AuthCallback] Redirecting to /');
               setRedirectPath('/');
            }
          } else {
            console.log('❌ [AuthCallback] No session found, redirecting to login');
            setRedirectPath('/');
          }
        }
      } catch (error) {
        console.error('❌ [AuthCallback] Global catch error:', error);
        setStatus('Verification failed. Redirecting...');
        setTimeout(() => setRedirectPath('/'), 2000);
      }
    };

    handleCallback();
  }, []);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B2D5C] text-white">
      <Loader2 className="h-12 w-12 animate-spin text-[#2F80ED] mb-4" />
      <h2 className="text-xl font-semibold">{status}</h2>
      <p className="text-white/60 text-sm mt-2">Please wait while we secure your connection...</p>
    </div>
  );
};

export default CallbackPage;
