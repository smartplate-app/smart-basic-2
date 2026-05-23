import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
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
  const [existingItems, setExistingItems] = useState([]);
  const [mappedItems, setMappedItems] = useState({});
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");

  useEffect(() => {
    let interval;
    if (loading && progressStatus === "Updating Database...") {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 5;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [loading, progressStatus]);

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
      let payloadParsedData = parsedData;
      
      if (!retryWithPrices) {
        setProgress(5);
        setProgressStatus(language === 'he' ? "מזהה גיליונות..." : "Fetching sheet metadata...");
        
        // 1. Get Spreadsheet ID
        let spreadsheetId = url;
        const m = String(url).match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (m) spreadsheetId = m[1];
        
        const metaRes = await base44.functions.invoke('fetchSheetMetadata', { spreadsheetId });
        if (!metaRes.data || !metaRes.data.success) {
           throw new Error(metaRes.data?.error || "Failed to fetch sheets metadata");
        }
        
        const sheets = metaRes.data.sheets;
        if (!sheets || sheets.length === 0) throw new Error("No sheets found");
        
        let allItems = [];
        let allRecipes = [];
        
        // 2. Process each sheet sequentially
        for (let i = 0; i < sheets.length; i++) {
          const sheetName = sheets[i].title;
          setProgressStatus(language === 'he' ? `מנתח גיליון ${i+1}/${sheets.length}...` : `Parsing sheet ${i+1}/${sheets.length}...`);
          setProgress(10 + Math.floor((i / sheets.length) * 70));
          
          try {
            const aiRes = await base44.functions.invoke('parseRecipesSheetLLM', { spreadsheetUrl: url, sheetName });
            if (aiRes.data && aiRes.data.success) {
               if (aiRes.data.items) allItems.push(...aiRes.data.items);
               if (aiRes.data.recipes) allRecipes.push(...aiRes.data.recipes);
            }
          } catch(err) {
             console.error(`Failed to parse sheet ${sheetName}`, err);
          }
        }
        
        payloadParsedData = { items: allItems, recipes: allRecipes };
        setParsedData(payloadParsedData);
      }

      setProgressStatus(language === 'he' ? "מעדכן מסד נתונים..." : "Updating Database...");
      setProgress(85);

      const payload = { spreadsheetUrl: url };
      payload.parsedData = payloadParsedData;
      
      if (retryWithPrices) {
        payload.providedPrices = providedPrices;
        payload.mappedItems = mappedItems;
      }

      const response = await base44.functions.invoke('importRecipesFromSheet', payload);

      if (response.data && response.data.requires_prices) {
        setMissingItems(response.data.missing_items);
        setParsedData(response.data.parsedData);
        setExistingItems(response.data.existing_items || []);
        
        const initialPrices = {};
        const initialMapped = {};
        response.data.missing_items.forEach(item => {
          initialPrices[item.name.trim().toLowerCase()] = "";
          initialMapped[item.name.trim().toLowerCase()] = "";
        });
        setProvidedPrices(initialPrices);
        setMappedItems(initialMapped);
        return;
      }

      if (response.data && response.data.success) {
        const itemsCount = response.data.created_items_count ?? 0;
        const recipesCount = response.data.created_recipes_count ?? 0;
        alert(language === 'he' 
          ? `יובאו בהצלחה ${itemsCount} מרכיבים ו-${recipesCount} מתכונים.` 
          : `Successfully imported ${itemsCount} ingredients and ${recipesCount} recipes.`);
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
                ? 'נמצאו מרכיבים שאינם קיימים במדויק ברשימת הפריטים שלך. אנא בחר פריט קיים כדי לקשר אליו, או הזן מחיר כדי ליצור אותו כפריט חדש.' 
                : 'Found ingredients that do not exist exactly in your items list. Please select an existing item to link, or enter a price to create it as a new item.'}
            </div>
            <div className="max-h-80 overflow-y-auto space-y-3 p-1 bg-gray-50/50 rounded-md">
              {missingItems.map((item, idx) => {
                const key = item.name.trim().toLowerCase();
                const isMapped = !!mappedItems[key];
                return (
                  <div key={idx} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-md bg-white shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-sm font-bold text-gray-800">{item.name} <span className="text-xs text-gray-500 font-normal mx-1">({item.unit})</span></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={mappedItems[key] || "new"}
                        onValueChange={(val) => setMappedItems({ ...mappedItems, [key]: val === "new" ? "" : val })}
                      >
                        <SelectTrigger className="flex-1 h-9">
                          <SelectValue placeholder={language === 'he' ? 'בחר פריט קיים...' : 'Select existing item...'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new" className="font-bold text-[#107c41] bg-green-50/50">{language === 'he' ? '+ צור כפריט חדש' : '+ Create new item'}</SelectItem>
                          {existingItems.map(ei => (
                            <SelectItem key={ei.id} value={ei.id}>{ei.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {!isMapped && (
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={language === 'he' ? 'מחיר' : 'Price'}
                          className="w-24 h-9 font-medium"
                          value={providedPrices[key] || ""}
                          onChange={(e) => setProvidedPrices({ ...providedPrices, [key]: e.target.value })}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}
            
            {loading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{progressStatus}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
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

              {loading && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{progressStatus}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
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