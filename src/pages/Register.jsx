import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Globe, Mail, Lock, User, Store } from 'lucide-react';
import GoogleIcon from "@/components/GoogleIcon";

const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/b1f6773e1_IMG_0299.png";

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
  const [lang, setLang] = useState("he");

  const isRTL = lang === 'he';
  const isOpenReg = !inviteData && !promoData && !error;

  const t = {
    he: {
      welcome: "ברוכים הבאים ל-Smart Plate",
      subtitle: "מערכת ניהול המסעדות והפוד-קוסט המתקדמת בישראל",
      feat1: "ניהול פוד-קוסט ומלאי חכם",
      feat2: "מעקב אחר הזמנות וקבלות מספקים",
      feat3: "סידור עבודה וניהול שכר עובדים",
      feat4: "דוחות בזמן אמת ותחזיות חכמות",
      regTitle: "יצירת חשבון חדש",
      regSubtitle: "הצטרף עכשיו והתחל לנהל חכם",
      email: "אימייל",
      pass: "סיסמה",
      confirmPass: "אימות סיסמה",
      fullName: "שם מלא",
      restaurantName: "שם המסעדה",
      registerBtn: "צור חשבון",
      registering: "יוצר חשבון...",
      or: "או",
      google: "הירשם עם Google",
      apple: "הירשם עם Apple",
      microsoft: "הירשם עם Microsoft",
      haveAccount: "כבר יש לך חשבון?",
      login: "התחבר כאן",
      switchLang: "English",
      copyright: "כל הזכויות שמורות ל-Smart Plate",
      passHint: "לפחות 6 תווים",
      passMatchError: "הסיסמאות אינן תואמות",
      fillAllError: "אנא מלא את כל השדות",
      successTitle: "החשבון נוצר בהצלחה!",
      successDesc: "מעביר אותך למערכת...",
      vipAccess: "גישת VIP למייסדים",
      completeReg: "השלם הרשמה",
      welcomeUser: "ברוך הבא",
      managerRole: "אתה מצטרף כמנהל של",
      workerRole: "אתה מצטרף כעובד של",
    },
    en: {
      welcome: "Welcome to Smart Plate",
      subtitle: "The most advanced restaurant & food-cost management system",
      feat1: "Smart Food Cost & Inventory Management",
      feat2: "Orders & Supplier Receipts Tracking",
      feat3: "Employee Scheduling & Payroll",
      feat4: "Real-time Reports & Smart Predictions",
      regTitle: "Create a new account",
      regSubtitle: "Join now and start managing smart",
      email: "Email",
      pass: "Password",
      confirmPass: "Confirm Password",
      fullName: "Full Name",
      restaurantName: "Restaurant Name",
      registerBtn: "Create Account",
      registering: "Creating...",
      or: "OR",
      google: "Sign up with Google",
      apple: "Sign up with Apple",
      microsoft: "Sign up with Microsoft",
      haveAccount: "Already have an account?",
      login: "Log in here",
      switchLang: "עברית",
      copyright: "All rights reserved to Smart Plate",
      passHint: "At least 6 characters",
      passMatchError: "Passwords do not match",
      fillAllError: "Please fill in all fields",
      successTitle: "Account created successfully!",
      successDesc: "Redirecting you to the system...",
      vipAccess: "VIP Founding Member Access",
      completeReg: "Complete Registration",
      welcomeUser: "Welcome",
      managerRole: "You are joining as Manager of",
      workerRole: "You are joining as Worker of",
    }
  };

  const text = t[lang];

  useEffect(() => {
    verifyLink();
  }, []);

  const verifyLink = async () => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('invite') || urlParams.get('token');
      const promo = urlParams.get('promo');

      // If no token or promo, allow open registration!
      if (!token && !promo) {
        setLoading(false);
        return;
      }

      const isPromo = !!promo;
      const oauthKey = isPromo ? `oauth_promo_${promo}` : `oauth_invite_${token}`;
      
      // Check if returning from OAuth
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

  const handleOAuthClick = (provider) => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite') || params.get('token');
    const promo = params.get('promo');

    if (promo) {
      sessionStorage.setItem(`oauth_promo_${promo}`, 'true');
      const returnUrl = encodeURIComponent(`${window.location.origin}/#/pages/Register?promo=${promo}`);
      window.location.href = `/auth/login?provider=${provider}&next=${returnUrl}`;
    } else if (token) {
      sessionStorage.setItem(`oauth_invite_${token}`, 'true');
      const returnUrl = encodeURIComponent(`${window.location.origin}/#/pages/Register?invite=${token}`);
      window.location.href = `/auth/login?provider=${provider}&next=${returnUrl}`;
    } else {
      // Standard open registration OAuth
      window.location.href = `/auth/login?provider=${provider}&next=${encodeURIComponent(window.location.origin + '/')}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      alert(text.fillAllError);
      return;
    }

    if (password !== confirmPassword) {
      alert(text.passMatchError);
      return;
    }

    if (password.length < 6) {
      alert(text.passHint);
      return;
    }

    try {
      setSubmitting(true);
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('invite') || urlParams.get('token');
      const promo = urlParams.get('promo');

      if (promo) {
        if (!email || !restaurantName) {
          alert(text.fillAllError);
          setSubmitting(false);
          return;
        }
        const response = await base44.functions.invoke('redeemPromoCode', {
          code: promo,
          username: username.trim(),
          password: password,
          email: email.trim(),
          restaurant_name: restaurantName.trim(),
          full_name: promoData?.recipient_name
        });
        if (response.data.success) {
          setSuccess(true);
          setTimeout(() => { window.location.href = `/auth/login?next=${encodeURIComponent(window.location.origin + '/pages/Orders')}`; }, 2000);
        } else {
          alert(response.data.error || 'Failed to create account');
        }
      } else if (token) {
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
          setTimeout(() => { window.location.href = `/auth/login?next=${encodeURIComponent(window.location.origin + '/pages/Orders')}`; }, 2000);
        } else {
          alert(response.data.error || 'Failed to create account');
        }
      } else {
        // Open Registration Flow
        if (!email || !restaurantName || !username) {
          alert(text.fillAllError);
          setSubmitting(false);
          return;
        }
        await base44.auth.register({
          email: email.trim(),
          password: password,
          full_name: username.trim()
        });
        
        // Log them in automatically after registration
        await base44.auth.loginViaEmailPassword(email.trim(), password);
        
        // Update user profile with business name
        await base44.auth.updateMe({ business_name: restaurantName.trim() });
        
        setSuccess(true);
        setTimeout(() => { window.location.href = "/"; }, 1500);
      }
    } catch (err) {
      console.error('Error creating account:', err);
      alert('Failed to create account. Email might already be in use.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{text.successTitle}</h2>
          <p className="text-slate-500 mb-8">{text.successDesc}</p>
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isRTL ? 'font-sans' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Marketing Section */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="bg-white p-2 rounded-xl">
              <img src={logoUrl} alt="Smart Plate" className="h-10 w-auto" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Smart Plate</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
            {text.welcome}
          </h1>
          <p className="text-xl text-slate-300 mb-12 max-w-lg">
            {text.subtitle}
          </p>
          
          <div className="space-y-6 text-lg">
            {[text.feat1, text.feat2, text.feat3, text.feat4].map((feat, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="bg-blue-500/20 p-1.5 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-slate-200">{feat}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-slate-500">
          © {new Date().getFullYear()} {text.copyright}
        </div>
      </div>

      {/* Register Section */}
      <div className="w-full md:w-1/2 lg:w-2/5 bg-white flex flex-col min-h-screen relative overflow-y-auto">
        <div className="absolute top-4 end-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
            className="text-slate-500 flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            {text.switchLang}
          </Button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-12">
          {/* Mobile Logo */}
          <div className="md:hidden flex flex-col items-center gap-4 mb-8 justify-center">
            <div className="bg-slate-100 p-3 rounded-2xl shadow-sm">
              <img src={logoUrl} alt="Smart Plate" className="h-10 w-auto" />
            </div>
            <span className="text-2xl font-bold text-slate-800">Smart Plate</span>
          </div>

          <div className="mb-8 text-center md:text-start">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {promoData ? text.vipAccess : (inviteData ? text.completeReg : text.regTitle)}
            </h2>
            <p className="text-slate-500">
              {promoData ? `${text.welcomeUser}, ${promoData.recipient_name}!` : (inviteData ? `${text.welcomeUser}, ${inviteData.full_name}!` : text.regSubtitle)}
            </p>
            {inviteData && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm font-medium">
                {inviteData.role === 'manager' ? text.managerRole : text.workerRole}: {inviteData.store_name}
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2 justify-center md:justify-start">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {!error && (
            <>
              <div className="space-y-3 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium shadow-sm hover:bg-slate-50 border-slate-200"
                  onClick={() => handleOAuthClick("google")}
                >
                  <GoogleIcon className="w-5 h-5 mr-3 rtl:ml-3 rtl:mr-0" />
                  {text.google}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 text-base font-medium bg-black text-white hover:bg-gray-900 border-black shadow-sm"
                  onClick={() => handleOAuthClick("apple")}
                >
                  <svg className="w-5 h-5 mr-3 rtl:ml-3 rtl:mr-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                  </svg>
                  {text.apple}
                </Button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm uppercase">
                  <span className="bg-white px-4 text-slate-400 font-medium">{text.or}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {(isOpenReg || promoData) && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-slate-700">{text.fullName}</Label>
                      <div className="relative">
                        <User className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700">{text.restaurantName}</Label>
                      <div className="relative">
                        <Store className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                          className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {inviteData && (
                  <div className="space-y-2">
                    <Label className="text-slate-700">{text.fullName}</Label>
                    <div className="relative">
                      <User className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-700">{text.email}</Label>
                  <div className="relative">
                    <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="email"
                      value={inviteData ? inviteData.email : email}
                      onChange={(e) => !inviteData && setEmail(e.target.value)}
                      disabled={!!inviteData}
                      className={`ps-11 h-12 text-base rounded-xl focus-visible:ring-blue-500 ${inviteData ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 border-slate-200'}`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">{text.pass}</Label>
                  <div className="relative">
                    <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-blue-500"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700">{text.confirmPass}</Label>
                  <div className="relative">
                    <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-blue-500"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 mt-6" disabled={submitting}>
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                      {text.registering}
                    </div>
                  ) : (
                    text.registerBtn
                  )}
                </Button>
              </form>
            </>
          )}

          <div className="mt-8 text-center text-slate-600">
            {text.haveAccount}{" "}
            <Link to="/login" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
              {text.login}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}