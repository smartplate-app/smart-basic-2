import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader, CheckCircle, X, Scan, Edit2, RefreshCw, AlertCircle } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function InvoiceScanner({ supplier, onImportComplete }) {
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const { t } = useLanguage();

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
      
      setScanning(true);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `חלץ קטלוג פריטים מהתמונה הזו בעברית עבור הספק: ${supplier.name}
        
        חשוב מאוד - חלץ את כל הפריטים עם השדות הבאים:
        1. שם הפריט - **אם אתה לא בטוח בשם או לא מצליח לקרוא אותו, השאר ריק ""**
        2. מספר קטלוג (מק"ט / קוד מוצר)
        3. סוג יחידה - אפשרויות: kg, liter, unit, case
        4. מחיר ליחידה (מחיר / מחיר ליחידה)
        5. **אחוז הנחה** - חשוב מאוד!
           - חפש סימן % ליד הפריט
           - חפש מילים כמו "הנחה", "discount", "%"
           - אם רואה "10%" או "הנחה 10%" זה אומר discount = 10
           - אם אין הנחה מוצג, השתמש ב-0
        
        טיפים לקריאת OCR בעברית:
        - שים לב לאותיות דומות: ס vs ע, ה vs ח, כ vs ב, ר vs ד
        - **אם אתה לא בטוח בשם, השאר אותו ריק במקום להמציא**
        
        החזר JSON תקין בלבד:
        {
          "items": [
            {
              "name": "שם מדויק בעברית או ריק אם לא בטוח",
              "catalog_number": "מספר קטלוג או קוד",
              "unit": "kg או liter או unit או case",
              "price": 0,
              "discount": 0
            }
          ]
        }
        
        ברירות מחדל אם חסר:
        - name: "" (ריק אם לא בטוח!)
        - catalog_number: ""
        - unit: "unit"
        - price: 0
        - discount: 0 (רק אם אין הנחה מוצגת)`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  catalog_number: { type: "string" },
                  unit: { type: "string" },
                  price: { type: "number" },
                  discount: { type: "number" }
                }
              }
            }
          }
        }
      });

      console.log('Scanned data:', response);
      
      if (response.items && response.items.length > 0) {
        setScannedItems(response.items);
      } else {
        alert(t('no_valid_items_found') || 'לא נמצאו פריטים בתמונה');
      }
      
    } catch (error) {
      console.error("Error scanning items:", error);
      alert(t('error_processing_data') || 'שגיאה בעיבוד התמונה');
    } finally {
      setUploading(false);
      setScanning(false);
    }
  };

  const handleImport = async () => {
    try {
      setUploading(true);
      
      // Get existing items for this supplier
      const existingItems = await base44.entities.Item.filter({ supplier_id: supplier.id });
      
      let updatedCount = 0;
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const scannedItem of scannedItems) {
        // Skip items without name AND without catalog number
        if (!scannedItem.name && !scannedItem.catalog_number) {
          skippedCount++;
          continue;
        }
        
        // Check if item already exists (by name OR catalog number)
        const existingItem = existingItems.find(item => {
          if (scannedItem.name && item.name.toLowerCase().trim() === scannedItem.name.toLowerCase().trim()) {
            return true;
          }
          if (scannedItem.catalog_number && item.catalog_number === scannedItem.catalog_number) {
            return true;
          }
          return false;
        });
        
        const itemData = {
          name: scannedItem.name || '',
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          catalog_number: scannedItem.catalog_number || '',
          unit: scannedItem.unit || 'unit',
          price: scannedItem.price || 0,
          discount: scannedItem.discount || 0,
          units_per_package: 1
        };
        
        if (existingItem) {
          // UPDATE existing item
          await base44.entities.Item.update(existingItem.id, itemData);
          updatedCount++;
        } else {
          // CREATE new item
          await base44.entities.Item.create(itemData);
          createdCount++;
        }
      }
      
      const message = `${createdCount} ${t('items')} ${t('save')}d, ${updatedCount} ${t('update')}d${skippedCount > 0 ? `, ${skippedCount} דולגו (חסר מידע)` : ''}`;
      alert(message);
      onImportComplete();
      
    } catch (error) {
      console.error("Error importing items:", error);
      alert(t('error_saving') || 'שגיאה בשמירה');
    } finally {
      setUploading(false);
    }
  };

  const removeItem = (index) => {
    setScannedItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setScannedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getUnitLabel = (unit) => {
    const units = {
      kg: t('unit_kg'),
      liter: t('unit_liter'),
      unit: t('unit_piece'),
      case: t('unit_box')
    };
    return units[unit] || unit;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5" />
          {t('scan_invoice_import')} - {supplier.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <div className="flex items-start gap-2">
            <RefreshCw className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              {t('invoice_scan_instructions') || 'העלה תמונה של קטלוג הספק. המערכת תחלץ שמות, מק"ט, מחירים והנחות.'}
              <p className="mt-2 font-semibold">
                {t('rescan_updates') || '💡 סריקה חוזרת תעדכן את הפריטים הקיימים (כולל הנחות!)'}
              </p>
              <p className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                <AlertCircle className="w-3 h-3 inline mr-1" />
                אם המערכת לא מבינה שם פריט, היא תשאיר אותו ריק ותעלה את שאר המידע. תוכל לערוך ולהשלים.
              </p>
            </div>
          </div>
        </div>

        {!imageUrl && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="invoice-upload"
              disabled={uploading || scanning}
            />
            <label
              htmlFor="invoice-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              {uploading || scanning ? (
                <>
                  <Loader className="w-12 h-12 text-gray-400 animate-spin" />
                  <p className="text-gray-600">{t('scanning_invoice')}</p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-700">{t('click_to_upload_invoice')}</p>
                    <p className="text-sm text-gray-500 mt-1">{t('supports_images_pdf')}</p>
                  </div>
                </>
              )}
            </label>
          </div>
        )}

        {imageUrl && scannedItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {scannedItems.length} {t('items_found')}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImageUrl(null);
                  setScannedItems([]);
                }}
              >
                <X className="w-4 h-4 mr-2" />
                {t('cancel')}
              </Button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              ✏️ {t('review_before_import') || 'בדוק והתאם הנחות ושמות לפני ייבוא'}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {scannedItems.map((item, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      {editingIndex === index ? (
                        <>
                          <div>
                            <Input
                              value={item.name || ''}
                              onChange={(e) => updateItem(index, 'name', e.target.value)}
                              placeholder={t('item_name') + ' (השאר ריק אם לא ברור)'}
                              className={!item.name ? 'border-orange-300 bg-orange-50' : ''}
                            />
                            {!item.name && (
                              <p className="text-xs text-orange-600 mt-1">
                                ⚠️ שם ריק - נא להשלים לפני השמירה
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={item.catalog_number || ''}
                              onChange={(e) => updateItem(index, 'catalog_number', e.target.value)}
                              placeholder={t('catalog_number')}
                            />
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              className="border rounded px-2 py-1"
                            >
                              <option value="kg">{t('unit_kg')}</option>
                              <option value="liter">{t('unit_liter')}</option>
                              <option value="unit">{t('unit_piece')}</option>
                              <option value="case">{t('unit_box')}</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.price || ''}
                              onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                              placeholder={t('price')}
                            />
                            <Input
                              type="number"
                              step="0.01"
                              value={item.discount || ''}
                              onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                              placeholder={t('discount') + ' %'}
                            />
                          </div>
                          <Button
                            size="sm"
                            onClick={() => setEditingIndex(null)}
                            className="w-full"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            {t('save')}
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div>
                              {item.name ? (
                                <p className="font-medium">{item.name}</p>
                              ) : (
                                <p className="font-medium text-orange-600 flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4" />
                                  [שם ריק - נא להשלים]
                                </p>
                              )}
                              {item.catalog_number && (
                                <p className="text-xs text-gray-600">{t('catalog_number')}: {item.catalog_number}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditingIndex(index)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex gap-4 text-sm text-gray-700">
                            <span>{getUnitLabel(item.unit)}</span>
                            {item.price > 0 && (
                              <span className="font-medium">{item.price.toFixed(2)} {t('currency')}</span>
                            )}
                            {item.discount > 0 && (
                              <span className="text-red-600 font-bold">
                                {t('discount')}: {item.discount}%
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={handleImport}
              disabled={uploading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {uploading ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {t('import_items')} ({scannedItems.length})
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}