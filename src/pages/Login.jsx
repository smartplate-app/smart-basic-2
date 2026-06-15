import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Globe, CheckCircle2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import MarketingArticle from "@/components/marketing/MarketingArticle";

const logoUrl = "https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0c6fcae55_smartplate_logo_insta_320x320px.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("he");

  const t = {
    he: {
      welcome: "ברוכים הבאים ל-Smart Plate Basic",
      subtitle: "מערכת ניהול המסעדות והפוד-קוסט המתקדמת בישראל",
      feat1: "שליחת הזמנות לספקים בקליק ישירות לווצאפ",
      feat2: "קליטת חשבוניות אוטומטית וקריאת נתונים בעזרת בינה מלאכותית (AI)",
      feat3: "מחשבון הנדסת תפריט חכם למיקסום רווחים",
      feat4: "ניהול מלא של העסק מכל מקום, ישירות מהטלפון הנייד",
      loginTitle: "התחברות למערכת",
      loginSubtitle: "הזן את פרטי ההתחברות שלך",
      email: "אימייל",
      pass: "סיסמה",
      forgot: "שכחת סיסמה?",
      loginBtn: "התחבר",
      loggingIn: "מתחבר...",
      or: "או",
      google: "המשך עם Google",
      apple: "המשך עם Apple",
      microsoft: "המשך עם Microsoft",
      noAccount: "אין לך חשבון עדיין?",
      createOne: "בקשת גישה למערכת",
      invalidLogin: "אימייל או סיסמה שגויים",
      switchLang: "English",
      copyright: "כל הזכויות שמורות ל-Smart Plate",
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
      loginTitle: "Log in to your account",
      loginSubtitle: "Enter your login credentials",
      email: "Email",
      pass: "Password",
      forgot: "Forgot password?",
      loginBtn: "Log in",
      loggingIn: "Logging in...",
      or: "OR",
      google: "Continue with Google",
      apple: "Continue with Apple",
      microsoft: "Continue with Microsoft",
      noAccount: "Don't have an account?",
      createOne: "Request access",
      invalidLogin: "Invalid email or password",
      switchLang: "עברית",
      copyright: "All rights reserved to Smart Plate",
      imgAlt1: "Restaurant mobile management",
      imgAlt2: "Invoice AI",
      imgAlt3: "WhatsApp Ordering"
    }
  };

  const text = t[lang];
  const isRTL = lang === 'he';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(text.invalidLogin);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col md:flex-row ${isRTL ? 'font-sans' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Marketing Section */}
      <div className="hidden md:flex md:w-3/5 lg:w-3/4 bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white p-8 lg:p-16 flex-col relative overflow-y-auto">
        <div className="fixed top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none"></div>
        <div className="fixed bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#52b788]/20 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col flex-1">
          
          <div className="flex-1 flex flex-col xl:flex-row gap-12 items-center pt-8 md:pt-12">
            <div className="flex-1">
              <div className="bg-white p-2 rounded-3xl shadow-xl mb-8 inline-flex items-center justify-center">
                <img src={logoUrl} alt="Smart Plate Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-2xl" />
              </div>
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
                    <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/ee589f675_IMG_0380.jpg" alt={text.imgAlt1 || "Restaurant mobile management"} className="w-full h-48 object-cover rounded-xl" />
                  </div>
                  <div className="bg-white p-2 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0d18c242b_IMG_0347.jpg" alt={text.imgAlt2 || "Invoice AI"} className="w-full h-56 object-cover rounded-xl" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white p-2 rounded-2xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                    <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/8a97b2afc_IMG_0349.jpeg" alt={text.imgAlt3 || "WhatsApp Ordering"} className="w-full h-auto aspect-video object-contain rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <MarketingArticle lang={lang} isTeaser={true} />

        </div>
        
        <div className="relative z-10 text-sm text-green-200 mt-auto pt-10">
          © {new Date().getFullYear()} {text.copyright}
        </div>
      </div>

      {/* Login Section */}
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
          <div className="md:hidden flex flex-col items-center gap-4 mb-10 justify-center">
            <div className="bg-slate-100 p-2 rounded-2xl shadow-sm">
              <img src={logoUrl} alt="Smart Plate Logo" className="w-12 h-12 object-contain rounded-xl" />
            </div>
            <span className="text-2xl font-bold text-slate-800">Smart Plate</span>
          </div>

          <div className="mb-10 text-center md:text-start">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{text.loginTitle}</h2>
            <p className="text-slate-500">{text.loginSubtitle}</p>
          </div>

          <div className="space-y-3 mb-8">
            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium shadow-sm hover:bg-slate-50 border-slate-200"
              onClick={() => base44.auth.loginWithProvider("google", "/")}
            >
              <GoogleIcon className="w-5 h-5 mr-3 rtl:ml-3 rtl:mr-0" />
              {text.google}
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium bg-black text-white hover:bg-gray-900 border-black shadow-sm"
              onClick={() => base44.auth.loginWithProvider("apple", "/")}
            >
              <svg className="w-5 h-5 mr-3 rtl:ml-3 rtl:mr-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              {text.apple}
            </Button>
          </div>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="bg-white px-4 text-slate-400 font-medium">{text.or}</span>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">{text.email}</Label>
              <div className="relative">
                <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-[#2d6a4f]"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700">{text.pass}</Label>
                <Link to="/forgot-password" className="text-sm text-blue-600 font-medium hover:text-blue-700">
                  {text.forgot}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-[#2d6a4f]"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl bg-[#2d6a4f] hover:bg-[#1b4332] text-white mt-2" disabled={loading}>
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0 animate-spin" />
                  {text.loggingIn}
                </div>
              ) : (
                text.loginBtn
              )}
            </Button>
          </form>

          <div className="mt-8 text-center text-slate-600 text-sm">
            {text.noAccount}{" "}
            <Link to="/Register" className="text-[#2d6a4f] font-bold hover:text-[#1b4332] hover:underline">
              {text.createOne}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}