import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";
import { Loader2, FileSpreadsheet } from "lucide-react";

export default function ImportIngredientsModal({ isOpen, onClose, onSuccess, importType }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");

  useEffect(() => {
    setParsedData(null);
  }, [url, importType]);

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

  const handleImport = async (e) => {
    if (e) e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError("");

    try {
      let payloadParsedData = parsedData;
      
      if (!payloadParsedData) {
        setProgress(5);
        setProgressStatus(language === 'he' ? "מזהה גיליונות..." : "Fetching sheet metadata...");
        
        // 1. Get Spreadsheet ID
        let spreadsheetId = url;
        const m = String(url).match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (m) {
          spreadsheetId = m[1];
        } else {
          // If the user just pasted the ID with /edit
          const m2 = String(url).match(/^([a-zA-Z0-9-_]+)(\/edit|\?|$)/);
          if (m2) spreadsheetId = m2[1];
        }
        
        const metaRes = await base44.functions.invoke('fetchSheetMetadata', { spreadsheetId });
        if (!metaRes.data || !metaRes.data.success) {
           throw new Error(metaRes.data?.error || "Failed to fetch sheets metadata");
        }
        
        const sheets = metaRes.data.sheets;
        if (!sheets || sheets.length === 0) throw new Error("No sheets found");
        
        let allRecipes = [];
        
        // 2. Process each sheet sequentially
        for (let i = 0; i < sheets.length; i++) {
          const sheetName = sheets[i].title;
          setProgressStatus(language === 'he' ? `מנתח גיליון ${i+1}/${sheets.length}...` : `Parsing sheet ${i+1}/${sheets.length}...`);
          setProgress(10 + Math.floor((i / sheets.length) * 70));
          
          try {
            const aiRes = await base44.functions.invoke('parseRecipesSheetLLM', { spreadsheetUrl: url, sheetName, importType });
            if (aiRes.data && aiRes.data.success) {
               if (aiRes.data.recipes) allRecipes.push(...aiRes.data.recipes);
            }
          } catch(err) {
             console.error(`Failed to parse sheet ${sheetName}`, err);
          }
        }
        
        payloadParsedData = { recipes: allRecipes };
        setParsedData(payloadParsedData);
      }

      setProgressStatus(language === 'he' ? "מעדכן מסד נתונים..." : "Updating Database...");
      setProgress(85);

      const payload = { spreadsheetUrl: url, parsedData: payloadParsedData, importType };
      const response = await base44.functions.invoke('importRecipesFromSheet', payload);

      if (response.data && response.data.success) {
        const recipesCount = response.data.created_recipes_count ?? 0;
        alert(language === 'he' 
          ? `יובאו בהצלחה ${recipesCount} רשומות.` 
          : `Successfully imported ${recipesCount} records.`);
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data?.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error("Import error:", err);
      const backendError = err.response?.data?.error;
      setError(backendError || err.message || (language === 'he' ? 'שגיאה בייבוא הנתונים' : 'Error importing data'));
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
            {importType === 'prep_recipe'
              ? (language === 'he' ? 'ייבוא הכנות מ-Google Sheets' : 'Import Preps from Google Sheets')
              : (language === 'he' ? 'ייבוא מנות מ-Google Sheets' : 'Import Recipes from Google Sheets')}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {language === 'he' 
              ? 'ניתן להשתמש בתבנית מסודרת של המערכת (לחיצה מטה), או להדביק קישור לקובץ שלכם. המערכת תזהה רק את הרשומות הרלוונטיות (הכנות או מנות לפי מה שבחרתם). ודאו שהקובץ פתוח לצפייה (Anyone with the link can view).'
              : 'Generate an organized template below, or paste a link to your own Google Sheet. The system will only identify the relevant records. Make sure the sheet is accessible (Anyone with the link can view).'}
          </DialogDescription>
        </DialogHeader>

        <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} mt-2`}>
          <Button type="button" variant="outline" onClick={handleGenerateTemplate} disabled={generating} className="text-[#107c41] border-[#107c41] bg-green-50 hover:bg-green-100">
            {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {language === 'he' ? 'הורד תבנית לדוגמה' : 'Generate Template'}
          </Button>
        </div>

        <form onSubmit={(e) => handleImport(e)} className="space-y-4 mt-4 border-t pt-4">
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
      </DialogContent>
    </Dialog>
  );
}