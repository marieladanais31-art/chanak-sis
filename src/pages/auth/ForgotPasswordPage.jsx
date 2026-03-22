
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const ForgotPasswordPage = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState(false);

  useEffect(() => {
    const lastSent = localStorage.getItem('last_password_reset_request');
    if (lastSent) {
      const diff = Date.now() - parseInt(lastSent, 10);
      if (diff < 60000) {
        setCooldown(Math.ceil((60000 - diff) / 1000));
      }
    }
  }, []);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  const handleSendReset = async (e) => {
    e.preventDefault();
    console.log('🔐 [ResetPassword] Starting email reset flow for:', email);

    if (!email) {
      console.error('❌ [ResetPassword] Validation failed: Missing email');
      toast({ title: "Error", description: "Please enter an email address.", variant: "destructive" });
      return;
    }

    if (cooldown > 0) {
      console.log(`➡️ [ResetPassword] Blocked by cooldown. Wait ${cooldown}s`);
      return;
    }

    setLoading(true);
    setSuccessMessage(false);

    const redirectTo = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5173/auth/callback' 
      : 'https://sis.chanakacademy.org/auth/callback';

    console.log('➡️ [ResetPassword] Using redirect URL:', redirectTo);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });

      if (error) {
        console.error('❌ [ResetPassword] Supabase error:', error);
        if (error.status === 429) {
            throw new Error("Too many requests. Please wait 1-60 minutes before trying again.");
        }
        if (error.message.includes('Email provider not configured')) {
            throw new Error("Email service is temporarily unavailable. Please contact support.");
        }
        if (error.message.includes('User not found') || error.status === 404) {
            throw new Error("User not found with this email.");
        }
        throw error;
      }

      console.log('✅ [ResetPassword] Reset email sent successfully.');
      localStorage.setItem('last_password_reset_request', Date.now().toString());
      setCooldown(60);
      setSuccessMessage(true);
      setEmail('');
      
      toast({
        title: "Link Sent",
        description: "Please check your email for the password reset link.",
      });

    } catch (err) {
      console.error('❌ [ResetPassword] Caught Error:', err.message);
      toast({
        title: "Request Failed",
        description: err.message || "An error occurred while sending the reset link.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Forgot Password - CHANAK International Academy</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0B2D5C]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
             <div className="flex justify-center mb-4">
              <img 
                src="https://horizons-cdn.hostinger.com/fecf9528-708e-4a5b-9228-805062d89fe9/4c172acccfd6da3811a3ad56c254d1fc.png" 
                alt="CHANAK International Academy logo"
                className="h-12 w-auto"
              />
            </div>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your email address and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage ? (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center text-green-500">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium">Check your email</h3>
                <p className="text-sm text-gray-500">
                  We've sent a password reset link to your email.
                </p>
                <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => setSuccessMessage(false)}
                >
                    Resend Link {cooldown > 0 && `(${cooldown}s)`}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@chanak.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-[#2F80ED] hover:bg-[#1a6bd3]"
                  disabled={loading || cooldown > 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : cooldown > 0 ? (
                    `Wait ${cooldown}s to resend`
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4">
            <Link 
              to="/" 
              className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
