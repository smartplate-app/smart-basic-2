import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader, CheckCircle, X, Scan, Edit2 } from "lucide-react";
import { useLanguage } from "../LanguageProvider";

export default function SupplierListScanner({ onSuppliersAdded, onClose }) {
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedSuppliers, setScannedSuppliers] = useState([]);
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
        prompt: `Extract supplier information from this Hebrew image. 
        Be VERY CAREFUL with Hebrew OCR - pay special attention to similar looking letters:
        - ס vs ע (samech vs ayin)
        - ה vs ח (hey vs chet)
        - כ vs ב (kaf vs bet)
        - ר vs ד (resh vs dalet)
        
        Extract ALL suppliers with:
        1. Company name (שם החברה) - be precise with Hebrew characters
        2. Phone number (טלפון)
        3. Email address (אימייל)
        
        Return ONLY valid JSON in this exact format:
        {
          "suppliers": [
            {
              "name": "exact company name in Hebrew",
              "phone": "phone number",
              "email": "email@example.com"
            }
          ]
        }
        
        If phone or email is missing, use empty string "".
        Double-check Hebrew spelling before returning.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            suppliers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string" }
                }
              }
            }
          }
        }
      });

      console.log('Scanned data:', response);
      
      if (response.suppliers && response.suppliers.length > 0) {
        setScannedSuppliers(response.suppliers);
      } else {
        alert(t('no_valid_items_found') || 'לא נמצאו ספקים בתמונה');
      }
      
    } catch (error) {
      console.error("Error scanning supplier list:", error);
      alert(t('error_processing_data') || 'שגיאה בעיבוד התמונה');
    } finally {
      setUploading(false);
      setScanning(false);
    }
  };

  const handleAddSuppliers = async () => {
    try {
      setUploading(true);
      
      for (const supplier of scannedSuppliers) {
        await base44.entities.Supplier.create({
          name: supplier.name,
          phone: supplier.phone || '',
          email: supplier.email || '',
          supplier_type: 'simple'
        });
      }
      
      alert(`${scannedSuppliers.length} ${t('suppliers_imported') || 'ספקים נוספו בהצלחה'}`);
      onSuppliersAdded();
      
    } catch (error) {
      console.error("Error adding suppliers:", error);
      alert(t('error_saving') || 'שגיאה בשמירה');
    } finally {
      setUploading(false);
    }
  };

  const removeSupplier = (index) => {
    setScannedSuppliers(prev => prev.filter((_, i) => i !== index));
  };

  const updateSupplier = (index, field, value) => {
    setScannedSuppliers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Scan className="w-5 h-5" />
          {t('scan_supplier_list') || 'סרוק רשימת ספקים'}
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          {t('supplier_list_scan_instructions') || 'העלה תמונה של רשימת הספקים שלך. המערכת תחלץ אוטומטית שמות, טלפונים ואימיילים.'}
        </div>

        {!imageUrl && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="supplier-list-upload"
              disabled={uploading || scanning}
            />
            <label
              htmlFor="supplier-list-upload"
              className="cursor-pointer flex flex-col items-center gap-3"
            >
              {uploading || scanning ? (
                <>
                  <Loader className="w-12 h-12 text-gray-400 animate-spin" />
                  <p className="text-gray-600">
                    {scanning ? (t('scanning') || 'סורק...') : (t('uploading') || 'מעלה...')}
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400" />
                  <div>
                    <p className="text-gray-700 font-medium">
                      {t('click_to_upload_supplier_list') || 'לחץ להעלאת רשימת ספקים'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('supports_images_pdf') || 'תומך בתמונות ו-PDF'}
                    </p>
                  </div>
                </>
              )}
            </label>
          </div>
        )}

        {imageUrl && scannedSuppliers.length > 0 && (
          <>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-3">
                <CheckCircle className="w-5 h-5" />
                {scannedSuppliers.length} {t('suppliers_found') || 'ספקים נמצאו'}
              </div>
              <p className="text-sm text-amber-700 mb-3">
                ⚠️ {t('review_before_adding') || 'בדוק ותקן שגיאות לפני הוספה'}
              </p>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {scannedSuppliers.map((supplier, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                    {editingIndex === index ? (
                      <div className="space-y-2">
                        <Input
                          value={supplier.name}
                          onChange={(e) => updateSupplier(index, 'name', e.target.value)}
                          placeholder={t('supplier_name') || 'שם ספק'}
                          className="font-medium"
                        />
                        <Input
                          value={supplier.phone}
                          onChange={(e) => updateSupplier(index, 'phone', e.target.value)}
                          placeholder={t('phone') || 'טלפון'}
                        />
                        <Input
                          value={supplier.email}
                          onChange={(e) => updateSupplier(index, 'email', e.target.value)}
                          placeholder={t('email') || 'אימייל'}
                        />
                        <Button
                          size="sm"
                          onClick={() => setEditingIndex(null)}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {t('save') || 'שמור'}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{supplier.name}</div>
                          {supplier.phone && (
                            <div className="text-sm text-gray-600">{t('phone')}: {supplier.phone}</div>
                          )}
                          {supplier.email && (
                            <div className="text-sm text-gray-600">{t('email')}: {supplier.email}</div>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingIndex(index)}
                            className="text-blue-500 hover:text-blue-700"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSupplier(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleAddSuppliers}
                disabled={uploading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('add_all_suppliers') || `הוסף את כל ${scannedSuppliers.length} הספקים`}
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setImageUrl(null);
                  setScannedSuppliers([]);
                }}
                variant="outline"
              >
                {t('cancel')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}