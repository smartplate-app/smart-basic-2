import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "../LanguageProvider";
import { base44 } from "@/api/base44Client";
import { Upload, Loader2, FileSpreadsheet, AlertCircle } from "lucide-react";

export default function ImportPosReportModal({ isOpen, onClose, onSuccess }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Upload the file
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      if (!uploadRes || !uploadRes.file_url) {
        throw new Error(language === 'he' ? 'שגיאה בהעלאת הקובץ' : 'Error uploading file');
      }

      // 2. Call backend function to parse the POS report
      const { data } = await base44.functions.invoke('importPosReport', { file_url: uploadRes.file_url });
      
      if (!data || !data.success) {
        throw new Error(data?.error || (language === 'he' ? 'שגיאה בפענוח הקובץ' : 'Error parsing file'));
      }

      // Calculate totals
      let totalSales = 0;
      let totalCogs = 0;
      data.items.forEach(item => {
        totalSales += Number(item.total_sales || 0);
        totalCogs += Number(item.quantity_sold || 0) * Number(item.unit_cost || 0);
      });
      const salesExcludingVat = totalSales / 1.18;
      const grossProfit = salesExcludingVat - totalCogs;
      const cogsPercentage = totalSales > 0 ? (totalCogs / salesExcludingVat) * 100 : 0;

      const prefilledReport = {
        name: `${language === 'he' ? 'דוח ייבוא' : 'Imported Report'} ${new Date().toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}`,
        report_date: new Date().toISOString().split('T')[0],
        report_type: "actual",
        total_sales: totalSales,
        total_cogs: totalCogs,
        gross_profit: grossProfit,
        cogs_percentage: cogsPercentage,
        items: data.items
      };

      onSuccess(prefilledReport);
      onClose();

    } catch (err) {
      console.error(err);
      setError(err.message || (language === 'he' ? 'אירעה שגיאה בלתי צפויה' : 'An unexpected error occurred'));
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
            <FileSpreadsheet className="w-5 h-5 text-purple-500" />
            {language === 'he' ? 'ייבוא דוח מקופה (POS)' : 'Import POS Report'}
          </DialogTitle>
          <DialogDescription className={`${isRTL ? 'text-right' : 'text-left'} mt-2`}>
            {language === 'he' 
              ? 'הורד את דוח המכירות לפי פריט (Product Mix) מהקופה שלך (כמו Tabit, Foody וכו\') כקובץ Excel (xlsx).'
              : 'Download your Product Mix / Sales by Item report from your POS backoffice (like Tabit, Foody, etc) as an Excel (xlsx) file.'}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 my-4 text-sm text-blue-800">
          <p className="font-semibold mb-2">{language === 'he' ? 'הקובץ חייב להכיל לפחות עמודות של:' : 'The file must contain at least columns for:'}</p>
          <ul className={`list-disc ${isRTL ? 'pr-5' : 'pl-5'} space-y-1`}>
            <li>{language === 'he' ? 'שם פריט (Item)' : 'Item Name'}</li>
            <li>{language === 'he' ? 'כמות שנמכרה (Sold / Qty)' : 'Quantity Sold'}</li>
            <li>{language === 'he' ? 'סה"כ מכירות / סכום (Sales)' : 'Total Sales'}</li>
          </ul>
          <p className="mt-3 text-blue-600 italic">
            {language === 'he' 
              ? 'המערכת תקרא את הנתונים האלו באופן חכם, תתעלם מכל השאר, ותחשב את ה-COGS בפועל בהתאם למתכונים שלך!'
              : 'The system will smartly read these data points, ignore everything else, and calculate your Actual COGS based on your recipes!'}
          </p>
        </div>

        {error && (
          <div className={`p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-start gap-2 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div 
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors ${
            isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !loading && fileInputRef.current?.click()}
          style={{ cursor: loading ? 'default' : 'pointer' }}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={loading}
          />
          
          <div className="text-center mb-4 text-gray-500 pointer-events-none">
            {language === 'he' ? 'גרור ושחרר את הקובץ כאן, או לחץ להעלאה' : 'Drag and drop your file here, or click to upload'}
          </div>

          <Button 
            size="lg" 
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white pointer-events-none"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className={`w-5 h-5 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'he' ? 'מעבד נתונים...' : 'Processing...'}
              </>
            ) : (
              <>
                <Upload className={`w-5 h-5 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'he' ? 'העלה קובץ Excel / CSV' : 'Upload Excel / CSV'}
              </>
            )}
          </Button>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            {language === 'he' ? 'סגור' : 'Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}