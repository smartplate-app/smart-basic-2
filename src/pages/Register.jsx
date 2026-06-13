import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, Globe, Mail, Lock, User, Store } from 'lucide-react';
import GoogleIcon from "@/components/GoogleIcon";

const logoUrl = "https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0c6fcae55_smartplate_logo_insta_320x320px.png";

export default function Register() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [username, setUsername] = useState('');

  const [email, setEmail] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lang, setLang] = useState("he");

  const isRTL = lang === 'he';

  const t = {
    he: {
      welcome: "ברוכים הבאים ל-Smart Plate Basic",
      subtitle: "מערכת ניהול המסעדות והפוד-קוסט המתקדמת בישראל",
      feat1: "שליחת הזמנות לספקים בקליק ישירות לווצאפ",
      feat2: "קליטת חשבוניות אוטומטית וקריאת נתונים בעזרת בינה מלאכותית (AI)",
      feat3: "מחשבון הנדסת תפריט חכם למיקסום רווחים",
      feat4: "ניהול מלא של העסק מכל מקום, ישירות מהטלפון הנייד",
      regTitle: "בקשת גישה למערכת",
      regSubtitle: "השאירו פרטים ונחזור אליכם בהקדם לתת לכם גישה",
      email: "אימייל",
      pass: "סיסמה",
      confirmPass: "אימות סיסמה",
      fullName: "שם מלא",
      restaurantName: "שם המסעדה",
      registerBtn: "שליחת בקשה",
      registering: "שולח...",
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
      fillAllError: "אנא מלא את השדות הנדרשים",
      successTitle: "הבקשה נשלחה בהצלחה!",
      successDesc: "נחזור אליכם בהקדם האפשרי. מעביר אותך חזרה...",
      imgAlt1: "ניהול מסעדה מהנייד",
      imgAlt2: "בינה מלאכותית לקבלות",
      imgAlt3: "הזמנות בווצאפ"
    },
    en: {
      welcome: "Welcome to Smart Plate Basic",
      subtitle: "The most advanced restaurant & food-cost management system",
      feat1: "Send orders to suppliers in one click directly via WhatsApp",
      feat2: "Automatic invoice processing and data reading with AI",
      feat3: "Smart Menu Engineering calculator to maximize profits",
      feat4: "Manage your entire business on the go, directly from your mobile phone",
      regTitle: "Request System Access",
      regSubtitle: "Leave your details and we'll get back to you shortly with access",
      email: "Email",
      pass: "Password",
      confirmPass: "Confirm Password",
      fullName: "Full Name",
      restaurantName: "Restaurant Name",
      registerBtn: "Submit Request",
      registering: "Submitting...",
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
      fillAllError: "Please fill in all required fields",
      successTitle: "Request sent successfully!",
      successDesc: "We will get back to you shortly. Redirecting...",
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

    if (!email || !restaurantName || !username) {
      alert(text.fillAllError);
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await base44.functions.invoke('submitAccessRequest', {
        full_name: username.trim(),
        email: email.trim(),
        phone: '', // Optional
        business_name: restaurantName.trim(),
        message: 'Requested via Register page',
        page_url: window.location.href
      });
      
      if (data?.success) {
        setSuccess(true);
        setTimeout(() => { window.location.href = "/"; }, 3000);
      } else {
        alert(data?.error || 'Failed to submit request');
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      alert(err?.message || 'Failed to submit request');
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
            <div className="bg-white p-1.5 rounded-2xl shadow-lg">
              <img src={logoUrl} alt="Smart Plate Logo" className="w-14 h-14 object-contain rounded-xl" />
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
                    <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/eb6333ac4_IMG_0502.png" alt={text.imgAlt1 || "Restaurant mobile management"} className="w-full h-48 object-cover rounded-xl" />
                  </div>
                  <div className="bg-white p-2 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0d18c242b_IMG_0347.jpg" alt={text.imgAlt2 || "Invoice AI"} className="w-full h-56 object-cover rounded-xl" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white p-2 rounded-2xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                    <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/968a51399_IMG_0350.png" alt={text.imgAlt3 || "WhatsApp Ordering"} className="w-full h-auto aspect-video object-contain rounded-xl" />
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
            <div className="bg-slate-100 p-2 rounded-2xl shadow-sm">
              <img src={logoUrl} alt="Smart Plate Logo" className="w-12 h-12 object-contain rounded-xl" />
            </div>
            <span className="text-2xl font-bold text-slate-800">Smart Plate</span>
          </div>

          <div className="mb-8 text-center md:text-start">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{text.regTitle}</h2>
            <p className="text-slate-500">{text.regSubtitle}</p>
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