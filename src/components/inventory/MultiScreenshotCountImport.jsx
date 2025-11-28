import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, Loader, CheckCircle, X, AlertCircle, Trash2, Image, Edit2, Save } from "lucide-react";
import { useLanguage } from "../LanguageProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function MultiScreenshotCountImport({ warehouses, onImport, onCancel }) {
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [screenshots, setScreenshots] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const { t, language } = useLanguage();

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    console.log('[MultiScreenshotCountImport] Selected files:', files.length);

    const newScreenshots = files.map(file => {
      console.log('[MultiScreenshotCountImport] File:', file.name, file.type, file.size);
      return {
        file,
        preview: URL.createObjectURL(file),
        uploaded: false,
        name: file.name
      };
    });

    setScreenshots(prev => [...prev, ...newScreenshots]);
    e.target.value = ''; // Reset input
    
    console.log('[MultiScreenshotCountImport] Total screenshots now:', screenshots.length + files.length);
  };

  const removeScreenshot = (index) => {
    setScreenshots(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleProcessScreenshots = async () => {
    if (screenshots.length === 0) {
      alert(language === 'he' ? 'נא להעלות לפחות תמונה אחת' : 'Please upload at least one image');
      return;
    }

    try {
      setUploading(true);
      setProcessing(true);
      setShowResults(false);
      setUploadProgress(language === 'he' ? 'מעלה תמונות...' : 'Uploading images...');

      console.log('[MultiScreenshotCountImport] Starting upload of', screenshots.length, 'screenshots');

      // Upload all screenshots
      const uploadedUrls = [];
      for (let i = 0; i < screenshots.length; i++) {
        setUploadProgress(`${language === 'he' ? 'מעלה תמונה' : 'Uploading image'} ${i + 1}/${screenshots.length}...`);
        
        console.log(`[MultiScreenshotCountImport] Uploading image ${i + 1}:`, screenshots[i].name);
        
        const { file_url } = await base44.integrations.Core.UploadFile({ 
          file: screenshots[i].file 
        });
        
        uploadedUrls.push(file_url);
        console.log('[MultiScreenshotCountImport] Uploaded:', file_url);
      }

      setUploadProgress(language === 'he' ? 'מעבד תמונות עם AI...' : 'Processing images with AI...');

      console.log('[MultiScreenshotCountImport] Calling AI to process', uploadedUrls.length, 'images');
      
      // Process screenshots with AI
      const response = await base44.functions.invoke('processCountScreenshots', {
        screenshot_urls: uploadedUrls,
        warehouse_id: selectedWarehouse || '',
        language: language
      });

      console.log('[MultiScreenshotCountImport] AI processing complete:', response.data);

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error(language === 'he' ? 'לא נמצאו פריטים בתמונות' : 'No items found in images');
      }

      // Calculate totals for each item
      const itemsWithTotals = response.data.items.map(item => ({
        ...item,
        total_cost: (item.counted_quantity || 0) * (item.price_per_unit || 0)
      }));

      console.log('[MultiScreenshotCountImport] Extracted', itemsWithTotals.length, 'items');

      setExtractedItems(itemsWithTotals);
      setShowResults(true);
      setUploadProgress('');

    } catch (error) {
      console.error('[MultiScreenshotCountImport] Error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`${language === 'he' ? 'שגיאה' : 'Error'}: ${errorMessage}`);
      setUploadProgress('');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleEditItem = (index, field, value) => {
    const updatedItems = [...extractedItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'item_name' || field === 'unit' || field === 'notes' ? value : parseFloat(value) || 0
    };
    
    // Recalculate total cost
    updatedItems[index].total_cost = 
      (updatedItems[index].counted_quantity || 0) * (updatedItems[index].price_per_unit || 0);
    
    setExtractedItems(updatedItems);
  };

  const handleImport = () => {
    if (extractedItems.length === 0) {
      alert(language === 'he' ? 'אין פריטים לייבוא' : 'No items to import');
      return;
    }

    const warehouse = warehouses.find(w => w.id === selectedWarehouse);
    const totalValue = extractedItems.reduce((sum, item) => sum + item.total_cost, 0);
    
    onImport({
      items: extractedItems,
      total_inventory_value: totalValue,
      warehouse_id: selectedWarehouse || "",
      warehouse_name: warehouse?.name || (language === 'he' ? 'ספירת מלאי מלאה' : 'Full Inventory Count'),
      screenshot_urls: screenshots.map(s => s.preview)
    });
  };

  const totalValue = extractedItems.reduce((sum, item) => sum + item.total_cost, 0);

  return (
    <Card className="mb-6 shadow-xl border-2 border-purple-200">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 border-b">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-purple-600" />
          <CardTitle className="text-xl">
            {language === 'he' ? 'ייבוא ספירה מצילומי מסך' : 'Import Count from Screenshots'}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {!showResults && (
          <>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {language === 'he' ? 'איך זה עובד?' : 'How it works?'}
              </h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>{language === 'he' ? 'בחר מחסן (אופציונלי)' : 'Select warehouse (optional)'}</li>
                <li>{language === 'he' ? 'העלה צילומי מסך של הספירה שלך' : 'Upload screenshots of your count'}</li>
                <li>{language === 'he' ? 'המערכת תקרא אוטומטית: שם, כמות, יחידה, מחיר' : 'System will automatically read: name, quantity, unit, price'}</li>
                <li>{language === 'he' ? 'ערוך את הנתונים אם יש טעויות' : 'Edit the data if there are errors'}</li>
                <li>{language === 'he' ? 'המערכת תחשב את הסכומים' : 'System will calculate totals'}</li>
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
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center bg-purple-50 hover:bg-purple-100 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label htmlFor="screenshot-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
                      <Image className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-purple-900">
                        {language === 'he' ? 'לחץ להעלאת תמונות' : 'Click to Upload Images'}
                      </p>
                      <p className="text-sm text-purple-700 mt-1">
                        {language === 'he' ? 'או גרור תמונות לכאן' : 'or drag images here'}
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        {language === 'he' ? 'ניתן להעלות מספר תמונות בבת אחת' : 'You can upload multiple images at once'}
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {screenshots.length > 0 && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-green-900">
                      ✓ {screenshots.length} {language === 'he' ? 'תמונות נבחרו' : 'images selected'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {screenshots.map((screenshot, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={screenshot.preview}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-purple-200 shadow-sm"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                          <Button
                            variant="destructive"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeScreenshot(index)}
                            disabled={uploading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Badge className="absolute top-2 right-2 bg-purple-600">
                          {index + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleProcessScreenshots}
                    disabled={uploading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-6 text-lg font-semibold"
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        {uploadProgress || (language === 'he' ? 'מעבד...' : 'Processing...')}
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        {language === 'he' ? `עבד ${screenshots.length} תמונות` : `Process ${screenshots.length} images`}
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {uploadProgress && (
              <div className="flex items-center justify-center gap-2 text-sm text-purple-700 bg-purple-50 p-4 rounded-lg border border-purple-200">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="font-medium">{uploadProgress}</span>
              </div>
            )}
          </>
        )}

        {showResults && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {language === 'he' ? 'התמונות עובדו בהצלחה!' : 'Images Processed Successfully!'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {language === 'he' 
                        ? `זוהו ${extractedItems.length} פריטים`
                        : `${extractedItems.length} items detected`}
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

              <div className="mt-4 pt-4 border-t border-green-200">
                <div className="flex items-start gap-2 text-sm">
                  <Edit2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-900 font-medium">
                      {language === 'he' 
                        ? 'ניתן לערוך כל שדה על ידי לחיצה עליו'
                        : 'You can edit any field by clicking on it'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h4 className="font-semibold text-gray-900">
                  {language === 'he' ? 'פריטים שזוהו - לחץ לעריכה' : 'Detected Items - Click to Edit'}
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extractedItems.map((item, idx) => (
                      <TableRow key={idx} className="hover:bg-gray-50">
                        <TableCell>
                          <Input
                            value={item.item_name}
                            onChange={(e) => handleEditItem(idx, 'item_name', e.target.value)}
                            className="border-gray-200 hover:border-blue-400 focus:border-blue-500"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.001"
                            value={item.counted_quantity}
                            onChange={(e) => handleEditItem(idx, 'counted_quantity', e.target.value)}
                            className="text-right border-gray-200 hover:border-blue-400 focus:border-blue-500"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.unit}
                            onValueChange={(value) => handleEditItem(idx, 'unit', value)}
                          >
                            <SelectTrigger className="border-gray-200 hover:border-blue-400">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="kg">kg</SelectItem>
                              <SelectItem value="liter">liter</SelectItem>
                              <SelectItem value="unit">unit</SelectItem>
                              <SelectItem value="case">case</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.price_per_unit}
                            onChange={(e) => handleEditItem(idx, 'price_per_unit', e.target.value)}
                            className="text-right border-gray-200 hover:border-blue-400 focus:border-blue-500"
                          />
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ₪{item.total_cost.toFixed(2)}
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
                  setExtractedItems([]);
                  setScreenshots([]);
                }}
                className="flex-1"
              >
                {language === 'he' ? 'ביטול' : 'Cancel'}
              </Button>
              <Button
                onClick={handleImport}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {language === 'he' ? `שמור ${extractedItems.length} פריטים` : `Save ${extractedItems.length} items`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}