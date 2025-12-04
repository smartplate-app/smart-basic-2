import React, { useState, useEffect } from "react";
import { WifiOff, Save, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "./LanguageProvider";

export default function OfflineNotification({ onSaveLocal, pageName }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
      setSavedLocally(false);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSaveLocal = () => {
    if (onSaveLocal) {
      onSaveLocal();
      setSavedLocally(true);
    }
  };

  if (!isOffline || dismissed) return null;

  const isRTL = language === 'he' || language === 'ar';

  return (
    <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-orange-500 text-white rounded-lg shadow-2xl p-4 z-50 animate-pulse ${isRTL ? 'md:left-4 md:right-auto' : ''}`}>
      <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
        <div className="bg-orange-600 p-2 rounded-full flex-shrink-0">
          <WifiOff className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-lg mb-1">
            {language === 'he' ? '⚠️ אין חיבור לאינטרנט!' : '⚠️ No Internet Connection!'}
          </h4>
          <p className="text-sm text-orange-100 mb-3">
            {language === 'he' 
              ? 'מומלץ לשמור את הנתונים מקומית עד שהחיבור יחזור'
              : 'We recommend saving your data locally until connection is restored'}
          </p>
          
          {savedLocally ? (
            <div className={`flex items-center gap-2 text-green-200 font-medium ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span>✓</span>
              <span>{language === 'he' ? 'הנתונים נשמרו מקומית!' : 'Data saved locally!'}</span>
            </div>
          ) : (
            onSaveLocal && (
              <Button
                onClick={handleSaveLocal}
                className={`bg-white text-orange-600 hover:bg-orange-100 font-bold ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'he' ? 'שמור מקומית' : 'Save Locally'}
              </Button>
            )
          )}
        </div>
        <button 
          onClick={() => setDismissed(true)}
          className="text-orange-200 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}