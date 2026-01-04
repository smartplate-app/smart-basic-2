import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';

export default function SuppliersSheetsImport({ onClose, onImportComplete }) {
  const { language } = useLanguage();
  const [creating, setCreating] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const createTemplate = async () => {
    try {
      setCreating(true);
      const { data } = await base44.functions.invoke('createSuppliersTemplateSheet', {});
      if (data?.url) {
        setSheetUrl(data.url);
        window.open(data.url, '_blank');
      }
    } finally {
      setCreating(false);
    }
  };

  const importFromSheet = async () => {
    if (!sheetUrl) {
      alert(language === 'he' ? 'נא להדביק קישור ל-Google Sheets' : 'Please paste a Google Sheets URL');
      return;
    }
    try {
      setImporting(true);
      const { data } = await base44.functions.invoke('importSuppliersFromSheet', {
        spreadsheetUrl: sheetUrl
      });
      setResult(data);
      if (data?.success && onImportComplete) onImportComplete();
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-700">
        {language === 'he' ? (
          <>
            <p className="font-semibold">ייבוא ספקים מגוגל שיטס</p>
            <p className="mt-1">1. צרו תבנית בעברית, מלאו שמות ספקים ופרטים, ושמרו.</p>
            <p>2. הדביקו כאן את הקישור לקובץ ה-Google Sheets ולחצו ייבוא.</p>
          </>
        ) : (
          <>
            <p className="font-semibold">Import suppliers from Google Sheets (Hebrew headers)</p>
            <p className="mt-1">1. Create a template, fill supplier rows, save.</p>
            <p>2. Paste the Google Sheets URL and import.</p>
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={createTemplate} disabled={creating} className="bg-green-600 hover:bg-green-700">
              {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {language === 'he' ? 'צור תבנית ספקים' : 'Create Suppliers Template'}
            </Button>
            {sheetUrl && (
              <a href={sheetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-blue-600 text-sm">
                <ExternalLink className="w-4 h-4 mr-1" /> {language === 'he' ? 'פתח תבנית' : 'Open Template'}
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder={language === 'he' ? 'הדבק קישור לגוגל שיטס...' : 'Paste Google Sheets URL...'} />
            <Button onClick={importFromSheet} disabled={importing} className="bg-indigo-600 hover:bg-indigo-700">
              {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} {language === 'he' ? 'ייבוא' : 'Import'}
            </Button>
          </div>

          {result && (
            <div className="text-sm">
              {result.success ? (
                <div className="text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {language === 'he' ? `נוצרו ${result.created_count} ספקים` : `Created ${result.created_count} suppliers`}
                </div>
              ) : (
                <div className="text-red-600">{result.error || 'Failed'}</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>{language === 'he' ? 'סגור' : 'Close'}</Button>
      </div>
    </div>
  );
}