
import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Loader, CheckCircle, X, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ExcelInventoryImport({ warehouses, onImport, onCancel }) {
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [matchedItems, setMatchedItems] = useState([]); // This will now contain ALL items from Excel, whether matched or new
  const [stats, setStats] = useState(null); // New state for processing statistics (e.g., new_from_excel count)
  const [showResults, setShowResults] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const { t, language } = useLanguage();

  const handleDownloadTemplate = async () => {
    try {
      setUploadProgress(language === 'he' ? 'מוריד תבנית...' : 'Downloading template...');
      
      const response = await base44.functions.invoke('generateCountTemplate', {
        warehouse_id: selectedWarehouse || null,
        language: language
      });

      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_template_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      setUploadProgress('');

    } catch (error) {
      console.error('[ExcelInventoryImport] Error downloading template:', error);
      setUploadProgress('');
      alert(`${t('error_processing_data') || 'שגיאה'}: ${error.message}`);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setProcessing(true);
      setShowResults(false);
      setUploadProgress(language === 'he' ? 'מעלה קובץ...' : 'Uploading file...');

      console.log('[ExcelInventoryImport] Starting file upload...');
      console.log('[ExcelInventoryImport] File:', file.name, file.type, file.size);

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error(language === 'he' ? 'הקובץ גדול מדי (מקסימום 10MB)' : 'File too large (max 10MB)');
      }

      // Upload file with retry logic
      let file_url;
      let uploadAttempt = 0;
      const maxUploadAttempts = 3;
      
      while (uploadAttempt < maxUploadAttempts) {
        try {
          console.log(`[ExcelInventoryImport] Upload attempt ${uploadAttempt + 1}/${maxUploadAttempts}`);
          const uploadResult = await base44.integrations.Core.UploadFile({ file });
          file_url = uploadResult.file_url;
          console.log('[ExcelInventoryImport] File uploaded successfully:', file_url);
          break;
        } catch (uploadError) {
          uploadAttempt++;
          if (uploadAttempt >= maxUploadAttempts) {
            throw new Error(language === 'he' ? 'שגיאה בהעלאת הקובץ' : 'Failed to upload file');
          }
          console.log(`[ExcelInventoryImport] Upload failed, retrying... (${uploadAttempt}/${maxUploadAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000 * uploadAttempt));
        }
      }

      setUploadProgress(language === 'he' ? 'מעבד נתונים...' : 'Processing data...');
      
      // Process file with retry logic
      let processingAttempt = 0;
      const maxProcessingAttempts = 3;
      let response;
      
      while (processingAttempt < maxProcessingAttempts) {
        try {
          console.log(`[ExcelInventoryImport] Processing attempt ${processingAttempt + 1}/${maxProcessingAttempts}`);
          response = await base44.functions.invoke('processInventoryExcel', {
            file_url: file_url,
            warehouse_id: selectedWarehouse || ''
          });
          console.log('[ExcelInventoryImport] Processing completed successfully');
          break;
        } catch (processError) {
          processingAttempt++;
          if (processingAttempt >= maxProcessingAttempts) {
            throw new Error(language === 'he' ? 'שגיאה בעיבוד הקובץ' : 'Failed to process file');
          }
          console.log(`[ExcelInventoryImport] Processing failed, retrying... (${processingAttempt}/${maxProcessingAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000 * processingAttempt));
        }
      }

      console.log('[ExcelInventoryImport] Processing result:', response.data);

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setMatchedItems(response.data.items || []); // All items from Excel
      setStats(response.data.stats || null); // New statistics object
      setShowResults(true);
      setUploadProgress(language === 'he' ? 'הושלם!' : 'Completed!');
      
      setTimeout(() => setUploadProgress(''), 2000);

    } catch (error) {
      console.error('[ExcelInventoryImport] Error:', error);
      console.error('[ExcelInventoryImport] Error details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        stack: error.stack,
        response: error.response
      });
      
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      const userMessage = language === 'he' 
        ? `שגיאה: ${errorMessage}` 
        : `Error: ${errorMessage}`;
      
      alert(userMessage);
      setUploadProgress('');
    } finally {
      setUploading(false);
      setProcessing(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleImport = () => {
    if (matchedItems.length === 0) {
      alert(t('no_items_to_import') || 'אין פריטים לייבוא');
      return;
    }

    const warehouse = warehouses.find(w => w.id === selectedWarehouse);
    
    onImport({
      items: matchedItems,
      total_inventory_value: matchedItems.reduce((sum, item) => sum + item.total_cost, 0),
      warehouse_id: selectedWarehouse || "",
      warehouse_name: warehouse?.name || t('full_inventory_count_name') || 'ספירת מלאי מלאה'
    });
  };

  // totalValue now sums up all items extracted from Excel, whether they matched existing items or are new.
  const totalValue = matchedItems.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <Card className="mb-6 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border-b">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-green-600" />
          <CardTitle className="text-xl">
            {language === 'he' ? 'ייבוא ספירת מלאי מאקסל' : 'Import Inventory Count from Excel'}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {!showResults && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {language === 'he' ? 'איך זה עובד?' : 'How it works?'}
              </h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>{language === 'he' ? 'בחר מחסן (אופציונלי)' : 'Select warehouse (optional)'}</li>
                <li>{language === 'he' ? 'הורד קובץ דוגמה' : 'Download template file'}</li>
                <li>{language === 'he' ? 'מלא את הכמויות שנספרו' : 'Fill in counted quantities'}</li>
                <li>{language === 'he' ? 'העלה את הקובץ חזרה' : 'Upload the file back'}</li>
                <li>{language === 'he' ? 'בדוק את התוצאות ושמור' : 'Review results and save'}</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label>{language === 'he' ? 'מחסן (אופציונלי)' : 'Warehouse (Optional)'}</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'he' ? 'כל המחסנים' : 'All warehouses'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>
                    {language === 'he' ? 'כל המחסנים' : 'All warehouses'}
                  </SelectItem>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {language === 'he' 
                  ? 'בחר מחסן ספציפי או השאר ריק עבור כל הפריטים'
                  : 'Select a specific warehouse or leave empty for all items'}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDownloadTemplate}
                variant="outline"
                className="flex-1 border-green-600 text-green-700 hover:bg-green-50"
                disabled={uploading}
              >
                <Download className="w-4 h-4 mr-2" />
                {language === 'he' ? 'הורד תבנית' : 'Download Template'}
              </Button>

              <div className="flex-1">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="block">
                  <Button
                    as="span"
                    className="w-full bg-green-600 hover:bg-green-700 cursor-pointer"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        {uploadProgress || (language === 'he' ? 'מעבד...' : 'Processing...')}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {language === 'he' ? 'העלה קובץ' : 'Upload File'}
                      </>
                    )}
                  </Button>
                </label>
              </div>
            </div>

            {uploadProgress && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <Loader className="w-4 h-4 animate-spin" />
                {uploadProgress}
              </div>
            )}
          </>
        )}

        {showResults && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {language === 'he' ? 'הקובץ עובד בהצלחה!' : 'File Processed Successfully!'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {language === 'he' 
                        ? `ייובאו ${matchedItems.length} פריטים`
                        : `${matchedItems.length} items will be imported`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {language === 'he' ? 'שווי כולל' : 'Total Value'}
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    ₪{totalValue.toFixed(2)}
                  </div>
                </div>
              </div>

              {stats && stats.new_from_excel > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <div className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-blue-900 font-medium">
                        {language === 'he' 
                          ? `${stats.matched_with_catalog || 0} פריטים תואמו למערכת, ${stats.new_from_excel} פריטים חדשים מהאקסל`
                          : `${stats.matched_with_catalog || 0} items matched with catalog, ${stats.new_from_excel} new items from Excel`}
                      </p>
                      <p className="text-blue-700 text-xs mt-1">
                        {language === 'he'
                          ? 'ניתן יהיה לבצע התאמה ועדכון מחירים אחר כך'
                          : 'You can match and update prices later'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h4 className="font-semibold text-gray-900">
                  {language === 'he' ? 'פריטים לייבוא' : 'Items to Import'}
                </h4>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">
                        {language === 'he' ? 'שם פריט' : 'Item Name'}
                      </TableHead>
                      <TableHead className="text-right">
                        {language === 'he' ? 'כמות' : 'Quantity'}
                      </TableHead>
                      <TableHead className="text-right">
                        {language === 'he' ? 'יחידה' : 'Unit'}
                      </TableHead>
                      <TableHead className="text-right">
                        {language === 'he' ? 'מחיר' : 'Price'}
                      </TableHead>
                      <TableHead className="text-right">
                        {language === 'he' ? 'סה"כ' : 'Total'}
                      </TableHead>
                      <TableHead className="text-center">
                        {language === 'he' ? 'סטטוס' : 'Status'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedItems.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell className="text-right">{item.counted_quantity}</TableCell>
                        <TableCell className="text-right">{item.unit}</TableCell>
                        <TableCell className="text-right">₪{item.price_per_unit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ₪{item.total_cost.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.matched ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {language === 'he' ? 'תואם' : 'Matched'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {language === 'he' ? 'חדש' : 'New'}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowResults(false);
                  setMatchedItems([]);
                  setStats(null); // Clear stats when cancelling
                }}
                className="flex-1"
              >
                {language === 'he' ? 'ביטול' : 'Cancel'}
              </Button>
              <Button
                onClick={handleImport}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {language === 'he' ? `ייבא ${matchedItems.length} פריטים` : `Import ${matchedItems.length} items`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
