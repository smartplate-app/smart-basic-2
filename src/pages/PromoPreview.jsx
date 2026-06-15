import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Globe, CheckCircle2 } from "lucide-react";
import MarketingArticle from "@/components/marketing/MarketingArticle";

export default function PromoPreview() {
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
      loginBtn: "Log In",
      signupBtn: "Request Access",
      switchLang: "עברית",
      copyright: "All rights reserved to Smart Plate",
      imgAlt1: "Restaurant mobile management",
      imgAlt2: "Invoice AI",
      imgAlt3: "WhatsApp Ordering"
    }
  };

  const text = t[lang];
  const isRTL = lang === 'he';

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white flex flex-col relative overflow-hidden ${isRTL ? 'font-sans' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background decorations */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#52b788]/30 blur-3xl"></div>
      
      {/* Header */}
      <div className="relative z-20 flex justify-end items-center p-6 lg:px-12">
        <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}>
          <Globe className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" />
          {text.switchLang}
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col xl:flex-row gap-8 lg:gap-12 items-center justify-center p-6 lg:p-12 max-w-7xl mx-auto w-full mt-4 md:mt-0">
        
        {/* Text and Actions */}
        <div className="flex-1 flex flex-col items-center xl:items-start text-center xl:text-start w-full">
          <div className="bg-white p-2 rounded-3xl shadow-xl mb-8 flex items-center justify-center">
            <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0c6fcae55_smartplate_logo_insta_320x320px.png" alt="Smart Plate Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-2xl" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 drop-shadow-sm">
            {text.welcome}
          </h1>
          <p className="text-xl md:text-2xl text-green-50 mb-10 max-w-2xl font-light">
            {text.subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-12">
            <Link to="/app-login" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-2xl bg-white text-[#1b4332] hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                {text.loginBtn}
              </Button>
            </Link>
            <Link to="/Register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-2xl bg-[#52b788] text-white hover:bg-[#40916c] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 border border-[#74c69d]">
                {text.signupBtn}
              </Button>
            </Link>
          </div>

          <div className="space-y-4 text-base md:text-lg font-medium bg-white/10 p-6 md:p-8 rounded-3xl backdrop-blur-md border border-white/20 shadow-xl w-full max-w-2xl text-start">
            {[text.feat1, text.feat2, text.feat3, text.feat4].map((feat, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="bg-[#52b788] p-1.5 rounded-full mt-1 shrink-0 shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-white leading-relaxed">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Images Grid (Hidden on very small screens, visible on md+) */}
        <div className="flex-1 w-full max-w-lg xl:max-w-none relative hidden md:block">
          <div className="grid grid-cols-2 gap-4 transform xl:translate-x-12">
            <div className="space-y-4 pt-12">
              <div className="bg-white p-2 rounded-2xl shadow-2xl transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/ee589f675_IMG_0380.jpg" alt={text.imgAlt1} className="w-full h-48 lg:h-64 object-cover rounded-xl" />
              </div>
              <div className="bg-white p-2 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0d18c242b_IMG_0347.jpg" alt={text.imgAlt2} className="w-full h-56 lg:h-72 object-cover rounded-xl" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white p-2 rounded-2xl shadow-2xl transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/8a97b2afc_IMG_0349.jpeg" alt={text.imgAlt3} className="w-full h-auto aspect-video object-contain rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        </div>

        <div className="relative z-10 flex justify-center w-full px-6">
          <MarketingArticle lang={lang} isTeaser={true} />
        </div>

        <div className="relative z-10 text-sm text-green-200 py-6 text-center">
        © {new Date().getFullYear()} {text.copyright}
      </div>
    </div>
  );
}