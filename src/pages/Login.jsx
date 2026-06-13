import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2, Globe, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";

const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/b1f6773e1_IMG_0299.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState("he");

  const t = {
    he: {
      welcome: "ברוכים הבאים ל-Smart Plate",
      subtitle: "מערכת ניהול המסעדות והפוד-קוסט המתקדמת בישראל",
      feat1: "ניהול פוד-קוסט ומלאי חכם",
      feat2: "מעקב אחר הזמנות וקבלות מספקים",
      feat3: "סידור עבודה וניהול שכר עובדים",
      feat4: "דוחות בזמן אמת ותחזיות חכמות",
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
      noAccount: "אין לך חשבון?",
      createOne: "צור חשבון בחינם",
      invalidLogin: "אימייל או סיסמה שגויים",
      switchLang: "English",
      copyright: "כל הזכויות שמורות ל-Smart Plate"
    },
    en: {
      welcome: "Welcome to Smart Plate",
      subtitle: "The most advanced restaurant & food-cost management system",
      feat1: "Smart Food Cost & Inventory Management",
      feat2: "Orders & Supplier Receipts Tracking",
      feat3: "Employee Scheduling & Payroll",
      feat4: "Real-time Reports & Smart Predictions",
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
      createOne: "Create one for free",
      invalidLogin: "Invalid email or password",
      switchLang: "עברית",
      copyright: "All rights reserved to Smart Plate"
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

      {/* Login Section */}
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
          <div className="md:hidden flex flex-col items-center gap-4 mb-10 justify-center">
            <div className="bg-slate-100 p-3 rounded-2xl shadow-sm">
              <img src={logoUrl} alt="Smart Plate" className="h-10 w-auto" />
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
            <Button
              variant="outline"
              className="w-full h-12 text-base font-medium shadow-sm hover:bg-slate-50 border-slate-200"
              onClick={() => base44.auth.loginWithProvider("azure", "/")}
            >
              <svg className="w-5 h-5 mr-3 rtl:ml-3 rtl:mr-0" viewBox="0 0 23 23">
                <path fill="#f25022" d="M1 1h10v10H1z"/>
                <path fill="#00a4ef" d="M12 1h10v10H12z"/>
                <path fill="#7fba00" d="M1 12h10v10H1z"/>
                <path fill="#ffb900" d="M12 12h10v10H12z"/>
              </svg>
              {text.microsoft}
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
                  className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-blue-500"
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
                  className="ps-11 h-12 bg-slate-50 border-slate-200 text-base rounded-xl focus-visible:ring-blue-500"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 mt-2" disabled={loading}>
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

          <div className="mt-8 text-center text-slate-600">
            {text.noAccount}{" "}
            <Link to="/register" className="text-blue-600 font-semibold hover:text-blue-700 hover:underline">
              {text.createOne}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}