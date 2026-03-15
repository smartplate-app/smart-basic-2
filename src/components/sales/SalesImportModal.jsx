import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader, Upload, Image as ImageIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '../LanguageProvider';

export default function SalesImportModal({ isOpen, onClose, onSave }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      
      // 1. Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(file_url);

      // 2. Extract data using the backend function
      const response = await base44.functions.invoke('processSalesScreenshot', { file_url });
      
      if (response.data && response.data.success) {
        // The LLM returns the JSON inside data.data or data.data.data depending on the wrapper
        const result = response.data.data;
        // The LLM output might be nested if it used response_json_schema
        const parsed = result.total_sales_incl_vat !== undefined ? result : (result.data || result);
        
        setExtractedData({
          week_start_date: new Date().toISOString().slice(0, 10),
          total_sales_incl_vat: parsed.total_sales_incl_vat || 0,
          restaurant_sales: parsed.restaurant_sales || 0,
          delivery_sales: parsed.delivery_sales || 0,
          wolt_sales: parsed.wolt_sales || 0,
          takeaway_sales: parsed.takeaway_sales || 0,
          other_sales: parsed.other_sales || 0,
          notes: ''
        });
      } else {
        throw new Error(response.data?.error || 'Failed to extract data');
      }
    } catch (err) {
      console.error('Error processing sales screenshot:', err);
      setError(language === 'he' ? 'שגיאה בפענוח התמונה. אנא נסה שוב או הזן ידנית.' : 'Error extracting data. Please try again or enter manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;
    try {
      setLoading(true);
      const record = {
        ...extractedData,
        source_file_url: fileUrl
      };
      await base44.entities.WeeklySalesRecord.create(record);
      onSave();
      onClose();
    } catch (err) {
      console.error('Error saving sales record:', err);
      setError(language === 'he' ? 'שגיאה בשמירת הנתונים.' : 'Error saving data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : 'text-left'}>
            {language === 'he' ? 'ייבוא נתוני מכירות (קופה)' : 'Import POS Sales Data'}
          </DialogTitle>
          <DialogDescription className={isRTL ? 'text-right' : 'text-left'}>
            {language === 'he' 
              ? 'העלה צילום מסך או דוח מהקופה (Beecome, Tabit וכו\'). המערכת תפענח את הנתונים אוטומטית.' 
              : 'Upload a screenshot or report from your POS. The system will extract the data automatically.'}
          </DialogDescription>
        </DialogHeader>

        {!extractedData ? (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept="image/*,.pdf,.csv,.xlsx"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading}
              />
              {loading ? (
                <div className="flex flex-col items-center">
                  <Loader className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                  <p className="text-sm text-gray-600 font-medium">
                    {language === 'he' ? 'מפענח נתונים בעזרת AI...' : 'Extracting data with AI...'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="bg-blue-100 p-3 rounded-full mb-3">
                    <ImageIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {language === 'he' ? 'לחץ כאן להעלאת קובץ או תמונה' : 'Click here to upload file or image'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {language === 'he' ? 'תומך בתמונות, PDF, ואקסל' : 'Supports images, PDF, and Excel'}
                  </p>
                </div>
              )}
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="bg-green-50 text-green-800 p-3 rounded-lg text-sm font-medium text-center mb-4">
              {language === 'he' ? 'הנתונים פוענחו בהצלחה! אנא ודא שהם נכונים.' : 'Data extracted successfully! Please verify.'}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>{language === 'he' ? 'תאריך התחלה (שבוע)' : 'Week Start Date'}</Label>
                <Input 
                  type="date" 
                  value={extractedData.week_start_date} 
                  onChange={(e) => setExtractedData({...extractedData, week_start_date: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label className="font-bold text-blue-700">{language === 'he' ? 'סה"כ מכירות (כולל מע"מ)' : 'Total Sales (incl. VAT)'}</Label>
                <Input 
                  type="number" 
                  className="font-bold text-lg bg-blue-50"
                  value={extractedData.total_sales_incl_vat} 
                  onChange={(e) => setExtractedData({...extractedData, total_sales_incl_vat: parseFloat(e.target.value) || 0})} 
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'he' ? 'מכירות מסעדה' : 'Restaurant Sales'}</Label>
                <Input 
                  type="number" 
                  value={extractedData.restaurant_sales} 
                  onChange={(e) => setExtractedData({...extractedData, restaurant_sales: parseFloat(e.target.value) || 0})} 
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'he' ? 'מכירות משלוחים' : 'Delivery Sales'}</Label>
                <Input 
                  type="number" 
                  value={extractedData.delivery_sales} 
                  onChange={(e) => setExtractedData({...extractedData, delivery_sales: parseFloat(e.target.value) || 0})} 
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'he' ? 'מכירות וולט' : 'Wolt Sales'}</Label>
                <Input 
                  type="number" 
                  value={extractedData.wolt_sales} 
                  onChange={(e) => setExtractedData({...extractedData, wolt_sales: parseFloat(e.target.value) || 0})} 
                />
              </div>

              <div className="space-y-2">
                <Label>{language === 'he' ? 'מכירות T/A' : 'Takeaway Sales'}</Label>
                <Input 
                  type="number" 
                  value={extractedData.takeaway_sales} 
                  onChange={(e) => setExtractedData({...extractedData, takeaway_sales: parseFloat(e.target.value) || 0})} 
                />
              </div>
              
              <div className="space-y-2 col-span-2">
                <Label>{language === 'he' ? 'אחר / שונות' : 'Other Sales'}</Label>
                <Input 
                  type="number" 
                  value={extractedData.other_sales} 
                  onChange={(e) => setExtractedData({...extractedData, other_sales: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setExtractedData(null)} disabled={loading}>
                {language === 'he' ? 'נסה שוב' : 'Try Again'}
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSave} disabled={loading}>
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : (language === 'he' ? 'שמור נתונים' : 'Save Data')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}