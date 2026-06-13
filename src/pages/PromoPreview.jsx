import React, { useState } from "react";
import { Globe, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690a006cfeba8053be10f189/b1f6773e1_IMG_0299.png";

export default function PromoPreview() {
  const [lang, setLang] = useState("he");

  const t = {
    he: {
      welcome: "ברוכים הבאים ל-Smart Plate",
      subtitle: "מערכת ניהול המסעדות והפוד-קוסט המתקדמת בישראל",
      feat1: "שליחת הזמנות לספקים בקליק ישירות לווצאפ",
      feat2: "קליטת חשבוניות אוטומטית וקריאת נתונים בעזרת בינה מלאכותית (AI)",
      feat3: "מחשבון הנדסת תפריט חכם למיקסום רווחים",
      feat4: "ניהול מלא של העסק מכל מקום, ישירות מהטלפון הנייד",
      switchLang: "English",
      copyright: "כל הזכויות שמורות ל-Smart Plate",
      imgAlt1: "ניהול מסעדה מהנייד",
      imgAlt2: "בינה מלאכותית לקבלות",
      imgAlt3: "הזמנות בווצאפ",
      title: "תצוגת מסך התחברות"
    },
    en: {
      welcome: "Welcome to Smart Plate",
      subtitle: "The most advanced restaurant & food-cost management system",
      feat1: "Send orders to suppliers in one click directly via WhatsApp",
      feat2: "Automatic invoice processing and data reading with AI",
      feat3: "Smart Menu Engineering calculator to maximize profits",
      feat4: "Manage your entire business on the go, directly from your mobile phone",
      switchLang: "עברית",
      copyright: "All rights reserved to Smart Plate",
      imgAlt1: "Restaurant mobile management",
      imgAlt2: "Invoice AI",
      imgAlt3: "WhatsApp Ordering",
      title: "Login Screen Preview"
    }
  };

  const text = t[lang];
  const isRTL = lang === 'he';

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">{text.title}</h1>
        <Button variant="outline" onClick={() => setLang(lang === 'he' ? 'en' : 'he')}>
          <Globe className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {text.switchLang}
        </Button>
      </div>

      <div className={`min-h-[800px] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row ${isRTL ? 'font-sans' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="w-full bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white p-8 lg:p-16 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/5 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#52b788]/20 blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                  <div className="bg-white p-2.5 rounded-2xl shadow-lg">
                  <img src={logoUrl} alt="Smart Plate" className="h-12 w-auto" />
                  </div>
                  <span className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">Smart Plate</span>
              </div>
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
      </div>
    </div>
  );
}