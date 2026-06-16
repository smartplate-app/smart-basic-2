import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, Check } from "lucide-react";

export default function WelcomePage() {
  const [lang, setLang] = useState("he");

  const t = {
    he: {
      welcome: "ברוכים הבאים ל-Smart Plate Basic",
      subtitle: "מערכת ניהול המסעדות והפוד-קוסט המתקדמת בישראל",
      feat1: "שליחת הזמנות לספקים בקליק ישירות לווצאפ",
      feat2: "קליטת חשבוניות אוטומטית וקריאת נתונים בעזרת בינה מלאכותית (AI)",
      feat3: "מחשבון הנדסת תפריט חכם למיקסום רווחים",
      feat4: "ניהול מלא של העסק מכל מקום, ישירות מהטלפון הנייד",
      loginBtn: "התחברות למערכת",
      signupBtn: "בקשת גישה למערכת",
      switchLang: "English",
    },
    en: {
      welcome: "Welcome to Smart Plate Basic",
      subtitle: "The most advanced restaurant & food-cost management system in Israel",
      feat1: "Send orders to suppliers in one click directly via WhatsApp",
      feat2: "Automatic invoice processing and data reading with AI",
      feat3: "Smart Menu Engineering calculator to maximize profits",
      feat4: "Manage your entire business on the go, directly from your mobile phone",
      loginBtn: "Log In",
      signupBtn: "Request Access",
      switchLang: "עברית",
    }
  };

  const text = t[lang];
  const isRTL = lang === 'he';

  return (
    <div 
      className={`min-h-screen flex flex-col relative overflow-hidden text-white ${isRTL ? 'font-sans' : ''}`} 
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ background: 'linear-gradient(145deg, #1a4231 0%, #2a5a43 100%)' }}
    >
      {/* Header - Top Left absolute */}
      <div className="absolute top-6 left-6 z-20">
        <Button 
          variant="ghost" 
          className="text-white hover:bg-white/10 hover:text-white text-[15px] font-medium px-4 py-2 h-auto rounded-full" 
          onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
        >
          <span className="flex items-center gap-2" dir="ltr">
            {text.switchLang}
            <Globe className="w-4 h-4" />
          </span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 w-full max-w-5xl mx-auto pt-16">
        
        {/* Logo */}
        <div className="bg-white p-3 rounded-[24px] shadow-lg mb-8">
          <img 
            src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0c6fcae55_smartplate_logo_insta_320x320px.png" 
            alt="Smart Plate" 
            className="w-[80px] h-[80px] object-contain rounded-[16px]"
          />
        </div>

        {/* Typography */}
        <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold mb-4 text-center tracking-tight leading-tight drop-shadow-sm">
          {text.welcome}
        </h1>
        <p className="text-lg md:text-[22px] text-[#e8f5ed] mb-10 text-center font-normal drop-shadow-sm">
          {text.subtitle}
        </p>
        
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-5 mb-16 w-full sm:w-auto">
          <Link to="/app-login" className="w-full sm:w-auto">
            <Button className="w-full sm:w-[220px] h-[52px] text-lg font-bold rounded-xl bg-white text-[#1a4231] hover:bg-gray-100 shadow-md transition-transform hover:-translate-y-0.5">
              {text.loginBtn}
            </Button>
          </Link>
          <Link to="/Register" className="w-full sm:w-auto">
            <Button className="w-full sm:w-[220px] h-[52px] text-lg font-bold rounded-xl bg-[#5ab483] text-white hover:bg-[#4a9d70] shadow-md border-none transition-transform hover:-translate-y-0.5">
              {text.signupBtn}
            </Button>
          </Link>
        </div>

        {/* Features List */}
        <div className="w-full max-w-[700px] bg-white/[0.08] backdrop-blur-md rounded-t-[28px] rounded-b-xl border border-white/10 p-8 md:p-10 shadow-2xl">
          <div className="flex flex-col space-y-5">
            {[text.feat1, text.feat2, text.feat3, text.feat4].map((feat, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 border-[#5ab483] text-[#5ab483]">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-white text-[16px] md:text-[18px] font-medium leading-tight">
                  {feat}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}