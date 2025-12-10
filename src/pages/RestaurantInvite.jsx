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

      const response = await base44.functions.invoke('verifyInviteToken', { token });

      if (response.data.success && response.data.invite) {
        setInviteData(response.data.invite);
        setUsername(response.data.invite.email?.split('@')[0] || '');
      } else {
        setError(response.data.error || 'הזמנה לא תקפה או שפגה תוקפה');
      }
    } catch (err) {
      console.error('Error loading invite:', err);
      setError('שגיאה בטעינת ההזמנה');
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

  const handleExistingUserLogin = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // Store token in sessionStorage for after login
    sessionStorage.setItem('pending_invite_token', token);
    
    window.location.href = `/auth/login?next=${encodeURIComponent(window.location.origin + '/#/pages/RestaurantInvite?token=' + token)}`;
  };

  useEffect(() => {
    // Check if user just logged in with pending invite
    const checkPendingInvite = async () => {
      const pendingToken = sessionStorage.getItem('pending_invite_token');
      if (pendingToken) {
        try {
          const isAuth = await base44.auth.isAuthenticated();
          if (isAuth) {
            sessionStorage.removeItem('pending_invite_token');
            const currentUser = await base44.auth.me();
            
            // Complete signup for existing user
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            
            if (token === pendingToken) {
              const response = await base44.functions.invoke('completeSignup', {
                invite_token: token,
                username: currentUser.email.split('@')[0],
                password: 'existing-' + Math.random().toString(36).substring(7),
                invite_type: inviteData?.invite_type,
                chain_id: inviteData?.chain_id,
                store_id: inviteData?.store_id,
                store_name: inviteData?.store_name,
                role: inviteData?.role,
                inviter_email: inviteData?.inviter_email,
                oauth_user_email: currentUser.email
              });

              if (response.data.success) {
                window.location.href = window.location.origin + '/#/pages/Orders';
              }
            }
          }
        } catch (err) {
          console.error('Error completing signup for existing user:', err);
        }
      }
    };

    if (inviteData && !loading) {
      checkPendingInvite();
    }
  }, [inviteData, loading]);

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
              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => setMode('register')}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-lg"
                >
                  צור חשבון חדש
                </Button>
                <Button
                  onClick={handleExistingUserLogin}
                  variant="outline"
                  className="w-full h-12 text-lg"
                >
                  יש לי כבר חשבון - התחבר
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