import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { GoogleButton } from '../components/ui/GoogleButton.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card.jsx';
import { Alert } from '../components/ui/alert.jsx';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const Login = () => {
  const { loginWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/account';

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  // Ensure form fields are clean whenever this screen mounts or unmounts
  useEffect(() => {
    reset({ email: '', password: '' });
    return () => {
      reset({ email: '', password: '' });
    };
  }, [reset]);

  const onSubmit = async (data) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await loginWithEmail(data.email, data.password);
      reset({ email: '', password: '' });
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      // On failed login: clear password field only, retain email, focus password
      setValue('password', '');
      setTimeout(() => setFocus('password'), 0);

      let msg = err.message || 'Authentication failed. Please verify your credentials.';
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-email'
      ) {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Access temporarily disabled. Please reset password or try later.';
      }
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      reset({ email: '', password: '' });
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Google Sign In error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setFormError(err.message || 'Google authentication failed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full px-4 py-8 sm:py-16">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your Aurevella account</CardDescription>
          </CardHeader>

          <CardContent>
            {formError && (
              <div className="mb-6" aria-live="polite">
                <Alert variant="error">{formError}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  error={!!errors.email}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" className="mb-0">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle focus:outline-none focus:ring-1 focus:ring-[#FEF5E6] min-h-[44px] inline-flex items-center"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    error={!!errors.password}
                    {...register('password')}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-0 h-full w-12 min-h-[44px] flex items-center justify-center text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle focus:outline-none focus:ring-1 focus:ring-[#FEF5E6]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                className="w-full mt-6"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2F1C15]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest">
                <span className="bg-[#181210] px-3 text-[#B8AD9A]">Or continue with</span>
              </div>
            </div>

            <GoogleButton
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            />
          </CardContent>

          <CardFooter>
            <p className="text-xs text-[#B8AD9A]">
              Do not have an account?{' '}
              <Link
                to="/signup"
                className="text-[#FEF5E6] hover:text-white transition-subtle uppercase font-medium tracking-wider focus:outline-none focus:ring-1 focus:ring-[#FEF5E6] inline-block py-1"
              >
                Register
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
