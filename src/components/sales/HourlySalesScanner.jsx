import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "../LanguageProvider";

function normalizeHourLabel(label) {
  if (!label) return null;
  const s = String(label).trim();
  // Try formats like "09:00-10:00", "9-10", "09-10", "09:00", "9"
  const mRange = s.match(/(\d{1,2})(?::\d{2})?\s*[-–]\s*(\d{1,2})/);
  if (mRange) {
    const h = parseInt(mRange[1], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) return h;
  }
  const mSingle = s.match(/\b(\d{1,2})\b/);
  if (mSingle) {
    const h = parseInt(mSingle[1], 10);
    if (!isNaN(h) && h >= 0 && h <= 23) return h;
  }
  return null;
}

export default function HourlySalesScanner({ onSaved }) {
  const { language } = useLanguage();
  const [month, setMonth] = React.useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });
  const [file, setFile] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [previewRows, setPreviewRows] = React.useState([]);
  const [error, setError] = React.useState(null);

  const scan = async () => {
    try {
      setError(null);
      if (!file) { setError('Please choose an image/PDF first'); return; }
      setLoading(true);

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Ask extractor for a normalized structure
      const json_schema = {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                hour_label: { type: 'string' }, // e.g. "09:00-10:00" or "9-10"
                hour: { type: 'integer' },      // 0-23 if available
                sales: { type: 'number' }
              },
              required: ['sales']
            }
          }
        },
        required: ['rows']
      };

      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema });
      if (res.status !== 'success' || !res.output) {
        throw new Error(res.details || 'Extraction failed');
      }

      const out = res.output || {};
      const rows = Array.isArray(out.rows) ? out.rows : [];

      // Normalize -> map hour(0-23) => sum sales
      const byHour = new Map();
      for (const r of rows) {
        let hour = typeof r.hour === 'number' ? r.hour : normalizeHourLabel(r.hour_label);
        if (hour == null) continue;
        if (hour < 0 || hour > 23) continue;
        const sales = Number(r.sales || 0) || 0;
        byHour.set(hour, (byHour.get(hour) || 0) + sales);
      }
      const normalized = Array.from(byHour.entries())
        .sort((a,b) => a[0]-b[0])
        .map(([hour, sales]) => ({ hour, sales }));

      setPreviewRows(normalized);
    } catch (e) {
      setError(e?.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!previewRows.length) { setError('No data to save'); return; }
    const total = previewRows.reduce((s, r) => s + Number(r.sales||0), 0);
    await base44.entities.HourlySalesReport.create({
      month,
      source: 'pos_bi',
      rows: previewRows,
      total_sales: total
    });
    setFile(null);
    setPreviewRows([]);
    if (onSaved) onSaved();
    alert(language === 'he' ? 'נשמר בהצלחה' : 'Saved');
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>
          {language === 'he' ? 'סריקת דוח מכירות לפי שעה (חודשי)' : 'Scan Monthly Sales per Hour (POS BI image/PDF)'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{language === 'he' ? 'חודש' : 'Month'}</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full cursor-pointer px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {Array.from({ length: 18 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const ym = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
                return (
                  <option key={ym} value={ym}>{ym}</option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">{language === 'he' ? 'קובץ (תמונה/‏PDF)' : 'File (image/PDF)'}</label>
            <Input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={scan} disabled={loading || !file} className="bg-blue-600 hover:bg-blue-700 w-full">
              {loading ? (language === 'he' ? 'סורק...' : 'Scanning...') : (language === 'he' ? 'סרוק' : 'Scan')}
            </Button>
            <Button onClick={save} disabled={loading || !previewRows.length} className="bg-green-600 hover:bg-green-700 w-full">
              {language === 'he' ? 'שמור' : 'Save'}
            </Button>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {previewRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border p-2 text-right">{language === 'he' ? 'שעה' : 'Hour'}</th>
                  <th className="border p-2 text-right">{language === 'he' ? 'מכירות' : 'Sales'}</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r) => (
                  <tr key={r.hour}>
                    <td className="border p-2">{String(r.hour).padStart(2,'0')}:00</td>
                    <td className="border p-2">₪{Number(r.sales).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td className="border p-2">{language === 'he' ? 'סה"כ' : 'Total'}</td>
                  <td className="border p-2">₪{previewRows.reduce((s, r) => s + Number(r.sales||0), 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}