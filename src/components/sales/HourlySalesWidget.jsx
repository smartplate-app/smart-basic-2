import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../LanguageProvider";
import moment from "moment";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

export default function HourlySalesWidget() {
  const { language } = useLanguage();
  const [selectedMonth, setSelectedMonth] = React.useState(() => moment().format('YYYY-MM'));
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.HourlySalesReport.filter({ month: selectedMonth });
      const latest = Array.isArray(list) && list.length ? list[list.length - 1] : null;
      setReport(latest || null);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  React.useEffect(() => { load(); }, [load]);

  const data = (report?.rows || [])
    .slice()
    .sort((a,b)=>a.hour-b.hour)
    .map(r => ({ hour: `${String(r.hour).padStart(2,'0')}:00`, sales: Number(r.sales||0) }));
  const total = report ? (report.total_sales || (report.rows||[]).reduce((s,r)=>s+Number(r.sales||0),0)) : 0;

  return (
    <Card className="shadow-xl border-0 bg-white/90">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-extrabold tracking-tight">
              {language === 'he' ? 'מכירות לפי שעה (חודשי)' : 'Hourly Sales (Monthly)'}
            </CardTitle>
            <div className="text-sm text-gray-500 mt-1">
              {language === 'he' ? 'נתוני BI שנסרקו ושמורים' : 'Scanned POS BI monthly results'}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-36 cursor-pointer px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {Array.from({ length: 18 }, (_, i) => {
                const date = moment().subtract(i, 'months');
                return (
                  <option key={date.format('YYYY-MM')} value={date.format('YYYY-MM')}>
                    {date.format('YYYY-MM')}
                  </option>
                );
              })}
            </select>
            <Button variant="outline" onClick={load} className="h-9">
              {language === 'he' ? 'טען' : 'Load'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prestige KPI ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-4">
            <div className="text-xs opacity-90">{language === 'he' ? 'סה"כ לחודש' : 'Monthly Total'}</div>
            <div className="text-3xl font-extrabold mt-1">₪{Number(total).toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-xl p-4">
            <div className="text-xs opacity-90">{language === 'he' ? 'ממוצע לשעה' : 'Avg per hour'}</div>
            <div className="text-3xl font-extrabold mt-1">₪{(data.length? (total/data.length):0).toLocaleString(undefined,{maximumFractionDigits:0})}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl p-4">
            <div className="text-xs opacity-90">{language === 'he' ? 'שעה חזקה' : 'Top hour'}</div>
            <div className="text-3xl font-extrabold mt-1">
              {data.length ? data.slice().sort((a,b)=>b.sales-a.sales)[0].hour : '--:--'}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-600">{language === 'he' ? 'טוען...' : 'Loading...'}</div>
        ) : !report ? (
          <div className="text-gray-500">{language === 'he' ? 'אין תוצאה שמורה לחודש זה.' : 'No saved report for this month.'}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {language === 'he' ? 'מכירות לפי שעה (גרף קווי)' : 'Hourly Sales (Line)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(v)=>`₪${Number(v).toLocaleString()}`} />
                      <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {language === 'he' ? 'מכירות לפי שעה (עמודות)' : 'Hourly Sales (Bars)'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip formatter={(v)=>`₪${Number(v).toLocaleString()}`} />
                      <Bar dataKey="sales" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2 text-right">{language === 'he' ? 'שעה' : 'Hour'}</th>
                    <th className="border p-2 text-right">{language === 'he' ? 'מכירות' : 'Sales'}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((r) => (
                    <tr key={r.hour}>
                      <td className="border p-2">{r.hour}</td>
                      <td className="border p-2">₪{Number(r.sales).toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td className="border p-2">{language === 'he' ? 'סה"כ' : 'Total'}</td>
                    <td className="border p-2">₪{Number(total).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}