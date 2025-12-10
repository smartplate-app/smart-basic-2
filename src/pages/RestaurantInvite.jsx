import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader, Store, MapPin, User, Mail, Shield, Eye, EyeOff } from 'lucide-react';

export default function RestaurantInvitePage() {
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('view'); // 'view', 'login', 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadInviteData();
  }, []);

  const loadInviteData = async () => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError('לא נמצא טוקן הזמנה בקישור');
        setLoading(false);
        return;
      }

      console.log('[RestaurantInvite] Loading invite with token:', token);

      // Fetch invite directly from entity (public access)
      const invites = await base44.asServiceRole.entities.UserInvite.filter({ token });
      
      if (!invites || invites.length === 0) {
        setError('הזמנה לא נמצאה');
        setLoading(false);
        return;
      }

      const invite = invites[0];
      
      if (invite.used) {
        setError('ההזמנה כבר נוצלה');
        setLoading(false);
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setError('תוקף ההזמנה פג');
        setLoading(false);
        return;
      }

      console.log('[RestaurantInvite] Invite loaded successfully:', invite.restaurant_name);
      setInviteData(invite);
      setUsername(invite.email?.split('@')[0] || '');
    } catch (err) {
      console.error('Error loading invite:', err);
      setError('שגיאה בטעינת ההזמנה: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!username || !password || !confirmPassword) {
      alert('נא למלא את כל השדות');
      return;
    }

    if (password !== confirmPassword) {
      alert('הסיסמאות אינן תואמות');
      return;
    }

    if (password.length < 6) {
      alert('הסיסמה חייבת להיות לפחות 6 תווים');
      return;
    }

    try {
      setSubmitting(true);
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

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
        alert('חשבון נוצר בהצלחה! מעביר להתחברות...');
        window.location.href = `/auth/login?next=${encodeURIComponent(window.location.origin + '/#/pages/Orders')}`;
      } else {
        alert(response.data.error || 'שגיאה ביצירת חשבון');
      }
    } catch (err) {
      console.error('Error creating account:', err);
      alert('שגיאה ביצירת חשבון');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOAuthLogin = (provider) => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // Store token for after OAuth
    sessionStorage.setItem('oauth_invite_token', token);
    sessionStorage.setItem('oauth_invite_data', JSON.stringify(inviteData));
    
    // Redirect to OAuth provider
    const returnUrl = encodeURIComponent(`${window.location.origin}/#/pages/RestaurantInvite?token=${token}&oauth=true`);
    window.location.href = `/auth/login?provider=${provider}&next=${returnUrl}`;
  };

  useEffect(() => {
    // Check if returning from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuth = urlParams.get('oauth');
    
    if (isOAuth && !loading && inviteData) {
      // Prevent multiple executions
      const oauthProcessed = sessionStorage.getItem('oauth_processing');
      if (oauthProcessed === 'true') {
        console.log('[RestaurantInvite] OAuth already being processed, skipping...');
        return;
      }
      
      sessionStorage.setItem('oauth_processing', 'true');
      
      const completeOAuth = async () => {
        try {
          console.log('[RestaurantInvite] Starting OAuth completion...');
          const token = sessionStorage.getItem('oauth_invite_token');
          const savedInviteData = JSON.parse(sessionStorage.getItem('oauth_invite_data') || '{}');
          
          if (!token) {
            console.error('[RestaurantInvite] No token found in session');
            sessionStorage.removeItem('oauth_processing');
            return;
          }
          
          const isAuth = await base44.auth.isAuthenticated();
          if (!isAuth) {
            console.error('[RestaurantInvite] User not authenticated');
            sessionStorage.removeItem('oauth_processing');
            return;
          }
          
          const currentUser = await base44.auth.me();
          console.log('[RestaurantInvite] User authenticated:', currentUser.email);
          
          // Complete signup
          const response = await base44.functions.invoke('completeSignup', {
            invite_token: token,
            username: currentUser.email.split('@')[0],
            password: 'oauth-' + Math.random().toString(36).substring(7),
            invite_type: savedInviteData.invite_type,
            chain_id: savedInviteData.chain_id,
            store_id: savedInviteData.store_id,
            store_name: savedInviteData.store_name,
            role: savedInviteData.role,
            inviter_email: savedInviteData.inviter_email,
            oauth_user_email: currentUser.email
          });

          if (response.data.success) {
            console.log('[RestaurantInvite] Signup completed, redirecting...');
            sessionStorage.removeItem('oauth_invite_token');
            sessionStorage.removeItem('oauth_invite_data');
            sessionStorage.removeItem('oauth_processing');
            window.location.href = window.location.origin + '/#/pages/Orders';
          } else {
            console.error('[RestaurantInvite] Signup failed:', response.data.error);
            sessionStorage.removeItem('oauth_processing');
            alert('שגיאה: ' + response.data.error);
          }
        } catch (err) {
          console.error('[RestaurantInvite] OAuth completion error:', err);
          sessionStorage.removeItem('oauth_processing');
          alert('שגיאה בהשלמת ההרשמה: ' + err.message);
        }
      };
      
      completeOAuth();
    }
  }, [loading, inviteData]);

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
          <p className="text-lg text-gray-700">טוען הזמנה...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader className="bg-red-50">
            <CardTitle className="text-red-700 text-right">שגיאה</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-700 text-right mb-4">{error}</p>
            <Button onClick={() => window.location.href = '/'} className="w-full">
              חזרה למסך הבית
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" dir="rtl">
      <div className="max-w-2xl mx-auto py-8">
        {/* Restaurant Info Card */}
        <Card className="mb-6 shadow-xl border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
                alt="Smart Plate"
                className="h-12 object-contain"
              />
              <CardTitle className="text-2xl">הוזמנת להצטרף!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-blue-50 rounded-lg p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Store className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">שם המסעדה</p>
                  <p className="text-xl font-bold text-gray-900">
                    {inviteData?.restaurant_name || inviteData?.store_name}
                  </p>
                </div>
              </div>

              {inviteData?.restaurant_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">כתובת</p>
                    <p className="text-lg text-gray-800">{inviteData.restaurant_address}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">תפקיד</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {inviteData?.role === 'manager' ? 'מנהל - גישה מלאה' : 'עובד - הזמנות וקבלות'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">הוזמנת על ידי</p>
                  <p className="text-lg text-gray-800">{inviteData?.inviter_name}</p>
                </div>
              </div>
            </div>

            {mode === 'view' && (
              <div className="space-y-4 pt-4">
                <p className="text-center text-gray-600 font-semibold">בחר איך להצטרף:</p>
                
                {/* OAuth Buttons */}
                <Button
                  onClick={() => handleOAuthLogin('google')}
                  variant="outline"
                  className="w-full h-12 bg-white hover:bg-gray-50 border-2"
                >
                  <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  המשך עם Google
                </Button>

                <Button
                  onClick={() => handleOAuthLogin('azure')}
                  variant="outline"
                  className="w-full h-12 bg-white hover:bg-gray-50 border-2"
                >
                  <svg className="w-5 h-5 ml-2" viewBox="0 0 23 23">
                    <path fill="#f25022" d="M1 1h10v10H1z"/>
                    <path fill="#00a4ef" d="M12 1h10v10H12z"/>
                    <path fill="#7fba00" d="M1 12h10v10H1z"/>
                    <path fill="#ffb900" d="M12 12h10v10H12z"/>
                  </svg>
                  המשך עם Microsoft
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-blue-50 text-gray-500">או</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => setMode('register')}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg"
                >
                  צור חשבון עם סיסמה
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Form */}
        {mode === 'register' && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-right">יצירת חשבון חדש</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label className="text-right block mb-2">אימייל</Label>
                  <Input
                    type="email"
                    value={inviteData?.email || ''}
                    disabled
                    className="bg-gray-100 text-right"
                  />
                </div>

                <div>
                  <Label className="text-right block mb-2">שם משתמש *</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="בחר שם משתמש"
                    required
                    className="text-right"
                  />
                </div>

                <div>
                  <Label className="text-right block mb-2">סיסמה *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="לפחות 6 תווים"
                      required
                      className="text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label className="text-right block mb-2">אימות סיסמה *</Label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="הזן סיסמה שוב"
                    required
                    className="text-right"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {submitting ? <Loader className="w-4 h-4 animate-spin" /> : 'צור חשבון'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMode('view')}
                  >
                    ביטול
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}