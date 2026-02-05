import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart2, DollarSign, Users, TrendingDown, TrendingUp } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function ChainDashboard() {
  const { language } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stores, setStores] = useState([]);
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`; // YYYY-MM
  });

  const isRTL = language === 'he' || language === 'ar';

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const me = await base44.auth.me();
        setUser(me);
        if (!me?.is_chain_head || !me?.chain_id) {
          setLoading(false);
          return;
        }
        const list = await base44.entities.ChainStore.filter({ chain_id: me.chain_id });
        setStores(list || []);
      } catch (e) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const titleText = language === 'he' ? 'דשבורד רשת' : 'Chain Dashboard';

  const loadMonthData = async (targetMonth) => {
    if (!user?.is_chain_head || !user?.chain_id) return;
    try {
      setLoading(true);
      const results = await Promise.all((stores || []).map(async (s) => {
        // Prefer MonthlyDashboardData for each store (created_by = store user)
        let mdd = [];
        try {
          mdd = await base44.entities.MonthlyDashboardData.filter({ month: targetMonth, created_by: s.user_email });
        } catch {}
        const rec = (mdd && mdd[0]) || null;
        const totalSales = Number(rec?.total_sales || 0);
        const foodCost = Number(rec?.manual_food_cost || 0);
        const laborCost = Number(rec?.manual_labor_cost || 0);
        return {
          store_name: s.store_name || s.user_email,
          user_email: s.user_email,
          totalSales,
          foodCost,
          laborCost,
        };
      }));
      setRows(results);
    } catch (e) {
      setError(e?.message || 'Failed to load month data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stores.length > 0 && user?.is_chain_head) {
      loadMonthData(month);
    } else if (user && (!user.is_chain_head || !user.chain_id)) {
      setRows([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores, month, user?.is_chain_head, user?.chain_id]);

  const totals = useMemo(() => {
    const totalSales = rows.reduce((s, r) => s + (Number(r.totalSales) || 0), 0);
    const foodCost = rows.reduce((s, r) => s + (Number(r.foodCost) || 0), 0);
    const laborCost = rows.reduce((s, r) => s + (Number(r.laborCost) || 0), 0);
    const foodPct = totalSales > 0 ? (foodCost / totalSales) * 100 : 0;
    const laborPct = totalSales > 0 ? (laborCost / totalSales) * 100 : 0;
    return { totalSales, foodCost, laborCost, foodPct, laborPct };
  }, [rows]);

  if (loading && !user) {
    return (
      <div className="p-6">
        <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!user?.is_chain_head || !user?.chain_id) {
    return (
      <div className="p-6">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
              {language === 'he' ? 'אין גישה' : 'No Access'}
            </CardTitle>
          </CardHeader>
          <CardContent className={isRTL ? 'text-right' : 'text-left'}>
            {language === 'he' ? 'הדשבורד זמין רק למנהלי רשת (סניף ראשי).' : 'This dashboard is only available to chain head users.'}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className={'flex items-center justify-between gap-3 ' + (isRTL ? 'flex-row-reverse' : '')}>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <BarChart2 className="h-6 w-6" />
          {titleText}
        </h1>
        <div className={'flex items-center gap-2 ' + (isRTL ? 'flex-row-reverse' : '')}>
          <label className="text-sm text-gray-600">{language === 'he' ? 'חודש' : 'Month'}</label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={() => loadMonthData(month)}>{language === 'he' ? 'רענן' : 'Refresh'}</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">{language === 'he' ? 'סה"כ מכירות' : 'Total Sales'}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="text-2xl font-bold">₪{totals.totalSales.toLocaleString()}</div>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">{language === 'he' ? 'עלות מזון' : 'Food Cost'}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">₪{totals.foodCost.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{totals.foodPct.toFixed(1)}%</div>
            </div>
            <TrendingDown className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">{language === 'he' ? 'עלות עבודה' : 'Labor Cost'}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">₪{totals.laborCost.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{totals.laborPct.toFixed(1)}%</div>
            </div>
            <Users className="h-5 w-5 text-indigo-500" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">{language === 'he' ? 'רווחיות משוערת' : 'Estimated Margin'}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div>
              {(() => {
                const margin = totals.totalSales - totals.foodCost - totals.laborCost;
                const pct = totals.totalSales > 0 ? (margin / totals.totalSales) * 100 : 0;
                return (
                  <>
                    <div className={"text-2xl font-bold " + (margin >= 0 ? 'text-emerald-700' : 'text-red-600')}>₪{margin.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{pct.toFixed(1)}%</div>
                  </>
                );
              })()}
            </div>
            {totals.totalSales - totals.foodCost - totals.laborCost >= 0 ? (
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stores table */}
      <Card>
        <CardHeader>
          <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
            {language === 'he' ? 'פירוט לפי סניף' : 'By Store'}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className={'w-full text-sm ' + (isRTL ? 'text-right' : 'text-left')}>
            <thead>
              <tr className="text-gray-600">
                <th className="py-2 font-medium">{language === 'he' ? 'סניף' : 'Store'}</th>
                <th className="py-2 font-medium">{language === 'he' ? 'מכירות' : 'Sales'}</th>
                <th className="py-2 font-medium">{language === 'he' ? 'עלות מזון' : 'Food Cost'}</th>
                <th className="py-2 font-medium">{language === 'he' ? 'עלות עבודה' : 'Labor Cost'}</th>
                <th className="py-2 font-medium">{language === 'he' ? 'אחוז מזון' : 'Food %'}</th>
                <th className="py-2 font-medium">{language === 'he' ? 'אחוז עבודה' : 'Labor %'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const foodPct = r.totalSales > 0 ? (r.foodCost / r.totalSales) * 100 : 0;
                const laborPct = r.totalSales > 0 ? (r.laborCost / r.totalSales) * 100 : 0;
                return (
                  <tr key={r.user_email} className="border-t">
                    <td className="py-2">{r.store_name}</td>
                    <td className="py-2">₪{Number(r.totalSales || 0).toLocaleString()}</td>
                    <td className="py-2">₪{Number(r.foodCost || 0).toLocaleString()}</td>
                    <td className="py-2">₪{Number(r.laborCost || 0).toLocaleString()}</td>
                    <td className="py-2">{foodPct.toFixed(1)}%</td>
                    <td className="py-2">{laborPct.toFixed(1)}%</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td className="py-4 text-gray-500" colSpan={6}>
                    {language === 'he' ? 'אין נתונים לחודש זה' : 'No data for this month'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
    </div>
  );
}