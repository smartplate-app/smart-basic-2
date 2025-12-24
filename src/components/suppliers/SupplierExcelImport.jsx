import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader, FileSpreadsheet, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";

export default function SupplierExcelImport({ supplier, onClose, onImportComplete }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const t = {
    he: {
      title: `ייבוא מאקסל — ${supplier?.name || ''}`,
      instructions: "הקובץ צריך לכלול עמודות: שם, יחידה (kg/liter/unit/case), מחיר, הנחה (%). כותרות בעברית נתמכות.",
      chooseFile: "בחר קובץ אקסל",
      processing: "מעבד...",
      successCount: (n) => `הצלחה! נוספו ${n} פריטים`,
      close: "סגור"
    },
    en: {
      title: `Import from Excel — ${supplier?.name || ''}`,
      instructions: "The file should include columns: name, unit (kg/liter/unit/case), price, discount (%). Hebrew headers are supported.",
      chooseFile: "Choose Excel File",
      processing: "Processing...",
      successCount: (n) => `Success! ${n} items added`,
      close: "Close"
    }
  }[language] || {};

  const normalizeUnit = (u) => {
    if (!u) return 'unit';
    const s = String(u).toLowerCase();
    if (/(ק"?ג|קילו|kg)/.test(s)) return 'kg';
    if (/(ליטר|ל׳|liter|ltr|l\b)/.test(s)) return 'liter';
    if (/(ארגז|קייס|קרטון|case|box|carton)/.test(s)) return 'case';
    return ['kg','liter','unit','case'].includes(s) ? s : 'unit';
  };

  const pick = (obj, keys) => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') return obj[k];
    }
    return undefined;
  };

  // Map a generic row (keys may be HE/EN) to our schema
  const mapRow = (row) => {
    const name = pick(row, ['name','שם','שם פריט','מוצר','פריט']);
    const unit = normalizeUnit(pick(row, ['unit','יחידה','סוג יחידה','מכירה ביחידה']));
    const priceRaw = pick(row, ['price','מחיר','מחיר ליחידה','עלות']);
    const discountRaw = pick(row, ['discount','הנחה','% הנחה','הנחה %']);
    const catalog = pick(row, ['catalog_number','מק"ט','מספר קטלוג','קטלוג']);
    const price = priceRaw != null ? Number(String(priceRaw).replace(/[^0-9.\-]/g, '')) : 0;
    const discount = discountRaw != null ? Number(String(discountRaw).replace(/[^0-9.\-]/g, '')) : 0;
    return { name, unit, price: isNaN(price) ? 0 : price, discount: isNaN(discount) ? 0 : discount, catalog_number: catalog || '' };
  };

  const llmExtract = async (file_url) => {
    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              unit: { type: 'string' },
              price: { type: 'number' },
              discount: { type: 'number' },
              catalog_number: { type: 'string' }
            },
            required: ['name']
          }
        }
      },
      required: ['items']
    };
    const prompt = `You are given a supplier items spreadsheet (Hebrew possible). Extract rows into JSON.
Return item objects with: name (string), unit (kg/liter/unit/case), price (number), discount (number), catalog_number (string).
Map Hebrew headers to these fields (e.g., שם->name, יחידה->unit, מחיר->price, הנחה->discount, מק"ט/מספר קטלוג->catalog_number).
Numbers may include currency symbols—strip them. Units must be normalized to kg/liter/unit/case.`;
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: schema
    });
    return res?.items || [];
  };

  const handleFile = async (file) => {
    if (!file || !supplier?.id) return;
    setUploading(true);
    setResult(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // First, try structured extractor (works great for CSV/PDF and often for Excel)
      let rows = [];
      try {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true
            }
          }
        });
        if (extracted?.status === 'success' && extracted?.output) {
          rows = Array.isArray(extracted.output) ? extracted.output : [extracted.output];
        }
      } catch (_) {}

      // If nothing meaningful, fallback to LLM with the file attached
      if (!rows || rows.length === 0) {
        rows = await llmExtract(file_url);
      }

      // Normalize and filter
      const normalized = rows.map(mapRow).filter(r => r && r.name);

      if (normalized.length === 0) {
        setResult({ success: false, message: language === 'he' ? 'לא נמצאו פריטים בקובץ' : 'No items found in the file' });
        return;
      }

      const payload = normalized.map((r) => ({
        name: r.name,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        catalog_number: r.catalog_number || '',
        unit: r.unit || 'unit',
        price: Number(r.price) || 0,
        discount: Number(r.discount) || 0,
        units_per_package: 1
      }));

      await base44.entities.Item.bulkCreate(payload);
      setResult({ success: true, count: payload.length });
      if (onImportComplete) onImportComplete();
    } catch (e) {
      console.error('Excel import failed:', e);
      setResult({ success: false, message: e?.message || 'Import failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-2 border-green-200" dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-700" />
          {t.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <p className={`text-sm text-gray-600 bg-yellow-50 p-3 rounded ${isRTL ? 'text-right' : 'text-left'}`}>{t.instructions}</p>
        <div>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv,.pdf"
            onChange={(e) => handleFile(e.target.files?.[0])}
            disabled={uploading}
          />
        </div>
        <div>
          <Button onClick={onClose} variant="outline">
            {t.close}
          </Button>
        </div>
        {uploading && (
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Loader className="w-4 h-4 animate-spin" /> {t.processing}
          </div>
        )}
        {result && (
          <div className={`p-3 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {result.success ? (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" /> {t.successCount(result.count)}
              </div>
            ) : (
              <span>{result.message}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}