import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Globe, Mail, Lock, User, Store } from 'lucide-react';
import GoogleIcon from "@/components/GoogleIcon";

const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a006cfeba8053be10f189/b1f6773e1_IMG_0299.png";

export default function Register() {
  const [loading, setLoading] = useState(false);
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

  const t = {
    he: {
      welcome: "ברוכים הבאים ל-Smart Plate",
      subtitle: "מערכת ניהול המסעדות והפוד-קוסט המתקדמת בישראל",
      feat1: "שליחת הזמנות לספקים בקליק ישירות לווצאפ",
      feat2: "קליטת חשבוניות אוטומטית וקריאת נתונים בעזרת בינה מלאכותית (AI)",
      feat3: "מחשבון הנדסת תפריט חכם למיקסום רווחים",
      feat4: "ניהול מלא של העסק מכל מקום, ישירות מהטלפון הנייד",
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
      imgAlt1: "ניהול מסעדה מהנייד",
      imgAlt2: "בינה מלאכותית לקבלות",
      imgAlt3: "הזמנות בווצאפ"
    },
    en: {
      welcome: "Welcome to Smart Plate",
      subtitle: "The most advanced restaurant & food-cost management system",
      feat1: "Send orders to suppliers in one click directly via WhatsApp",
      feat2: "Automatic invoice processing and data reading with AI",
      feat3: "Smart Menu Engineering calculator to maximize profits",
      feat4: "Manage your entire business on the go, directly from your mobile phone",
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
      imgAlt1: "Restaurant mobile management",
      imgAlt2: "Invoice AI",
      imgAlt3: "WhatsApp Ordering"
    }
  };

  const text = t[lang];

  const handleOAuthClick = (provider) => {
    window.location.href = `/auth/login?provider=${provider}&next=${encodeURIComponent(window.location.origin + '/')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!password || !confirmPassword || !email || !restaurantName || !username) {
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
      await base44.auth.register({
        email: email.trim(),
        password: password,
        full_name: username.trim()
      });
      
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      await base44.auth.updateMe({ business_name: restaurantName.trim() });
      
      setSuccess(true);
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } catch (err) {
      console.error('Error creating account:', err);
      alert(err?.response?.data?.error || err?.message || 'Failed to create account. Email might already be in use.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{text.successTitle}</h2>
          <p className="text-slate-500 mb-8">{text.successDesc}</p>
          <Loader2 className="w-8 h-8 animate-spin text-[#2d6a4f] mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isRTL ? 'font-sans' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Marketing Section */}
      <div className="hidden md:flex md:w-3/5 lg:w-3/4 bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white p-8 lg:p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#52b788]/20 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-white p-2.5 rounded-2xl shadow-lg">
              <div className="flex flex-col items-center justify-center bg-black text-white rounded-xl leading-none w-14 h-14 shadow-sm font-black tracking-widest text-[10px] text-center">
                <span>SMART</span>
                <span className="mt-0.5">PLATE</span>
              </div>
            </div>
            <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">Smart Plate</span>
          </div>
          
          <div className="flex-1 flex flex-col xl:flex-row gap-12 items-center">
            <div className="flex-1">
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-tight mb-6 drop-shadow-sm">
                {text.welcome}
              </h1>
              <p className="text-xl lg:text-2xl text-green-50 mb-10 max-w-2xl font-light">
                {text.subtitle}
              </p>
              
              <div className="space-y-6 text-lg lg:text-xl font-medium bg-white/10 p-8 rounded-3xl backdrop-blur-md border border-white/20 shadow-xl">
                {[text.feat1, text.feat2, text.feat3, text.feat4].map((feat, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="bg-[#52b788] p-1.5 rounded-full mt-1 shrink-0 shadow-md">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white leading-relaxed">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 w-full max-w-lg xl:max-w-none relative hidden xl:block">
              <div className="grid grid-cols-2 gap-4 absolute inset-0 transform translate-x-12 -translate-y-8">
                <div className="space-y-4 pt-12">
                  <div className="bg-white p-2 rounded-2xl shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                    <img src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=80" alt={text.imgAlt1 || "Restaurant mobile management"} className="w-full h-48 object-cover rounded-xl" />
                  </div>
                  <div className="bg-white p-2 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <img src="https://images.unsplash.com/photo-1581349485608-9469926a8e5e?auto=format&fit=crop&w=600&q=80" alt={text.imgAlt2 || "Invoice AI"} className="w-full h-56 object-cover rounded-xl" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white p-2 rounded-2xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                    <img src="https://images.unsplash.com/photo-1613511874284-cd4a3b8d9ba8?auto=format&fit=crop&w=600&q=80" alt={text.imgAlt3 || "WhatsApp Ordering"} className="w-full h-64 object-cover rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-green-200 mt-10">
          © {new Date().getFullYear()} {text.copyright}
        </div>
      </div>

      {/* Register Section */}
      <div className="w-full md:w-2/5 lg:w-1/4 min-w-[320px] max-w-[500px] bg-white flex flex-col min-h-screen relative overflow-y-auto shadow-2xl z-20">
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
              <div className="flex flex-col items-center justify-center bg-black text-white rounded-xl leading-none w-12 h-12 shadow-sm font-black tracking-widest text-[9px] text-center">
                <span>SMART</span>
                <span className="mt-0.5">PLATE</span>
              </div>
            </div>
            <span className="text-2xl font-bold text-slate-800">Smart Plate</span>
          </div>

          <div className="mb-8 text-center md:text-start">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{text.regTitle}</h2>
            <p className="text-slate-500">{text.regSubtitle}</p>
          </div>

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
            <div className="space-y-2">
              <Label className="text-slate-700">{text.fullName}</Label>
              <div className="relative">
                <User className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-[#2d6a4f]"
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
                  className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-[#2d6a4f]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700">{text.email}</Label>
              <div className="relative">
                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-[#2d6a4f]"
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
                  className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-[#2d6a4f]"
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
                  className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-[#2d6a4f]"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl bg-[#2d6a4f] hover:bg-[#1b4332] text-white mt-6" disabled={submitting}>
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

          <div className="mt-8 text-center text-slate-600 text-sm">
            {text.haveAccount}{" "}
            <Link to="/app-login" className="text-[#2d6a4f] font-bold hover:text-[#1b4332] hover:underline">
              {text.login}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}