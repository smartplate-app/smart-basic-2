import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import HourlySalesScanner from "../components/sales/HourlySalesScanner";
import { useLanguage } from "../components/LanguageProvider";

export default function SalesPerHourPage() {
  const { language } = useLanguage();
  const [month, setMonth] = React.useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}`;
  });
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.HourlySalesReport.filter({ month });
      const latest = Array.isArray(list) && list.length ? list[list.length - 1] : null;
      setReport(latest || null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  React.useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{language === 'he' ? 'מכירות לפי שעה' : 'Sales per Hour'}</h1>
            <p className="text-gray-600">{language === 'he' ? 'סרוק דו"ח חודשי מה-POS BI ושמור למעקב' : 'Scan a monthly POS BI report and save it for analysis.'}</p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">{language === 'he' ? 'חודש' : 'Month'}</label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <Button variant="outline" onClick={load}>{language === 'he' ? 'טען' : 'Load'}</Button>
          </div>
        </div>

        <HourlySalesScanner onSaved={load} />

        <Card>
          <CardHeader>
            <CardTitle>{language === 'he' ? 'תוצאות שמורות' : 'Saved Result'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-600">{language === 'he' ? 'טוען...' : 'Loading...'}</div>
            ) : !report ? (
              <div className="text-gray-500">{language === 'he' ? 'אין תוצאה שמורה לחודש זה' : 'No saved report for this month.'}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-right">{language === 'he' ? 'שעה' : 'Hour'}</th>
                      <th className="border p-2 text-right">{language === 'he' ? 'מכירות' : 'Sales'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.rows || []).sort((a,b) => a.hour-b.hour).map((r) => (
                      <tr key={r.hour}>
                        <td className="border p-2">{String(r.hour).padStart(2,'0')}:00</td>
                        <td className="border p-2">₪{Number(r.sales).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border p-2">{language === 'he' ? 'סה"כ' : 'Total'}</td>
                      <td className="border p-2">₪{Number(report.total_sales || (report.rows || []).reduce((s,r)=>s+Number(r.sales||0),0)).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}