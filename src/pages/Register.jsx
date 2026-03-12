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
  const [promoData, setPromoData] = useState(null);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    verifyLink();
  }, []);

  const verifyLink = async () => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('invite') || urlParams.get('token');
      const promo = urlParams.get('promo');

      if (!token && !promo) {
        setError('No invitation or promo link found. Please check your link.');
        setLoading(false);
        return;
      }

      const activeToken = token || promo;
      const isPromo = !!promo;

      // Check if returning from OAuth
      const oauthKey = isPromo ? `oauth_promo_${promo}` : `oauth_invite_${token}`;
      if (sessionStorage.getItem(oauthKey)) {
        sessionStorage.removeItem(oauthKey);
        
        try {
          const isAuth = await base44.auth.isAuthenticated();
          if (isAuth) {
            const currentUser = await base44.auth.me();
            
            if (isPromo) {
              const response = await base44.functions.invoke('verifyPromoCode', { code: promo });
              if (!response.data.success || !response.data.promo) {
                setError(response.data.error || 'Invalid or expired promo code');
                setLoading(false);
                return;
              }
              
              const signupResponse = await base44.functions.invoke('redeemPromoCode', {
                code: promo,
                username: currentUser.email.split('@')[0],
                password: 'oauth-' + Math.random().toString(36).substring(7),
                oauth_user_email: currentUser.email,
                full_name: response.data.promo.recipient_name
              });
              
              if (signupResponse.data.success) {
                setSuccess(true);
                setTimeout(() => window.location.href = window.location.origin + '/#/pages/Orders', 1500);
                return;
              } else {
                setError('Registration failed: ' + signupResponse.data.error);
                setLoading(false);
                return;
              }
            } else {
              // Existing invite OAuth logic
              const response = await base44.functions.invoke('verifyInviteToken', { token });
              if (!response.data.success || !response.data.invite) {
                setError(response.data.error || 'Invalid or expired invitation');
                setLoading(false);
                return;
              }
              
              const invite = response.data.invite;
              const signupResponse = await base44.functions.invoke('completeSignup', {
                invite_token: token,
                username: currentUser.email.split('@')[0],
                password: 'oauth-' + Math.random().toString(36).substring(7),
                invite_type: invite.invite_type,
                chain_id: invite.chain_id,
                store_id: invite.store_id,
                store_name: invite.store_name,
                role: invite.role,
                inviter_email: invite.inviter_email,
                oauth_user_email: currentUser.email
              });
              
              if (signupResponse.data.success) {
                setSuccess(true);
                setTimeout(() => window.location.href = window.location.origin + '/#/pages/Orders', 1500);
                return;
              } else {
                setError('Registration failed: ' + signupResponse.data.error);
                setLoading(false);
                return;
              }
            }
          }
        } catch (authError) {
          console.log('[Register] OAuth auth check failed:', authError);
        }
      }

      if (isPromo) {
        const response = await base44.functions.invoke('verifyPromoCode', { code: promo });
        if (response.data.success && response.data.promo) {
          setPromoData(response.data.promo);
          setLoading(false);
        } else {
          setError(response.data.error || 'Invalid or expired promo code');
          setLoading(false);
        }
      } else {
        const response = await base44.functions.invoke('verifyInviteToken', { token });
        if (response.data.success && response.data.invite) {
          setInviteData(response.data.invite);
          setUsername(response.data.invite.email?.split('@')[0] || '');
          setLoading(false);
        } else {
          setError(response.data.error || 'Invalid or expired invitation');
          setLoading(false);
        }
      }
    } catch (err) {
      setError('Failed to verify link. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password || !confirmPassword) {
      alert('Please fill in all required fields');
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
      const promo = urlParams.get('promo');

      let response;
      if (promo) {
        if (!email || !restaurantName) {
          alert('Email and Restaurant Name are required for VIP signup');
          setSubmitting(false);
          return;
        }
        response = await base44.functions.invoke('redeemPromoCode', {
          code: promo,
          username: username.trim(),
          password: password,
          email: email.trim(),
          restaurant_name: restaurantName.trim(),
          full_name: promoData?.recipient_name
        });
      } else {
        response = await base44.functions.invoke('completeSignup', {
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
      }

      if (response.data.success) {
        setSuccess(true);
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
          <CardTitle className="text-center">
          {promoData ? 'VIP Founding Member Access' : 'Complete Your Registration'}
          </CardTitle>
          <p className="text-center text-gray-600 mt-2">
          Welcome, {promoData ? promoData.recipient_name : inviteData?.full_name}!
          </p>
          {promoData && (
          <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
            <span className="text-purple-800 font-semibold text-sm">
              🎁 Special Offer: {promoData.offer_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
          )}
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
          {/* OAuth Sign-in Options */}
          <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 bg-white hover:bg-gray-50 border-2"
            onClick={async () => {
              const params = new URLSearchParams(window.location.search);
              const token = params.get('invite') || params.get('token');
              const promo = params.get('promo');

              if (promo) {
                sessionStorage.setItem(`oauth_promo_${promo}`, 'true');
                const returnUrl = encodeURIComponent(`${window.location.origin}/#/pages/Register?promo=${promo}`);
                window.location.href = `/auth/login?provider=google&next=${returnUrl}`;
              } else {
                sessionStorage.setItem(`oauth_invite_${token}`, 'true');
                const returnUrl = encodeURIComponent(`${window.location.origin}/#/pages/Register?invite=${token}`);
                window.location.href = `/auth/login?provider=google&next=${returnUrl}`;
              }
            }}
          >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 bg-white hover:bg-gray-50 border-2"
              onClick={async () => {
                const token = new URLSearchParams(window.location.search).get('invite') || new URLSearchParams(window.location.search).get('token');
                
                // Mark that we're starting OAuth flow for this invite
                sessionStorage.setItem(`oauth_invite_${token}`, 'true');
                
                const returnUrl = encodeURIComponent(`${window.location.origin}/#/pages/Register?invite=${token}`);
                window.location.href = `/auth/login?provider=azure&next=${returnUrl}`;
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23">
                <path fill="#f25022" d="M1 1h10v10H1z"/>
                <path fill="#00a4ef" d="M12 1h10v10H12z"/>
                <path fill="#7fba00" d="M1 12h10v10H1z"/>
                <path fill="#ffb900" d="M12 12h10v10H12z"/>
              </svg>
              Sign in with Microsoft
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or create account manually</span>
            </div>
          </div>

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
            
            {promoData ? (
              <>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="restaurantName">Restaurant Name *</Label>
                  <Input
                    id="restaurantName"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    required
                    placeholder="e.g. The Golden Fork"
                  />
                </div>
              </>
            ) : (
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
            )}

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