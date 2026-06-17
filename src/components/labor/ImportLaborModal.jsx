import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";
import { Loader2, FileSpreadsheet, Download } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ImportLaborModal({ isOpen, onClose, onSuccess }) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const handleGenerateTemplate = async () => {
    try {
      setIsGenerating(true);
      const res = await base44.functions.invoke("generateLaborTemplateSheet", { language });
      if (res.data.success) {
        window.open(res.data.url, "_blank");
        toast({
          title: isRTL ? "תבנית נוצרה בהצלחה" : "Template generated",
          description: isRTL ? "המסמך נפתח בחלון חדש." : "The document opened in a new window."
        });
      } else {
        throw new Error(res.data.error || "Failed");
      }
    } catch (e) {
      console.error(e);
      toast({
        title: isRTL ? "שגיאה ביצירת תבנית" : "Error generating template",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = async () => {
    if (!sheetUrl) return;
    try {
      setIsLoading(true);
      const res = await base44.functions.invoke("importLaborFromSheet", { spreadsheetUrl: sheetUrl });
      if (res.data.success) {
        toast({
          title: isRTL ? "יבוא הושלם בהצלחה" : "Import successful",
          description: isRTL 
            ? `נוצרו ${res.data.created_positions} תפקידים חדשים ו-${res.data.created_workers} עובדים חדשים.` 
            : `Created ${res.data.created_positions} new positions and ${res.data.created_workers} new workers.`
        });
        if (onSuccess) onSuccess();
        onClose();
      } else {
        throw new Error(res.data.error || "Import failed");
      }
    } catch (e) {
      console.error(e);
      toast({
        title: isRTL ? "שגיאה ביבוא" : "Import Error",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={isRTL ? 'text-right' : ''} dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{isRTL ? "יבוא עובדים ותפקידים מ-Google Sheets" : "Import Workers & Positions from Google Sheets"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="bg-slate-50 p-4 rounded-lg space-y-3 dark:bg-slate-800">
            <h3 className="font-semibold text-sm">
              {isRTL ? "שלב 1: יצירת תבנית חדשה" : "Step 1: Generate new template"}
            </h3>
            <p className="text-sm text-slate-500">
              {isRTL ? "צור תבנית ריקה עם העמודות הנכונות לעדכון במערכת." : "Create an empty template with the correct columns to update in the system."}
            </p>
            <Button 
              variant="outline" 
              onClick={handleGenerateTemplate} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
              {isRTL ? "צור תבנית Google Sheets" : "Generate Google Sheets Template"}
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">
              {isRTL ? "שלב 2: הדבק את הקישור לתבנית המעודכנת" : "Step 2: Paste the link to the updated template"}
            </h3>
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              dir="ltr"
              className={isRTL ? "text-right" : ""}
            />
            <Button 
              onClick={handleImport} 
              disabled={isLoading || !sheetUrl} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {isRTL ? "התחל יבוא" : "Start Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}