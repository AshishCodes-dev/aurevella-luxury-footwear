import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.jsx';
import { Alert } from '../components/ui/alert.jsx';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(7, 'Invalid phone number format').max(20).or(z.literal('')).optional(),
});

export const Account = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (data) => {
    setStatusMessage(null);
    setErrorMessage(null);
    setIsUpdating(true);
    try {
      await updateProfile({
        name: data.name,
        phone: data.phone || null,
      });
      setStatusMessage('Profile updated successfully.');
    } catch (err) {
      console.error('Update profile error:', err);
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full px-4 py-8 sm:py-16">
      <div className="w-full max-w-2xl space-y-8">
        {/* Orders & Commissions Navigation Card */}
        <Card>
          <CardHeader className="text-left flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Commissions & Orders</CardTitle>
              <CardDescription>View status, delivery tracking, and payment receipts for your atelier footwear</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <p className="text-xs text-[#B8AD9A] max-w-md">
                Track your handcrafted commissions from initial leather cut to white-glove dispatch.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/orders')}
                className="shrink-0"
              >
                View Order History
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Overview */}
      <Card>
        <CardHeader className="text-left">
          <CardTitle>My Account</CardTitle>
          <CardDescription>View and manage your personal credentials and preferences</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#2F1C15] text-sm">
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#B8AD9A] mb-1">
                Account Status
              </span>
              <span className="text-[#FEF5E6] font-medium">
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#B8AD9A] mb-1">
                Account Role
              </span>
              <span className="text-[#FEF5E6] font-medium capitalize">
                {user?.role || 'Customer'}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#B8AD9A] mb-1">
                Email Address
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[#FEF5E6]">{user?.email}</span>
                {user?.emailVerified ? (
                  <span className="text-[10px] uppercase tracking-wider bg-emerald-950/70 text-emerald-400 px-2 py-0.5 border border-emerald-800">
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider bg-amber-950/70 text-amber-400 px-2 py-0.5 border border-amber-800">
                    Unverified
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#B8AD9A] mb-1">
                Sign-In Method
              </span>
              <span className="text-[#FEF5E6]">
                {user?.providers && user.providers.length > 0
                  ? user.providers
                      .map((p) => {
                        if (p === 'google.com' || p === 'google') return 'Google';
                        if (p === 'password') return 'Email & password';
                        return p;
                      })
                      .join(', ')
                  : 'Email & password'}
              </span>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div>
            <h3 className="text-base font-serif text-[#FEF5E6] mb-4">Edit Profile Details</h3>

            {statusMessage && (
              <div className="mb-4" aria-live="polite">
                <Alert variant="success">{statusMessage}</Alert>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4" aria-live="polite">
                <Alert variant="error">{errorMessage}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="account-name">Full Name</Label>
                <Input
                  id="account-name"
                  type="text"
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
                <Label htmlFor="account-phone">Phone Number (Optional)</Label>
                <Input
                  id="account-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  error={!!errors.phone}
                  {...register('phone')}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-400" role="alert">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={isUpdating}
                  disabled={!isDirty}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Account;
