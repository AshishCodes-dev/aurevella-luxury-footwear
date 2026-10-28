import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '../utils/zodResolver.js';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Check, Trash2, Edit2, ShieldCheck, X } from 'lucide-react';

import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.jsx';
import { Alert } from '../components/ui/alert.jsx';
import {
  fetchUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
} from '../utils/api.js';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(7, 'Invalid phone number format').max(20).or(z.literal('')).optional(),
});

const addressFormSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, 'Recipient name must be at least 2 characters')
    .max(100, 'Recipient name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+ -]{10,15}$/, 'Please enter a valid 10-15 digit delivery contact number'),
  addressLine1: z
    .string()
    .trim()
    .min(5, 'Street address must be at least 5 characters')
    .max(200, 'Address line 1 cannot exceed 200 characters'),
  addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().min(2, 'State is required').max(100),
  postalCode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit Indian PIN code (e.g. 400001)'),
  isDefault: z.boolean().default(false),
});

export const Account = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  // Profile update state
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Address management state
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressFeedback, setAddressFeedback] = useState(null);
  const [addressError, setAddressError] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState(null);

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

  const {
    register: registerAddress,
    handleSubmit: handleAddressSubmit,
    reset: resetAddressForm,
    formState: { errors: addressErrors },
  } = useForm({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      recipientName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      isDefault: false,
    },
  });

  // Load user addresses on mount
  useEffect(() => {
    let isMounted = true;
    const loadAddresses = async () => {
      if (!user) return;
      try {
        setLoadingAddresses(true);
        const data = await fetchUserAddresses();
        if (isMounted) {
          setAddresses(data.addresses || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load user addresses:', err);
          setAddressError('Could not load saved delivery addresses.');
        }
      } finally {
        if (isMounted) setLoadingAddresses(false);
      }
    };

    loadAddresses();
    return () => {
      isMounted = false;
    };
  }, [user]);

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

  const handleOpenAddForm = () => {
    setEditingAddress(null);
    resetAddressForm({
      recipientName: user?.name || '',
      phone: user?.phone || '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      isDefault: addresses.length === 0,
    });
    setAddressFeedback(null);
    setAddressError(null);
    setShowAddressForm(true);
  };

  const handleOpenEditForm = (addr) => {
    setEditingAddress(addr);
    resetAddressForm({
      recipientName: addr.recipientName || '',
      phone: addr.phone || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      isDefault: !!addr.isDefault,
    });
    setAddressFeedback(null);
    setAddressError(null);
    setShowAddressForm(true);
  };

  const handleCloseAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    resetAddressForm();
  };

  const onSaveAddress = async (formData) => {
    setAddressFeedback(null);
    setAddressError(null);
    setIsSavingAddress(true);

    try {
      const payload = {
        recipientName: formData.recipientName.trim(),
        phone: formData.phone.trim(),
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2 ? formData.addressLine2.trim() : '',
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: 'India',
        isDefault: !!formData.isDefault,
      };

      if (editingAddress) {
        const addrId = editingAddress.id || editingAddress._id;
        const res = await updateUserAddress(addrId, payload);
        const updated = res.address;
        setAddresses((prev) =>
          prev.map((a) => {
            const currentId = a.id || a._id;
            if (currentId === addrId) return updated;
            if (updated.isDefault) return { ...a, isDefault: false };
            return a;
          })
        );
        setAddressFeedback('Address updated successfully.');
      } else {
        const res = await createUserAddress(payload);
        const created = res.address;
        setAddresses((prev) => {
          if (created.isDefault) {
            return [created, ...prev.map((a) => ({ ...a, isDefault: false }))];
          }
          return [created, ...prev];
        });
        setAddressFeedback('New delivery address added successfully.');
      }

      handleCloseAddressForm();
    } catch (err) {
      console.error('Failed to save address:', err);
      setAddressError(err.message || 'Failed to save address. Please verify your details.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefault = async (addrId) => {
    setAddressFeedback(null);
    setAddressError(null);
    setActionInProgressId(addrId);

    try {
      const res = await setDefaultUserAddress(addrId);
      const updatedDefault = res.address;
      setAddresses((prev) =>
        prev.map((a) => {
          const currentId = a.id || a._id;
          return {
            ...a,
            isDefault: currentId === addrId,
          };
        })
      );
      setAddressFeedback('Primary delivery address updated.');
    } catch (err) {
      console.error('Failed to set default address:', err);
      setAddressError(err.message || 'Could not update primary address.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Are you sure you wish to remove this saved delivery address?')) {
      return;
    }

    setAddressFeedback(null);
    setAddressError(null);
    setActionInProgressId(addrId);

    try {
      await deleteUserAddress(addrId);
      setAddresses((prev) => {
        const filtered = prev.filter((a) => (a.id || a._id) !== addrId);
        // If remaining has none marked default and at least 1 remaining, the server auto-promoted newest
        if (filtered.length > 0 && !filtered.some((a) => a.isDefault)) {
          filtered[0].isDefault = true;
        }
        return filtered;
      });
      setAddressFeedback('Delivery address removed.');
    } catch (err) {
      console.error('Failed to delete address:', err);
      setAddressError(err.message || 'Could not delete delivery address.');
    } finally {
      setActionInProgressId(null);
    }
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

        {/* Saved Delivery Addresses Card */}
        <Card>
          <CardHeader className="text-left flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle>Delivery Addresses</CardTitle>
              <CardDescription>Manage your verified residential and atelier delivery destinations</CardDescription>
            </div>
            {!showAddressForm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAddForm}
                className="inline-flex items-center gap-1.5 text-xs shrink-0"
              >
                <Plus size={14} /> Add Address
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {addressFeedback && (
              <div aria-live="polite">
                <Alert variant="success">{addressFeedback}</Alert>
              </div>
            )}

            {addressError && (
              <div aria-live="polite">
                <Alert variant="error">{addressError}</Alert>
              </div>
            )}

            {showAddressForm ? (
              <div className="bg-[#140D0B] border border-[#2F1C15] p-5 sm:p-6 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-[#2F1C15] pb-3">
                  <h4 className="font-serif text-base text-[#FEF5E6]">
                    {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                  </h4>
                  <button
                    type="button"
                    onClick={handleCloseAddressForm}
                    className="text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle p-1"
                    aria-label="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleAddressSubmit(onSaveAddress)} className="space-y-4" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="addr-recipient">Recipient Full Name *</Label>
                      <Input
                        id="addr-recipient"
                        type="text"
                        placeholder="e.g. Ananya Sharma"
                        error={!!addressErrors.recipientName}
                        {...registerAddress('recipientName')}
                      />
                      {addressErrors.recipientName && (
                        <p className="mt-1 text-xs text-red-400" role="alert">
                          {addressErrors.recipientName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="addr-phone">Phone Number (10–15 digits) *</Label>
                      <Input
                        id="addr-phone"
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        error={!!addressErrors.phone}
                        {...registerAddress('phone')}
                      />
                      {addressErrors.phone && (
                        <p className="mt-1 text-xs text-red-400" role="alert">
                          {addressErrors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="addr-line1">Street Address / Suite / Villa *</Label>
                    <Input
                      id="addr-line1"
                      type="text"
                      placeholder="e.g. Penthouse 4B, Aurevella Residences"
                      error={!!addressErrors.addressLine1}
                      {...registerAddress('addressLine1')}
                    />
                    {addressErrors.addressLine1 && (
                      <p className="mt-1 text-xs text-red-400" role="alert">
                        {addressErrors.addressLine1.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="addr-line2">Address Line 2 (Landmark, Area - Optional)</Label>
                    <Input
                      id="addr-line2"
                      type="text"
                      placeholder="e.g. Near Royal Palms Atelier"
                      {...registerAddress('addressLine2')}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="addr-city">City *</Label>
                      <Input
                        id="addr-city"
                        type="text"
                        placeholder="e.g. Mumbai"
                        error={!!addressErrors.city}
                        {...registerAddress('city')}
                      />
                      {addressErrors.city && (
                        <p className="mt-1 text-xs text-red-400" role="alert">
                          {addressErrors.city.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="addr-state">State *</Label>
                      <Input
                        id="addr-state"
                        type="text"
                        placeholder="e.g. Maharashtra"
                        error={!!addressErrors.state}
                        {...registerAddress('state')}
                      />
                      {addressErrors.state && (
                        <p className="mt-1 text-xs text-red-400" role="alert">
                          {addressErrors.state.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="addr-pin">PIN Code (6 digits) *</Label>
                      <Input
                        id="addr-pin"
                        type="text"
                        maxLength={6}
                        placeholder="400001"
                        error={!!addressErrors.postalCode}
                        {...registerAddress('postalCode')}
                      />
                      {addressErrors.postalCode && (
                        <p className="mt-1 text-xs text-red-400" role="alert">
                          {addressErrors.postalCode.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="addr-isDefault"
                      {...registerAddress('isDefault')}
                      className="accent-[#FEF5E6] w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="addr-isDefault" className="text-xs text-[#B8AD9A] select-none cursor-pointer">
                      Set as primary delivery address
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSavingAddress}
                    >
                      {isSavingAddress ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseAddressForm}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            ) : loadingAddresses ? (
              <div className="py-6 text-center text-xs text-[#B8AD9A]">
                Retrieving your registered delivery addresses...
              </div>
            ) : addresses.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-[#2F1C15] p-6 space-y-3">
                <MapPin size={24} className="mx-auto text-[#B8AD9A]/60" />
                <p className="text-xs text-[#B8AD9A]">
                  You have not registered any delivery destinations yet.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddForm}
                >
                  Add Your First Address
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => {
                  const addrId = addr.id || addr._id;
                  const isActionLoading = actionInProgressId === addrId;
                  return (
                    <div
                      key={addrId}
                      className="p-4 border border-[#2F1C15] bg-[#0F0A09] hover:border-[#4A2C26] transition-subtle flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm text-[#FEF5E6]">
                            {addr.recipientName}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#221A18] text-[#FEF5E6] border border-[#4A2C26] font-medium">
                              Default Address
                            </span>
                          )}
                        </div>
                        <p className="text-[#B8AD9A] leading-relaxed">
                          {addr.addressLine1}
                          {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                        </p>
                        <p className="text-[#B8AD9A]">
                          {addr.city}, {addr.state} — <strong className="text-[#FEF5E6] font-mono">{addr.postalCode}</strong>
                        </p>
                        <p className="text-[#B8AD9A]/80 text-[11px] pt-0.5">
                          Phone: <span className="font-mono text-[#FEF5E6]">{addr.phone}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#2F1C15]">
                        {!addr.isDefault && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isActionLoading}
                            onClick={() => handleSetDefault(addrId)}
                            className="text-[11px] h-8 px-2.5"
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => handleOpenEditForm(addr)}
                          className="text-[#B8AD9A] hover:text-[#FEF5E6] h-8 px-2"
                          aria-label="Edit address"
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => handleDeleteAddress(addrId)}
                          className="text-[#B8AD9A] hover:text-red-400 h-8 px-2"
                          aria-label="Delete address"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
