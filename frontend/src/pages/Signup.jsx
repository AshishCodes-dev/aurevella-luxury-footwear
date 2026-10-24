import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(80),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const Signup = () => {
  const { signupWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onSubmit',
  });

  // Thorough form state & DOM cleanup function
  const clearSensitiveFields = useCallback(() => {
    setValue('password', '');
    setValue('confirmPassword', '');
    setValue('name', '');
    setValue('email', '');
    reset({ name: '', email: '', password: '', confirmPassword: '' });
    if (formRef.current) {
      formRef.current.reset();
    }
  }, [reset, setValue]);

  // Ensure form fields and native DOM are clean whenever this screen mounts, unmounts, or route changes
  useEffect(() => {
    clearSensitiveFields();
    return () => {
      clearSensitiveFields();
    };
  }, [clearSensitiveFields, location.key]);

  const onSubmit = async (data) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signupWithEmail(data.name, data.email, data.password);
      // Immediately clear passwords and form state upon successful registration before navigating
      clearSensitiveFields();
      navigate('/account', { replace: true });
    } catch (err) {
      console.error('Signup error:', err);
      // On failed signup: clear both password fields, retain name and email
      setValue('password', '');
      setValue('confirmPassword', '');
      const pwdEl = document.getElementById('password');
      if (pwdEl) pwdEl.value = '';
      const confirmEl = document.getElementById('confirmPassword');
      if (confirmEl) confirmEl.value = '';
      setTimeout(() => setFocus('password'), 0);

      let msg = err.message || 'Registration failed. Please check your details.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'The password provided is too weak. Please choose a stronger password.';
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
      clearSensitiveFields();
      navigate('/account', { replace: true });
    } catch (err) {
      console.error('Google Sign In error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setFormError(err.message || 'Google registration failed.');
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
            <div className="flex justify-center mb-4 select-none">
              <img
                src="/brand/aurevella-mark.png"
                alt=""
                width="40"
                height="40"
                className="h-10 w-10 aspect-square object-contain opacity-85"
              />
            </div>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Join Aurevella for bespoke orders and exclusive releases</CardDescription>
          </CardHeader>

          <CardContent>
            {formError && (
              <div className="mb-6" aria-live="polite">
                <Alert variant="error">{formError}</Alert>
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate autoComplete="off">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Master Artisan"
                  error={!!errors.name}
                  {...register('name')}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.name.message}
                  </p>
                )}
              </div>

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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    error={!!errors.confirmPassword}
                    {...register('confirmPassword')}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-0 top-0 h-full w-12 min-h-[44px] flex items-center justify-center text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle focus:outline-none focus:ring-1 focus:ring-[#FEF5E6]"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                className="w-full mt-6"
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
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
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-[#FEF5E6] hover:text-white transition-subtle uppercase font-medium tracking-wider focus:outline-none focus:ring-1 focus:ring-[#FEF5E6] inline-block py-1"
              >
                Sign In
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
