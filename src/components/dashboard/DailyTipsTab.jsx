import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import moment from "moment";

export default function DailyTipsTab({ month, language }) {
  const isRTL = language === 'he' || language === 'ar';
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [salesInclVat, setSalesInclVat] = useState(0);
  const [serviceHours, setServiceHours] = useState(0);
  const [tipJar, setTipJar] = useState(0);
  const [rows, setRows] = useState([]);

  const t = (he, en) => (language === 'he' ? he : (en || he));

  const monthStart = useMemo(() => moment(month, 'YYYY-MM').startOf('month'), [month]);
  const monthEnd = useMemo(() => moment(month, 'YYYY-MM').endOf('month'), [month]);

  const currency = (n) => new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(Number(n)||0);

  const percent = (n) => `${(Number(n)||0).toFixed(1)}%`;

  const load = async () => {
    const list = await base44.entities.TipEntry.filter({});
    const monthRows = (list||[]).filter(r => {
      const d = moment(r.date);
      return d.isSameOrAfter(monthStart) && d.isSameOrBefore(monthEnd);
    }).sort((a,b)=> moment(b.date).valueOf() - moment(a.date).valueOf());
    setRows(monthRows);
  };

  useEffect(()=>{ load(); }, [month]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = {
        date,
        total_tips: Number(tipJar)||0,
        sales_incl_vat: Number(salesInclVat)||0,
        service_hours: Number(serviceHours)||0,
      };
      await base44.entities.TipEntry.create(data);
      setSalesInclVat(0); setServiceHours(0); setTipJar(0);
      await load();
    } finally {
      setSaving(false);
    }
  };

  // KPIs
  const totals = useMemo(()=>{
    const sales = rows.reduce((s,r)=> s + (Number(r.sales_incl_vat)||0), 0);
    const tips = rows.reduce((s,r)=> s + (Number(r.total_tips)||0), 0);
    const hours = rows.reduce((s,r)=> s + (Number(r.service_hours)||0), 0);
    const tipPct = sales>0 ? (tips / sales) * 100 : 0;
    const avgPerHour = hours>0 ? (tips / hours) : 0;
    return { sales, tips, hours, tipPct, avgPerHour };
  }, [rows]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle>{t('טיפים יומיים', 'Daily Tips')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div>
              <Label className={isRTL ? 'block text-right' : 'block text-left'}>{t('תאריך', 'Date')}</Label>
              <Input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
            </div>
            <div>
              <Label className={isRTL ? 'block text-right' : 'block text-left'}>{t('מכירות (כולל מע"מ)', 'Sales (incl. VAT)')}</Label>
              <Input type="number" value={salesInclVat} onChange={(e)=>setSalesInclVat(parseFloat(e.target.value)||0)} placeholder="0" />
            </div>
            <div>
              <Label className={isRTL ? 'block text-right' : 'block text-left'}>{t('שעות שירות', 'Service hours')}</Label>
              <Input type="number" value={serviceHours} onChange={(e)=>setServiceHours(parseFloat(e.target.value)||0)} placeholder="0" />
            </div>
            <div>
              <Label className={isRTL ? 'block text-right' : 'block text-left'}>{t('קופת טיפים (₪)', 'Tip jar (₪)')}</Label>
              <Input type="number" value={tipJar} onChange={(e)=>setTipJar(parseFloat(e.target.value)||0)} placeholder="0" />
            </div>
          </div>
          <div className={`mt-4 ${isRTL ? 'text-right' : 'text-left'}`}>
            <Button onClick={handleSave} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
              {t('שמור', 'Save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="pt-4">
            <div className="text-sm text-gray-600">{t('סה"כ מכירות (מע"מ כלול)', 'Sales (incl. VAT)')}</div>
            <div className="text-2xl font-bold">{currency(totals.sales)}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-4">
            <div className="text-sm text-gray-600">{t('סה"כ טיפים', 'Total Tips')}</div>
            <div className="text-2xl font-bold">{currency(totals.tips)}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-4">
            <div className="text-sm text-gray-600">{t('טיפ מהמכירות', 'Tip as % of sales')}</div>
            <div className="text-2xl font-bold">{percent(totals.tipPct)}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="pt-4">
            <div className="text-sm text-gray-600">{t('ממוצע טיפ לשעת שירות', 'Avg tip per service hour')}</div>
            <div className="text-2xl font-bold">{currency(totals.avgPerHour)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle>{t('יומן טיפים לחודש', 'Tips Log for Month')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('תאריך','Date')}</TableHead>
                  <TableHead className="text-right">{t('מכירות (כולל מע"מ)','Sales (incl. VAT)')}</TableHead>
                  <TableHead className="text-right">{t('שעות שירות','Service hours')}</TableHead>
                  <TableHead className="text-right">{t('קופת טיפים','Tip jar')}</TableHead>
                  <TableHead className="text-right">{t('% טיפ מהמכירות','Tip % of sales')}</TableHead>
                  <TableHead className="text-right">{t('ממוצע לט"ש','Avg per hour')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-gray-500">{t('אין נתונים לחודש זה','No entries for this month')}</TableCell></TableRow>
                ) : rows.map(r => {
                  const pct = (Number(r.sales_incl_vat)||0) > 0 ? (Number(r.total_tips||0) / Number(r.sales_incl_vat)) * 100 : 0;
                  const perHour = (Number(r.service_hours)||0) > 0 ? (Number(r.total_tips||0) / Number(r.service_hours)) : 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">{moment(r.date).format('YYYY-MM-DD')}</TableCell>
                      <TableCell className="text-right">{currency(r.sales_incl_vat||0)}</TableCell>
                      <TableCell className="text-right">{Number(r.service_hours||0).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{currency(r.total_tips||0)}</TableCell>
                      <TableCell className="text-right">{percent(pct)}</TableCell>
                      <TableCell className="text-right">{currency(perHour)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}