import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Link as LinkIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";

export default function ImportSuppliersItemsModal({ isOpen, onClose, onSuccess }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleImport = async () => {
    if (!url) {
      setError(language === 'he' ? "נא להזין קישור" : "Please enter a URL");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await base44.functions.invoke("importSuppliersAndItemsFromSheet", {
        spreadsheetUrl: url
      });
      
      if (response.data?.success) {
        setSuccess({
          suppliers: response.data.suppliers_created,
          items: response.data.items_created
        });
        setTimeout(() => {
          onSuccess();
          onClose();
          setUrl("");
          setSuccess(null);
        }, 3000);
      } else {
        setError(response.data?.error || "Import failed");
      }
    } catch (err) {
      setError(err.message || "Failed to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !loading) {
        onClose();
        setUrl("");
        setError(null);
        setSuccess(null);
      }
    }}>
      <DialogContent className={`sm:max-w-[500px] ${isRTL ? 'text-right' : 'text-left'}`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileSpreadsheetIcon />
            {language === 'he' ? 'ייבוא ספקים ופריטים' : 'Import Suppliers & Items'}
          </DialogTitle>
          <DialogDescription>
            {language === 'he' 
              ? 'הדבק קישור לגוגל שיטס. המערכת תוסיף אוטומטית ספקים חסרים ואת כל הפריטים תחתיהם.' 
              : 'Paste a link to a Google Sheet. The system will automatically add missing suppliers and all items under them.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {language === 'he' ? 'קישור לגוגל שיטס:' : 'Google Sheets URL:'}
            </label>
            <div className="relative">
              <LinkIcon className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} w-5 h-5 text-gray-400`} />
              <Input
                type="url"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={isRTL ? 'pr-10' : 'pl-10'}
                disabled={loading || success}
              />
            </div>
            <p className="text-xs text-gray-500">
              {language === 'he' 
                ? 'יש לוודא שיש עמודות "ספק" ו"שם פריט" (חובה). רצוי גם: מחיר, מק"ט, יחידת מידה. המסמך חייב להיות ציבורי (Anyone with the link can view).' 
                : 'Make sure there are "Supplier" and "Item Name" columns. Optional: Price, Catalog Number, Unit. The document must be public (Anyone with the link can view).'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md flex items-start gap-2 text-sm border border-red-200">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">{language === 'he' ? 'שגיאה' : 'Error'}</p>
                <p>{error}</p>
                {error.includes("access") || error.includes("404") || error.includes("view") || error.includes("exist") ? (
                   <p className="mt-2 text-xs opacity-90">
                     {language === 'he' ? 'המסמך חסום. אם אתה משתמש בחשבון עסקי/ארגוני, "כל מי שיש לו את הקישור" עלול להיות מוגבל לארגון שלך בלבד. ודא שהקישור עובד בחלון גלישה בסתר (Incognito).' : 'The document is blocked. If you are using a work/school account, "Anyone with the link" might only mean your organization. Please verify the link works in an Incognito window.'}
                   </p>
                ) : null}
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-start gap-3 border border-green-200">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold text-lg mb-1">{language === 'he' ? 'הייבוא הושלם בהצלחה!' : 'Import completed successfully!'}</p>
                <p className="text-sm">
                  {language === 'he' 
                    ? `נוצרו ${success.suppliers} ספקים חדשים ו-${success.items} פריטים חדשים.` 
                    : `Created ${success.suppliers} new suppliers and ${success.items} new items.`}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={`flex justify-end gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {language === 'he' ? 'ביטול' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!url || loading || success}
            className="bg-[#d4a373] hover:bg-[#b88c60] text-white min-w-[120px]"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {language === 'he' ? 'מייבא...' : 'Importing...'}</>
            ) : (
              language === 'he' ? 'התחל ייבוא' : 'Start Import'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FileSpreadsheetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="8" y1="13" x2="16" y2="13"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}