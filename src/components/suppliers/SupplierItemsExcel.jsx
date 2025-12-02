import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, Download, Loader, X, FileSpreadsheet, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";

export default function SupplierItemsExcel({ suppliers, items, onItemsAdded, onClose }) {
  const { language } = useLanguage();
  const isRTL = language === 'he';
  
  const [mode, setMode] = useState(null); // 'upload' | 'download'
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState(null);

  const t = {
    he: {
      title: "ייבוא/ייצוא פריטים",
      uploadItems: "העלה פריטים מאקסל",
      downloadItems: "הורד פריטים לאקסל",
      selectSupplier: "בחר ספק",
      uploadFile: "בחר קובץ אקסל",
      processing: "מעבד...",
      success: "הצלחה!",
      itemsAdded: "פריטים נוספו",
      downloadReady: "הקובץ מוכן להורדה",
      back: "חזור",
      close: "סגור",
      instructions: "הקובץ צריך לכלול עמודות: שם, מספר קטלוג, יחידה (kg/liter/unit/case), מחיר, הנחה",
      allSuppliers: "כל הספקים",
      noItems: "אין פריטים להורדה"
    },
    en: {
      title: "Import/Export Items",
      uploadItems: "Upload Items from Excel",
      downloadItems: "Download Items to Excel",
      selectSupplier: "Select Supplier",
      uploadFile: "Choose Excel File",
      processing: "Processing...",
      success: "Success!",
      itemsAdded: "items added",
      downloadReady: "File ready for download",
      back: "Back",
      close: "Close",
      instructions: "File should include: Name (required), Catalog Number (optional), Unit (kg/liter/unit/case), Price, Discount",
      allSuppliers: "All Suppliers",
      noItems: "No items to download"
    }
  }[language] || {
    he: {
      title: "ייבוא/ייצוא פריטים",
      uploadItems: "העלה פריטים מאקסל",
      downloadItems: "הורד פריטים לאקסל",
      selectSupplier: "בחר ספק",
      uploadFile: "בחר קובץ אקסל",
      processing: "מעבד...",
      success: "הצלחה!",
      itemsAdded: "פריטים נוספו",
      downloadReady: "הקובץ מוכן להורדה",
      back: "חזור",
      close: "סגור",
      instructions: "הקובץ צריך לכלול עמודות: שם, מספר קטלוג, יחידה (kg/liter/unit/case), מחיר, הנחה",
      allSuppliers: "כל הספקים",
      noItems: "אין פריטים להורדה"
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedSupplier) return;

    setUploading(true);
    setResult(null);

    try {
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data from Excel
      const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
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
      });

      if (extractedData.status === 'success' && extractedData.output) {
        const supplier = suppliers.find(s => s.id === selectedSupplier);
        const itemsToCreate = [];

        const dataArray = Array.isArray(extractedData.output) ? extractedData.output : [extractedData.output];

        for (const item of dataArray) {
          if (item.name) {
            const validUnits = ['kg', 'liter', 'unit', 'case'];
            let unit = 'unit';
            if (item.unit) {
              const lowerUnit = item.unit.toLowerCase();
              if (validUnits.includes(lowerUnit)) {
                unit = lowerUnit;
              } else if (lowerUnit.includes('ק"ג') || lowerUnit.includes('קילו') || lowerUnit.includes('kg')) {
                unit = 'kg';
              } else if (lowerUnit.includes('ליטר') || lowerUnit.includes('liter') || lowerUnit.includes('l')) {
                unit = 'liter';
              } else if (lowerUnit.includes('ארגז') || lowerUnit.includes('case') || lowerUnit.includes('קרטון')) {
                unit = 'case';
              }
            }

            itemsToCreate.push({
              name: item.name,
              supplier_id: selectedSupplier,
              supplier_name: supplier.name,
              catalog_number: item.catalog_number || "",
              unit: unit,
              price: parseFloat(item.price) || 0,
              discount: parseFloat(item.discount) || 0,
              units_per_package: 1
            });
          }
        }

        if (itemsToCreate.length > 0) {
          await base44.entities.Item.bulkCreate(itemsToCreate);
          setResult({ success: true, count: itemsToCreate.length });
          if (onItemsAdded) onItemsAdded();
        } else {
          setResult({ success: false, message: language === 'he' ? 'לא נמצאו פריטים בקובץ' : 'No items found in file' });
        }
      } else {
        setResult({ success: false, message: extractedData.details || 'Failed to extract data' });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setResult({ success: false, message: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    setResult(null);

    try {
      let itemsToExport = items;
      
      if (selectedSupplier) {
        itemsToExport = items.filter(i => i.supplier_id === selectedSupplier);
      }

      if (itemsToExport.length === 0) {
        setResult({ success: false, message: t.noItems });
        setDownloading(false);
        return;
      }

      // Create CSV content
      const headers = language === 'he' 
        ? ['שם', 'ספק', 'מספר קטלוג', 'יחידה', 'מחיר', 'הנחה %']
        : ['Name', 'Supplier', 'Catalog Number', 'Unit', 'Price', 'Discount %'];
      
      const rows = itemsToExport.map(item => [
        item.name || '',
        item.supplier_name || '',
        item.catalog_number || '',
        item.unit || 'unit',
        item.price || 0,
        item.discount || 0
      ]);

      // Add BOM for Hebrew support
      const BOM = '\uFEFF';
      const csvContent = BOM + [headers, ...rows].map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const supplierName = selectedSupplier 
        ? suppliers.find(s => s.id === selectedSupplier)?.name || 'items'
        : 'all_items';
      link.download = `${supplierName}_items_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setResult({ success: true, downloaded: true });
    } catch (error) {
      console.error("Download error:", error);
      setResult({ success: false, message: error.message });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="mb-6 border-2 border-green-200" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 flex flex-row items-center justify-between">
        <CardTitle className={`text-lg flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          {t.title}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!mode ? (
          // Mode Selection
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => setMode('upload')}
              className={`h-24 flex flex-col gap-2 bg-green-100 text-green-800 hover:bg-green-200 border-2 border-green-300 ${isRTL ? 'flex-row-reverse' : ''}`}
              variant="outline"
            >
              <Upload className="w-8 h-8" />
              {t.uploadItems}
            </Button>
            <Button
              onClick={() => setMode('download')}
              className={`h-24 flex flex-col gap-2 bg-blue-100 text-blue-800 hover:bg-blue-200 border-2 border-blue-300 ${isRTL ? 'flex-row-reverse' : ''}`}
              variant="outline"
            >
              <Download className="w-8 h-8" />
              {t.downloadItems}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label className={isRTL ? 'text-right block' : 'text-left block'}>
                {t.selectSupplier} {mode === 'upload' ? '*' : ''}
              </Label>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className={isRTL ? 'text-right' : 'text-left'}>
                  <SelectValue placeholder={t.selectSupplier} />
                </SelectTrigger>
                <SelectContent>
                  {mode === 'download' && (
                    <SelectItem value="all">{t.allSuppliers}</SelectItem>
                  )}
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Upload Mode */}
            {mode === 'upload' && (
              <div className="space-y-3">
                <p className={`text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                  💡 {t.instructions}
                </p>
                
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                  disabled={!selectedSupplier || uploading}
                />
                <label htmlFor="excel-upload">
                  <Button
                    as="span"
                    disabled={!selectedSupplier || uploading}
                    className={`w-full cursor-pointer ${!selectedSupplier ? 'opacity-50' : ''}`}
                    variant="outline"
                  >
                    {uploading ? (
                      <><Loader className="w-4 h-4 animate-spin mr-2" /> {t.processing}</>
                    ) : (
                      <><Upload className="w-4 h-4 mr-2" /> {t.uploadFile}</>
                    )}
                  </Button>
                </label>
              </div>
            )}

            {/* Download Mode */}
            {mode === 'download' && (
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {downloading ? (
                  <><Loader className="w-4 h-4 animate-spin mr-2" /> {t.processing}</>
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> {t.downloadItems}</>
                )}
              </Button>
            )}

            {/* Result */}
            {result && (
              <div className={`p-3 rounded-lg ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {result.success ? (
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Check className="w-5 h-5" />
                    {result.count ? `${t.success} ${result.count} ${t.itemsAdded}` : t.downloadReady}
                  </div>
                ) : (
                  <span>{result.message}</span>
                )}
              </div>
            )}

            {/* Back Button */}
            <Button variant="outline" onClick={() => { setMode(null); setResult(null); setSelectedSupplier(""); }}>
              {t.back}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}