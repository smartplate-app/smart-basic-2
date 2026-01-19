import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/components/LanguageProvider";

export default function DailySummaryTab() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [counts, setCounts] = useState([]);
  const [wastes, setWastes] = useState([]);
  const [eodItems, setEodItems] = useState([]);
  const [eodReportId, setEodReportId] = useState(null);
  const [savingEod, setSavingEod] = useState(false);
  const [monthStats, setMonthStats] = useState({ usage: 0, waste: 0 });

  const { language } = useLanguage();
  const isHE = language === 'he';
  const L = {
    header: isHE ? 'סיכום ספירה יומית' : 'Daily Count Summary',
    date: isHE ? 'תאריך' : 'Date',
    warehouse: isHE ? 'מחסן' : 'Warehouse',
    item: isHE ? 'פריט' : 'Item',
    begin: isHE ? 'תחילה' : 'Begin',
    end: isHE ? 'סיום' : 'End',
    diff: isHE ? 'הפרש' : 'Difference',
    noData: isHE ? 'אין נתונים ליום זה' : 'No data for this day',
    footnote: isHE ? 'ההפרש אמור לשקף את הכמות שנצרכה או נמכרה במהלך היום.' : 'Difference should equal what was used or sold during the day.',
  };

  useEffect(() => {
    (async () => {
      const wh = await base44.entities.Warehouse.list();
      setWarehouses(wh);
      if (!warehouseId && wh[0]) setWarehouseId(wh[0].id);
    })();
  }, []);

  useEffect(() => {
    if (!warehouseId) return;
    (async () => {
      const [c, w, eod] = await Promise.all([
        base44.entities.InventoryCount.filter({ warehouse_id: warehouseId, count_date: date, count_type: 'daily' }),
        base44.entities.WasteReport.filter({ warehouse_id: warehouseId, report_date: date }),
        base44.entities.WasteReport.filter({ warehouse_id: warehouseId, report_date: date, report_kind: 'end_of_day' })
      ]);
      setCounts(c || []);
      setWastes(w || []);
      const eodRec = (eod || [])[0] || null;
      setEodReportId(eodRec?.id || null);
      const dispMap = new Map();
      (eodRec?.items || []).forEach(it => {
        const key = it.item_id || it.item_name;
        dispMap.set(key, it.disposition || 'can_sell_tomorrow');
      });
      const seedFrom = ((c||[]).find(x=>x.status==='completed') || (c||[]).find(x=>x.status==='in_progress'))?.items || [];
      const seeded = seedFrom.map(it => {
        const key = it.item_id || it.item_name;
        return {
          item_id: it.item_id,
          item_name: it.item_name,
          unit: it.unit || '',
          end_qty: Number(it.counted_quantity||0),
          disposition: dispMap.get(key) || 'can_sell_tomorrow'
        };
      });
      setEodItems(seeded);
    })();
  }, [warehouseId, date]);

  useEffect(() => {
    if (!warehouseId || !date) return;
    (async () => {
      const month = date.slice(0,7);
      const allCounts = await base44.entities.InventoryCount.list();
      const allWaste = await base44.entities.WasteReport.list();
      const monthCounts = (allCounts||[]).filter(x => x.warehouse_id === warehouseId && x.count_type === 'daily' && (x.count_date||'').startsWith(month));
      const byDate = monthCounts.reduce((acc,c)=>{
        const d=c.count_date; (acc[d]=acc[d]||[]).push(c); return acc;
      },{});
      let usage=0;
      Object.values(byDate).forEach((arr)=>{
        const begin = (arr).find(x=>x.status==='in_progress');
        const end = (arr).find(x=>x.status==='completed');
        if (!begin || !end) return;
        const map = new Map();
        (begin.items||[]).forEach(it=>{ map.set(it.item_id||it.item_name,{b:Number(it.counted_quantity||0),e:0}); });
        (end.items||[]).forEach(it=>{ const k=it.item_id||it.item_name; const ent=map.get(k)||{b:0,e:0}; ent.e+=Number(it.counted_quantity||0); map.set(k,ent); });
        map.forEach(v=>{ usage += Math.max(0, v.b - v.e); });
      });
      const monthWaste = (allWaste||[]).filter(x => x.warehouse_id === warehouseId && (x.report_date||'').startsWith(month) && x.report_kind !== 'end_of_day');
      let wasteQty = 0;
      monthWaste.forEach(r => (r.items||[]).forEach(it => { wasteQty += Number(it.quantity||0); }));
      setMonthStats({ usage, waste: wasteQty });
    })();
  }, [warehouseId, date]);

  const beginCount = useMemo(() => (counts || []).find(x => x.status === 'in_progress') || null, [counts]);
  const endCount = useMemo(() => (counts || []).find(x => x.status === 'completed') || null, [counts]);

  const rows = useMemo(() => {
    const map = new Map();
    const add = (arr, sign) => {
      (arr||[]).forEach(it => {
        const key = it.item_id || it.item_name;
        const row = map.get(key) || { item_name: it.item_name, unit: it.unit || '', begin: 0, end: 0, waste: 0 };
        row.item_id = it.item_id;
        if (sign === 'begin') row.begin += Number(it.counted_quantity||0);
        if (sign === 'end') row.end += Number(it.counted_quantity||0);
        map.set(key, row);
      });
    };
    add(beginCount?.items, 'begin');
    add(endCount?.items, 'end');
    (wastes||[]).flatMap(w => w.items || []).forEach(it => {
      const key = it.item_id || it.item_name;
      const row = map.get(key) || { item_name: it.item_name, unit: it.unit || '', begin: 0, end: 0, waste: 0 };
      row.waste += Number(it.quantity||0);
      map.set(key, row);
    });
    return Array.from(map.values());
  }, [beginCount, endCount, wastes]);

  const sampleRows = useMemo(() => (
    isHE ? [
      { item_name: 'חלה לבנה', begin: 8, end: 5, unit: 'יח׳' },
      { item_name: 'קמח לבן קילו', begin: 6, end: 4.5, unit: 'ק"ג' },
      { item_name: 'חלב 3% 1ל׳', begin: 12, end: 8.5, unit: 'ל׳' },
    ] : [
      { item_name: 'White Bread', begin: 8, end: 5, unit: 'unit' },
      { item_name: 'Flour 1kg', begin: 6, end: 4.5, unit: 'kg' },
      { item_name: 'Milk 3% 1L', begin: 12, end: 8.5, unit: 'L' },
    ]
  ), [isHE]);

  const handleDispositionChange = (key, value) => {
    setEodItems(prev => prev.map(it => ((it.item_id || it.item_name) === key) ? { ...it, disposition: value } : it));
  };

  const saveEod = async () => {
    if (!warehouseId) return;
    setSavingEod(true);
    try {
      const wh = warehouses.find(w => w.id === warehouseId);
      const payload = {
        warehouse_id: warehouseId,
        warehouse_name: wh?.name || '',
        report_date: date,
        shift: 'daily',
        report_kind: 'end_of_day',
        items: (eodItems||[]).map(it => ({
          item_id: it.item_id,
          item_name: it.item_name,
          unit: it.unit,
          quantity: Number(it.end_qty||0),
          disposition: it.disposition
        }))
      };
      if (eodReportId) {
        await base44.entities.WasteReport.update(eodReportId, payload);
      } else {
        const rec = await base44.entities.WasteReport.create(payload);
        setEodReportId(rec.id);
      }

      // Auto-log REAL WASTE items into the standard daily waste report
      const realWasteItems = (eodItems||[])
        .filter(it => it.disposition === 'real_waste' && Number(it.end_qty||0) > 0)
        .map(it => ({
          item_id: it.item_id,
          item_name: it.item_name,
          unit: it.unit,
          quantity: Number(it.end_qty||0),
          reason: 'end_of_day_real_waste'
        }));
      if (realWasteItems.length > 0) {
        const existing = await base44.entities.WasteReport.filter({ warehouse_id: warehouseId, report_date: date, report_kind: 'waste' });
        if (existing && existing[0]) {
          const ex = existing[0];
          await base44.entities.WasteReport.update(ex.id, { ...ex, items: [ ...(ex.items||[]), ...realWasteItems ] });
        } else {
          await base44.entities.WasteReport.create({
            warehouse_id: warehouseId,
            warehouse_name: wh?.name || '',
            report_date: date,
            shift: 'daily',
            report_kind: 'waste',
            items: realWasteItems,
            notes: 'Auto-created from End of Day'
          });
        }
      }
    } finally {
      setSavingEod(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListChecks className="w-4 h-4"/> {L.header}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className={`text-sm text-gray-600 ${isHE ? 'block text-right' : ''}`}>{L.warehouse}</label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-full"><SelectValue placeholder={isHE ? 'בחר' : 'Select'} /></SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={`text-sm text-gray-600 ${isHE ? 'block text-right' : ''}`}>{L.date}</label>
            <input type="date" className="w-full border rounded h-9 px-3" value={date} onChange={e=>setDate(e.target.value)} />
          </div>
        </div>

        <div className="rounded-md border p-3 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{isHE ? 'דשבורד חודשי' : 'Monthly Dashboard'}</span>
            <span className="text-gray-600">{isHE ? 'בזבוז' : 'Waste'}: {monthStats.usage>0 ? ((monthStats.waste / monthStats.usage)*100).toFixed(1) : '0.0'}%</span>
          </div>
          <Progress value={Math.min(100, monthStats.usage>0 ? (monthStats.waste / monthStats.usage)*100 : 0)} className="h-2 mt-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{isHE ? 'שימוש חודשי' : 'Monthly usage'}: {monthStats.usage.toFixed(2)}</span>
            <span>{isHE ? 'בזבוז חודשי' : 'Monthly waste'}: {monthStats.waste.toFixed(2)}</span>
          </div>
        </div>

         <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{L.item}</TableHead>
              <TableHead className="text-right">{L.begin}</TableHead>
              <TableHead className="text-right">{L.end}</TableHead>
              <TableHead className="text-right">{L.diff}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <>
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">{L.noData}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={4} className="text-xs text-gray-500">
                    {isHE ? 'דוגמה (להמחשה): כך ייראה הסיכום כשיש ספירת פתיחה וסיום' : 'Example (for illustration): how the summary looks with begin and end counts'}
                  </TableCell>
                </TableRow>
                <TableRow className="opacity-80">
                  <TableCell className="italic text-gray-600">{isHE ? 'חלה לבנה' : 'White Bread'}</TableCell>
                  <TableCell className="text-right text-gray-600">8.00</TableCell>
                  <TableCell className="text-right text-gray-600">5.00</TableCell>
                  <TableCell className="text-right text-gray-800 font-medium">3.00</TableCell>
                </TableRow>
                <TableRow className="opacity-80">
                  <TableCell className="italic text-gray-600">{isHE ? 'קמח 1 קילו' : 'Flour 1kg'}</TableCell>
                  <TableCell className="text-right text-gray-600">6.00</TableCell>
                  <TableCell className="text-right text-gray-600">4.50</TableCell>
                  <TableCell className="text-right text-gray-800 font-medium">1.50</TableCell>
                </TableRow>
                <TableRow className="opacity-80">
                  <TableCell className="italic text-gray-600">{isHE ? 'חלב 3% (1 ליטר)' : 'Milk 3% 1L'}</TableCell>
                  <TableCell className="text-right text-gray-600">12.00</TableCell>
                  <TableCell className="text-right text-gray-600">8.50</TableCell>
                  <TableCell className="text-right text-gray-800 font-medium">3.50</TableCell>
                </TableRow>
              </>
            ) : rows.map((r, i) => {
              const diff = Number(r.begin||0) - Number(r.end||0);
              return (
                <TableRow key={i}>
                  <TableCell>{r.item_name}</TableCell>
                  <TableCell className="text-right">{Number(r.begin||0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{Number(r.end||0).toFixed(2)}</TableCell>
                  <TableCell className="text-right">{diff.toFixed(2)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{isHE ? 'דו״ח סוף יום – שניתן למכירה מחר' : 'End of Day – Can Sell Tomorrow'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L.item}</TableHead>
                  <TableHead className="text-right">{L.end}</TableHead>
                  <TableHead className="text-right">{isHE ? 'סיווג' : 'Disposition'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(eodItems||[]).map((it, idx) => {
                  const key = it.item_id || it.item_name;
                  return (
                    <TableRow key={key || idx}>
                      <TableCell>{it.item_name}</TableCell>
                      <TableCell className="text-right">{Number(it.end_qty||0).toFixed(2)} {it.unit}</TableCell>
                      <TableCell className="text-right">
                        <RadioGroup value={it.disposition} onValueChange={(v)=>handleDispositionChange(key, v)} className={`flex ${isHE ? 'justify-end' : 'justify-end'} gap-4`}>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <RadioGroupItem value="can_sell_tomorrow" id={`carry-${idx}`} />
                            <Label htmlFor={`carry-${idx}`}>{isHE ? 'ניתן למכירה מחר' : 'Can sell tomorrow'}</Label>
                          </div>
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <RadioGroupItem value="real_waste" id={`waste-${idx}`} />
                            <Label htmlFor={`waste-${idx}`}>{isHE ? 'פסולת (זבל)' : 'Real waste'}</Label>
                          </div>
                        </RadioGroup>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex justify-end">
              <Button onClick={saveEod} disabled={savingEod} className="bg-gray-900 hover:bg-gray-800">{savingEod ? (isHE ? 'שומר...' : 'Saving...') : (isHE ? 'שמור דו״ח סוף יום' : 'Save End of Day')}</Button>
            </div>
          </CardContent>
        </Card>

         <div className="text-sm text-gray-600">{L.footnote}</div>
      </CardContent>
    </Card>
  );
}