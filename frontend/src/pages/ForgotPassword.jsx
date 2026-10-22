import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card.jsx';
import { Alert } from '../components/ui/alert.jsx';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const ForgotPassword = () => {
  const { requestPasswordReset } = useAuth();
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    setStatusMessage(null);
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await requestPasswordReset(data.email);
      setStatusMessage(
        'If an account exists for this email address, a password reset link has been dispatched.'
      );
    } catch (err) {
      console.error('Password reset error:', err);
      // For security, do not expose whether an email exists or not
      setStatusMessage(
        'If an account exists for this email address, a password reset link has been dispatched.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-6 sm:py-12">
      <Card>
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter your account email to receive instructions to reset your password
          </CardDescription>
        </CardHeader>

        <CardContent>
          {statusMessage && (
            <div className="mb-6" aria-live="polite">
              <Alert variant="success">{statusMessage}</Alert>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6" aria-live="polite">
              <Alert variant="error">{errorMessage}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              className="w-full mt-6"
            >
              {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
            </Button>
          </form>
        </CardContent>

        <CardFooter>
          <p className="text-xs text-[#B8AD9A]">
            Remember your credentials?{' '}
            <Link
              to="/login"
              className="text-[#FEF5E6] hover:text-white transition-subtle uppercase font-medium tracking-wider focus:outline-none focus:ring-1 focus:ring-[#FEF5E6]"
            >
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPassword;
