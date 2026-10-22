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
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Account Overview */}
      <Card>
        <CardHeader className="text-left">
          <CardTitle>My Account</CardTitle>
          <CardDescription>View and manage your personal credentials and preferences</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-[#2E1814] text-sm">
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#9E9685] mb-1">
                Account Status
              </span>
              <span className="text-[#CFC9BA] font-medium">
                {user?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#9E9685] mb-1">
                Account Role
              </span>
              <span className="text-[#CFC9BA] font-medium capitalize">
                {user?.role || 'Customer'}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#9E9685] mb-1">
                Email Address
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-[#CFC9BA]">{user?.email}</span>
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
              <span className="block text-xs uppercase tracking-wider text-[#9E9685] mb-1">
                Sign-In Method
              </span>
              <span className="text-[#CFC9BA] capitalize">
                {user?.providers?.join(', ') || 'Email'}
              </span>
            </div>
          </div>

          {/* Edit Profile Form */}
          <div>
            <h3 className="text-base font-serif text-[#CFC9BA] mb-4">Edit Profile Details</h3>

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
                  disabled={isUpdating || !isDirty}
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
  );
};

export default Account;
