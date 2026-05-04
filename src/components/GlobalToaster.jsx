import React, { useEffect } from 'react';
import { Toaster as Sonner, toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, AlertOctagon, X } from "lucide-react";
import { useLanguage } from './LanguageProvider';

// Custom Toast Component
const CustomToast = ({ type, title, message, t, id }) => {
  const isError = type === 'error';
  
  return (
    <Card className="w-[350px] shadow-2xl border-0 overflow-hidden relative">
      <button 
        onClick={() => toast.dismiss(id)}
        className={`absolute top-3 ${document.documentElement.dir === 'rtl' ? 'left-3' : 'right-3'} opacity-70 hover:opacity-100 transition-opacity`}
      >
        <X className={`w-5 h-5 ${isError ? 'text-red-700' : 'text-green-700'}`} />
      </button>

      <CardHeader className={`${isError ? 'bg-red-50' : 'bg-green-50'} border-b pb-4 pt-4`}>
        <CardTitle className={`${isError ? 'text-red-700' : 'text-green-700'} text-center flex items-center justify-center gap-2 text-lg`}>
          {isError ? <AlertOctagon className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-4 bg-white">
        <div className={`flex items-start gap-2 text-sm p-3 rounded border ${isError ? 'bg-yellow-50 border-yellow-200 text-gray-700' : 'bg-green-50/50 border-green-100 text-gray-700'}`}>
          <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isError ? 'text-yellow-600' : 'text-green-600'}`} />
          <div className="flex-1 text-right rtl:text-right ltr:text-left break-words" style={{ direction: document.documentElement.dir || 'rtl' }}>
            <p className="font-medium mb-1">
              {isError ? t('error') || 'שגיאה במערכת' : t('success') || 'הפעולה בוצעה בהצלחה'}
            </p>
            <p className="text-xs opacity-90 whitespace-pre-wrap">
              {message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function GlobalToaster() {
  const { t, language } = useLanguage();

  useEffect(() => {
    // Override window.alert globally
    const originalAlert = window.alert;
    window.alert = (message) => {
      if (!message) return;
      const msgStr = String(message);
      const isError = msgStr.toLowerCase().includes('error') || 
                      msgStr.toLowerCase().includes('failed') || 
                      msgStr.includes('שגיאה') || 
                      msgStr.includes('נכשל') ||
                      msgStr.includes('לא ניתן');
      
      const title = isError 
        ? (language === 'he' ? 'הודעת שגיאה' : 'Error')
        : (language === 'he' ? 'אישור פעולה' : 'Success');

      toast.custom((id) => (
        <CustomToast 
          id={id}
          type={isError ? 'error' : 'success'} 
          title={title} 
          message={msgStr} 
          t={t} 
        />
      ), { duration: isError ? 6000 : 4000 });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [t, language]);

  return (
    <Sonner 
      position="top-center" 
      toastOptions={{
        style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 },
      }}
    />
  );
}