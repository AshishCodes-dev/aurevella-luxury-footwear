import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data) => {
    setFormError(null);
    setIsSubmitting(true);
    try {
      await signupWithEmail(data.name, data.email, data.password);
      navigate('/account', { replace: true });
    } catch (err) {
      console.error('Signup error:', err);
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
    <div className="max-w-md mx-auto py-6 sm:py-12">
      <Card>
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Join Aurevella for an exclusive footwear experience</CardDescription>
        </CardHeader>

        <CardContent>
          {formError && (
            <div className="mb-6" aria-live="polite">
              <Alert variant="error">{formError}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
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
                autoComplete="email"
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
                  className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-[#9E9685] hover:text-[#CFC9BA] transition-subtle focus:outline-none focus:ring-1 focus:ring-[#CFC9BA]"
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
                  className="absolute right-0 top-0 h-full w-12 flex items-center justify-center text-[#9E9685] hover:text-[#CFC9BA] transition-subtle focus:outline-none focus:ring-1 focus:ring-[#CFC9BA]"
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
              <div className="w-full border-t border-[#2E1814]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="bg-[#181210] px-3 text-[#9E9685]">Or continue with</span>
            </div>
          </div>

          <GoogleButton
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
          />
        </CardContent>

        <CardFooter>
          <p className="text-xs text-[#9E9685]">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#CFC9BA] hover:text-white transition-subtle uppercase font-medium tracking-wider focus:outline-none focus:ring-1 focus:ring-[#CFC9BA]"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;
