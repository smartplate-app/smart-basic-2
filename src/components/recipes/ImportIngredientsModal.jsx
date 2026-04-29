import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";
import { Loader2, FileSpreadsheet } from "lucide-react";

export default function ImportIngredientsModal({ isOpen, onClose, onSuccess }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [missingItems, setMissingItems] = useState([]);
  const [parsedData, setParsedData] = useState(null);
  const [providedPrices, setProvidedPrices] = useState({});

  const handleGenerateTemplate = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateRecipeTemplateSheet', {});
      if (response.data && response.data.success) {
        window.open(response.data.url, '_blank');
      } else {
        throw new Error(response.data?.error || 'Failed to generate template');
      }
    } catch (err) {
      console.error(err);
      alert(language === 'he' ? 'שגיאה ביצירת תבנית: ' + err.message : 'Error generating template: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleImport = async (e, retryWithPrices = false) => {
    if (e) e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError("");

    try {
      const payload = { spreadsheetUrl: url };
      if (retryWithPrices) {
        payload.parsedData = parsedData;
        payload.providedPrices = providedPrices;
      }

      const response = await base44.functions.invoke('importRecipesFromSheet', payload);

      if (response.data && response.data.requires_prices) {
        setMissingItems(response.data.missing_items);
        setParsedData(response.data.parsedData);
        const initialPrices = {};
        response.data.missing_items.forEach(item => {
          initialPrices[item.name.trim().toLowerCase()] = "";
        });
        setProvidedPrices(initialPrices);
        return;
      }

      if (response.data && response.data.success) {
        alert(language === 'he' 
          ? `יובאו בהצלחה ${response.data.created_items_count} מרכיבים ו-${response.data.created_recipes_count} מתכונים.` 
          : `Successfully imported ${response.data.created_items_count} ingredients and ${response.data.created_recipes_count} recipes.`);
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data?.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error("Import error:", err);
      setError(err.message || (language === 'he' ? 'שגיאה בייבוא הנתונים' : 'Error importing data'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={isRTL ? 'text-right' : 'text-left'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            {language === 'he' ? 'ייבוא מתכונים ומרכיבים מ-Google Sheets' : 'Import Recipes & Ingredients from Google Sheets'}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {language === 'he' 
              ? 'ניתן להשתמש בתבנית מסודרת של המערכת (לחיצה מטה), או להדביק קישור לקובץ שלכם. בזכות מערכת ה-AI שלנו, אפשר להשתמש כמעט בכל מבנה נתונים — המערכת תזהה את המרכיבים והמתכונים שלכם! ודאו שהקובץ פתוח לצפייה (Anyone with the link can view).'
              : 'Generate an organized template below, or paste a link to your own Google Sheet. Thanks to our AI system, you can use almost any file structure — the system will automatically identify your ingredients and recipes! Make sure the sheet is accessible (Anyone with the link can view).'}
          </DialogDescription>
        </DialogHeader>

        {missingItems.length > 0 ? (
          <div className="space-y-4 mt-4 border-t pt-4">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm">
              {language === 'he' 
                ? 'נמצאו מרכיבים שאינם קיימים ברשימת הפריטים שלך (ייתכן והשמות אינם זהים לחלוטין). אנא הזן את המחיר עבור כל פריט כדי להוסיף אותו כפריט חדש. לחלופין, תוכל לגשת לדף ״פריטים״, ללחוץ על ״ייצוא ל-Google Sheets״, להעתיק את רשימת הפריטים שלך ללשונית חדשה (כמו ״מרכיבים״) בקובץ שלך, ולייבא שוב.' 
                : 'Found ingredients that do not exist in your items list (names might not match exactly). Please enter the price for each item to add them as new items. Alternatively, you can go to the Items page, click "Export to Google Sheets", copy your items list into a new tab (like "Ingredients") in your file, and import again.'}
            </div>
            <div className="max-h-60 overflow-y-auto space-y-3 p-1">
              {missingItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1 text-sm font-medium">{item.name}</div>
                  <div className="w-24 text-xs text-gray-500">{item.unit}</div>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={language === 'he' ? 'מחיר' : 'Price'}
                    className="w-24 h-8"
                    value={providedPrices[item.name.trim().toLowerCase()] || ""}
                    onChange={(e) => setProvidedPrices({ ...providedPrices, [item.name.trim().toLowerCase()]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => { setMissingItems([]); setParsedData(null); }} disabled={loading}>
                {language === 'he' ? 'חזור' : 'Back'}
              </Button>
              <Button type="button" onClick={() => handleImport(null, true)} disabled={loading} className="bg-[#107c41] hover:bg-[#0c5e31]">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {language === 'he' ? 'המשך ייבוא' : 'Continue Import'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} mt-2`}>
              <Button type="button" variant="outline" onClick={handleGenerateTemplate} disabled={generating} className="text-[#107c41] border-[#107c41] bg-green-50 hover:bg-green-100">
                {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {language === 'he' ? 'הורד תבנית לדוגמה' : 'Generate Template'}
              </Button>
            </div>

            <form onSubmit={(e) => handleImport(e, false)} className="space-y-4 mt-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {language === 'he' ? 'קישור לגיליון (URL)' : 'Spreadsheet URL'}
                </label>
                <Input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className={isRTL ? 'text-right' : 'text-left'}
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                  {error}
                </div>
              )}

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  {language === 'he' ? 'ביטול' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={loading || !url} className="bg-[#107c41] hover:bg-[#0c5e31]">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {language === 'he' ? 'ייבא נתונים' : 'Import Data'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}