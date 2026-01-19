import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListChecks } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

export default function DailySummaryTab() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [counts, setCounts] = useState([]);
  const [wastes, setWastes] = useState([]);

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
      const [c, w] = await Promise.all([
        base44.entities.InventoryCount.filter({ warehouse_id: warehouseId, count_date: date, count_type: 'daily' }),
        base44.entities.WasteReport.filter({ warehouse_id: warehouseId, report_date: date })
      ]);
      setCounts(c || []);
      setWastes(w || []);
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
              <TableRow><TableCell colSpan={4} className="text-center text-gray-500">{L.noData}</TableCell></TableRow>
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
        <div className="text-sm text-gray-600">{L.footnote}</div>
      </CardContent>
    </Card>
  );
}