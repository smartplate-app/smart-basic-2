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
  const [error, setError] = useState("");

  const handleImport = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError("");

    try {
      const user = await base44.auth.me();
      
      // Find or create a default supplier for these ingredients
      let suppliers = await base44.entities.Supplier.filter({ created_by: user.email });
      let defaultSupplier = suppliers.find(s => s.name === 'כללי' || s.name === 'General');
      
      if (!defaultSupplier) {
        if (suppliers.length > 0) {
          defaultSupplier = suppliers[0];
        } else {
          defaultSupplier = await base44.entities.Supplier.create({
            name: language === 'he' ? 'כללי' : 'General',
            supplier_type: 'simple'
          });
        }
      }

      const response = await base44.functions.invoke('importRecipesFromSheet', {
        spreadsheetUrl: url,
        supplierId: defaultSupplier.id,
        supplierName: defaultSupplier.name
      });

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
          <DialogDescription>
            {language === 'he' 
              ? 'הדבק קישור לגיליון Google Sheets המכיל את המרכיבים והמתכונים שלך (הכנות ומנות סופיות). המערכת תסרוק את כל הגיליונות בקובץ. ודא שהקובץ פתוח לצפייה (Anyone with the link can view).'
              : 'Paste a link to a Google Sheets document containing your ingredients and recipes. The system will scan all sheets in the file. Make sure the sheet is accessible (Anyone with the link can view).'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleImport} className="space-y-4 mt-4">
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
      </DialogContent>
    </Dialog>
  );
}