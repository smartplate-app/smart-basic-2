import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

export default function POSSettings() {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';

  return (
    <div className={`p-4 md:p-8 max-w-4xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? "rtl" : "ltr"}>
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        {language === 'he' ? 'הגדרות מערכת קופה (POS)' : 'POS Settings'}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            {language === 'he' ? 'מידע על מערכות קופה' : 'POS Systems Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-gray-700 leading-relaxed">
            {language === 'he' 
              ? 'Smart Plate Basic פועלת כמערכת ניהול משרד אחורי עצמאית למסעדות; נתוני מכירות ותפעול מוזנים או מנוהלים בתוך Smart Plate Basic, ואין לה חיבור ישיר למערכות קופה (POS) ואין לה שום קשר ל-MarketMan.' 
              : 'Smart Plate Basic operates as a standalone restaurant back-office management system; sales and operational data are entered or managed within Smart Plate Basic, and it has no direct connection to POS systems and no connection to MarketMan.'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}