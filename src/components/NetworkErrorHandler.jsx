import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, WifiOff, AlertCircle } from "lucide-react";
import { useLanguage } from "./LanguageProvider";

export default function NetworkErrorHandler({ onRetry, errorMessage }) {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="bg-red-50 border-b">
          <CardTitle className="text-red-700 text-center flex items-center justify-center gap-2">
            <WifiOff className="w-6 h-6" />
            {language === 'he' ? 'שגיאת חיבור' : language === 'ar' ? 'خطأ في الاتصال' : language === 'el' ? 'Σφάλμα Σύνδεσης' : 'Connection Error'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="text-center space-y-3">
            {errorMessage && (
              <div className="flex items-start gap-2 text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-600 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <p className="font-medium mb-1">
                    {language === 'he' 
                      ? 'לא ניתן להתחבר לשרת'
                      : language === 'ar'
                      ? 'تعذر الاتصال بالخادم'
                      : language === 'el'
                      ? 'Αδυναμία σύνδεσης με τον διακομιστή'
                      : 'Cannot connect to server'}
                  </p>
                  <p className="text-xs text-gray-500 break-words">
                    {errorMessage}
                  </p>
                </div>
              </div>
            )}
            
            <p className="text-gray-600">
              {language === 'he' 
                ? 'אנא בדוק את חיבור האינטרנט ונסה שוב'
                : language === 'ar'
                ? 'يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى'
                : language === 'el'
                ? 'Ελέγξτε τη σύνδεσή σας στο Internet και δοκιμάστε ξανά'
                : 'Please check your internet connection and try again'}
            </p>
            
            <div className="text-sm text-gray-500">
              {language === 'he'
                ? 'אם הבעיה נמשכת, נסה:'
                : language === 'ar'
                ? 'إذا استمرت المشكلة، جرب:'
                : language === 'el'
                ? 'Εάν το πρόβλημα παραμένει, δοκιμάστε:'
                : 'If the problem persists, try:'}
            </div>
            <ul className={`text-sm text-gray-500 space-y-1 ${['he', 'ar'].includes(language) ? 'text-right list-disc list-inside' : 'text-left list-disc list-inside'}`}>
              <li>{language === 'he' ? 'רענן את הדף' : language === 'ar' ? 'إعادة تحميل الصفحة' : language === 'el' ? 'Ανανεώστε τη σελίδα' : 'Refresh the page'}</li>
              <li>{language === 'he' ? 'בדוק את חיבור האינטרנט שלך' : language === 'ar' ? 'تحقق من اتصال الإنترنت' : language === 'el' ? 'Ελέγξτε τη σύνδεσή σας στο Internet' : 'Check your internet connection'}</li>
              <li>{language === 'he' ? 'כבה VPN אם פעיל' : language === 'ar' ? 'أوقف VPN إذا كان نشطًا' : language === 'el' ? 'Απενεργοποιήστε το VPN εάν είναι ενεργό' : 'Disable VPN if active'}</li>
              <li>{language === 'he' ? 'נסה דפדפן אחר' : language === 'ar' ? 'جرب متصفح آخر' : language === 'el' ? 'Δοκιμάστε έναν άλλο περιηγητή' : 'Try a different browser'}</li>
              <li>{language === 'he' ? 'המתן מספר שניות ונסה שוב' : language === 'ar' ? 'انتظر بضع ثوانٍ وحاول مرة أخرى' : language === 'el' ? 'Περιμένετε μερικά δευτερόλεπτα και δοκιμάστε ξανά' : 'Wait a few seconds and try again'}</li>
            </ul>
          </div>
          <Button
            onClick={onRetry}
            className="w-full bg-gray-900 hover:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 ${['he', 'ar'].includes(language) ? 'ml-2' : 'mr-2'}`} />
            {language === 'he' ? 'נסה שוב' : language === 'ar' ? 'حاول مرة أخرى' : language === 'el' ? 'Προσπαθήστε ξανά' : 'Try Again'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}