
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Lock, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth, ROLES } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, profile, loading: authLoading, error: authError, isInitialized } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (isInitialized && !authLoading && user && profile) {
      console.log(`➡️ [LoginPage] Valid session. Role: ${profile.role}. Redirecting...`);
      
      const from = location.state?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
        return;
      }
      
      switch (profile.role) {
        case ROLES.SUPER_ADMIN:
        case ROLES.ADMIN: 
          navigate('/admin', { replace: true }); 
          break;
        case ROLES.COORDINATOR: 
          navigate('/coordinator', { replace: true }); 
          break;
        case ROLES.TUTOR: 
          navigate('/tutor', { replace: true }); 
          break;
        case ROLES.STUDENT: 
          navigate('/student', { replace: true }); 
          break;
        case ROLES.PARENT:
          navigate('/parent', { replace: true });
          break;
        case 'mentor':
          navigate('/tutor', { replace: true });
          break;
        case 'family':
          navigate('/parent', { replace: true });
          break;
        default:
          console.warn(`⚠️ [LoginPage] Unknown role: ${profile.role}. Redirecting to home.`);
          navigate('/', { replace: true });
          break;
      }
    }
  }, [isInitialized, authLoading, user, profile, navigate, location]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      console.log('🔐 [LoginPage] Attempting login for:', email);
      const { error, success } = await login(email, password);
      
      if (!success || error) {
        throw new Error(error || 'Credenciales inválidas.');
      }
      
      // The useEffect will handle routing once profile is set and loading is false

    } catch (err) {
      console.error('❌ [LoginPage] Login failed:', err);
      setFormError(err.message || 'Credenciales inválidas.');
      setIsSubmitting(false);
    }
  };

  if (authLoading || (isSubmitting && !formError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4 text-slate-800">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="font-medium animate-pulse">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Login - Chanak Academy</title>
      </Helmet>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md bg-white border-slate-200 shadow-xl text-slate-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {!logoError ? (
                <img 
                  src="https://horizons-cdn.hostinger.com/fecf9528-708e-4a5b-9228-805062d89fe9/d9778ccb909ddc8597ac3c64740796e6.png" 
                  alt="Chanak Academy Logo" 
                  onError={() => setLogoError(true)} 
                  className="w-24 h-24 object-contain"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <span className="text-3xl font-black text-white tracking-tighter">CA</span>
                </div>
              )}
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 mt-2">Chanak Academy</CardTitle>
            <CardDescription className="text-slate-500 mt-1 text-xs font-bold uppercase tracking-wider">
              Student Information System
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {authError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span><strong>Error de sistema:</strong> {authError.message || 'Error de inicialización.'}</span>
              </div>
            )}

            {formError && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3 text-amber-800 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-bold">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@chanakacademy.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-slate-700 font-bold">Contraseña</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 transition-all py-6 text-base font-bold mt-4"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 mr-2" />
                    Iniciar Sesión
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-100 p-6 bg-slate-50 rounded-b-xl">
            <p className="text-xs text-slate-500 text-center font-medium">
              Plataforma de acceso restringido para personal autorizado de Chanak Academy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </>
  );
};

export default LoginPage;
