import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    verifyInvite();
  }, []);

  const autoCompleteOAuthSignup = async (currentUser, invite, token) => {
    try {
      console.log('Auto-completing OAuth signup for:', currentUser.email);
      
      // Call completeSignup function to create User entity record and StoreUser record
      const response = await base44.functions.invoke('completeSignup', {
        invite_token: token,
        username: currentUser.email.split('@')[0], // Use email prefix as username
        password: 'oauth-' + Math.random().toString(36).substring(7), // Random password (won't be used)
        invite_type: invite.invite_type,
        chain_id: invite.chain_id,
        store_id: invite.store_id,
        store_name: invite.store_name,
        role: invite.role,
        inviter_email: invite.inviter_email
      });

      if (response.data.success) {
        console.log('OAuth signup completed successfully');
        setSuccess(true);
        // Force a full reload to Orders to ensure authentication is loaded
        setTimeout(() => {
          window.location.href = window.location.origin + '/pages/Orders';
        }, 1500);
      } else {
        console.error('Failed to auto-complete OAuth signup:', response.data.error);
        setError('Failed to complete registration. Please contact support.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error in autoCompleteOAuthSignup:', err);
      setError('Failed to complete registration. Please contact support.');
      setLoading(false);
    }
  };

  const verifyInvite = async () => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('invite') || urlParams.get('token'); // Support both formats

      if (!token) {
        setError('No invitation token found. Please check your invitation link.');
        setLoading(false);
        return;
      }

      // Try to find the invite directly (without requiring authentication)
      try {
        const invites = await base44.entities.UserInvite.filter({ token: token, used: false });
        
        if (invites.length > 0) {
          const invite = invites[0];
          
          // Check if expired
          if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            setError('This invitation has expired. Please request a new one.');
            setLoading(false);
            return;
          }
          
          setInviteData(invite);
          setUsername(invite.email.split('@')[0] || '');
          setLoading(false);
          return;
        } else {
          setError('Invalid or expired invitation token.');
          setLoading(false);
          return;
        }
      } catch (entityErr) {
        console.error('Error fetching invite:', entityErr);
        setError('Failed to verify invitation. Please try again.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Error verifying invite:', err);
      setError('Failed to verify invitation. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      setSubmitting(true);
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('invite') || urlParams.get('token');

      // Call completeSignup - it will mark the invite as used
      const response = await base44.functions.invoke('completeSignup', {
        invite_token: token,
        username: username.trim(),
        password: password,
        invite_type: inviteData?.invite_type,
        chain_id: inviteData?.chain_id,
        store_id: inviteData?.store_id,
        store_name: inviteData?.store_name,
        role: inviteData?.role,
        inviter_email: inviteData?.inviter_email
      });

      if (response.data.success) {
        setSuccess(true);
        // User needs to login with their new credentials
        // Redirect to login with nextUrl parameter to go to Orders after login
        setTimeout(() => {
          const loginUrl = `/auth/login?next=${encodeURIComponent(window.location.origin + '/pages/Orders')}`;
          window.location.href = loginUrl;
        }, 2000);
      } else {
        alert(response.data.error || 'Failed to create account');
      }
    } catch (err) {
      console.error('Error creating account:', err);
      alert('Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="flex flex-col items-center gap-4">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
            alt="Smart Plate"
            className="h-20 object-contain animate-pulse"
          />
          <Loader className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-lg text-gray-700">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{error}</p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              Account Created!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-xl font-bold text-gray-900">
                🎉 Welcome to {inviteData?.restaurant_name || inviteData?.store_name}!
              </p>
              <p className="text-gray-700">
                Your account has been created successfully.
                {inviteData?.role === 'manager' && ' You have manager access to all features.'}
                {inviteData?.role === 'worker' && ' You have worker access.'}
              </p>
              <p className="text-sm text-gray-500">Redirecting...</p>
              <div className="flex justify-center">
                <Loader className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
              alt="Smart Plate"
              className="h-16 object-contain"
            />
          </div>
          <CardTitle className="text-center">Complete Your Registration</CardTitle>
          <p className="text-center text-gray-600 mt-2">
            Welcome, {inviteData?.full_name}!
          </p>
          {inviteData?.invite_type === 'chain_store' && (
            <p className="text-center text-blue-600 text-sm mt-1">
              You're joining as store manager for: {inviteData?.store_name}
            </p>
          )}
          {inviteData?.invite_type === 'store_user' && (
            <p className="text-center text-green-600 text-sm mt-1">
              You're joining {inviteData?.store_name} as {inviteData?.role === 'manager' ? 'Manager' : 'Worker'}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Show Restaurant Info for Store Users (read-only) */}
            {inviteData?.invite_type === 'store_user' && (inviteData?.restaurant_name || inviteData?.store_name) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-blue-600">Restaurant Name</Label>
                    <Input
                      value={inviteData?.restaurant_name || inviteData?.store_name || ''}
                      disabled
                      className="bg-white border-blue-200 font-semibold"
                    />
                  </div>
                  {inviteData?.restaurant_address && (
                    <div>
                      <Label className="text-xs text-blue-600">Restaurant Address</Label>
                      <Input
                        value={inviteData?.restaurant_address || ''}
                        disabled
                        className="bg-white border-blue-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={inviteData?.email || ''}
                disabled
                className="bg-gray-100"
              />
            </div>

            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
                minLength={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be your login username
              </p>
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                At least 6 characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}