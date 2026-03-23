import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar as CalendarIcon, Save, Settings } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "../LanguageProvider";

export default function WasteReportForm({ warehouses, items, onCancel, onSaved, report }) {
  const { language } = useLanguage();
  const [warehouseId, setWarehouseId] = useState(report?.warehouse_id || warehouses[0]?.id || "");
  const [date, setDate] = useState(() => report?.report_date || new Date().toISOString().slice(0,10));
  const [shift, setShift] = useState(report?.shift || "daily");
  const [mode, setMode] = useState(report ? "free" : "preset"); // preset | free
  const [rows, setRows] = useState(report?.items || []);
  const [note, setNote] = useState(report?.notes || "");
  const [saving, setSaving] = useState(false);
  const [reportType, setReportType] = useState('start');
  const selectedWarehouse = useMemo(() => warehouses.find(w => w.id === warehouseId), [warehouseId, warehouses]);

  useEffect(() => {
    if (!warehouseId && warehouses[0]) setWarehouseId(warehouses[0].id);
  }, [warehouses, warehouseId]);

  useEffect(() => {
    if (report?.id) return; // do not auto-populate when editing existing report
    if (mode === 'preset') {
      const presetIds = selectedWarehouse?.waste_preset_items || [];
      const map = new Map(items.map(i => [i.id, i]));
      setRows(presetIds.map(id => map.get(id)).filter(Boolean).map(it => ({
        item_id: it.id,
        item_name: it.name,
        unit: it.unit,
        price_per_unit: it.price || 0,
        quantity: 0,
        reason: "",
      })));
    } else {
      setRows([]);
    }
  }, [mode, warehouseId, selectedWarehouse, items, report]);

  const addFreeRow = () => {
    setRows(r => ([...r, { item_id: "", item_name: "", unit: "unit", price_per_unit: 0, quantity: 0, reason: "" }]));
  };

  const updateRowField = (idx, field, value) => {
    setRows(prev => prev.map((r,i) => i===idx ? { ...r, [field]: value } : r));
  };

  const removeRow = (idx) => setRows(prev => prev.filter((_,i)=>i!==idx));

  const total = useMemo(() => rows.reduce((s,r)=> s + (Number(r.quantity||0) * Number(r.price_per_unit||0)), 0), [rows]);

  const save = async () => {
    if (!warehouseId) { alert(language === 'he' ? 'בחר מחסן' : 'Select warehouse'); return; }
    setSaving(true);
    try {
      const cleanItems = rows.map(r => ({
        ...r,
        total_cost: Number(r.quantity||0) * Number(r.price_per_unit||0)
      }));
      const payload = {
        warehouse_id: warehouseId,
        warehouse_name: selectedWarehouse?.name || "",
        report_date: date,
        shift,
        items: cleanItems,
        total_waste_value: cleanItems.reduce((s,x)=>s+(x.total_cost||0),0),
        notes: note
      };
      let wr;
      if (report?.id) {
        wr = await base44.entities.WasteReport.update(report.id, payload);
      } else {
        wr = await base44.entities.WasteReport.create(payload);
      }
      onSaved?.(wr);
    } catch (e) {
      alert(language === 'he' ? 'שגיאה בשמירה' : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const setPresetForWarehouse = async () => {
    const chosen = prompt(language === 'he' ? 'הזן שמות פריטים מופרדים בפסיקים (הגדרה מהירה). לשליטה מלאה, עבור למצב חופשי והוסף שורות ואז שמור כקבוע מראש.' : 'Enter item names or IDs separated by commas (quick setup). For full control, switch to Free mode and add rows then Save as preset later.');
    if (!chosen) return;
    const tokens = chosen.split(',').map(s=>s.trim()).filter(Boolean);
    const ids = tokens.map(t => items.find(it => it.id===t || it.name.toLowerCase()===t.toLowerCase())?.id).filter(Boolean);
    await base44.entities.Warehouse.update(warehouseId, { ...selectedWarehouse, waste_preset_items: ids });
    alert(language === 'he' ? 'נשמר בהצלחה' : 'Preset saved');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{report ? (language === 'he' ? 'ערוך דיווח פחת' : 'Edit Waste Report') : (language === 'he' ? 'דיווח פחת חדש' : 'New Waste Report')}</span>
          <Badge variant="outline">{language === 'he' ? `סה"כ ${total.toFixed(2)}` : `${total.toFixed(2)} total`}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm text-gray-600">{language === 'he' ? 'מחסן' : 'Warehouse'}</label>
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger className="w-full"><SelectValue placeholder={language === 'he' ? 'בחר' : 'Select'} /></SelectTrigger>
              <SelectContent>
                {warehouses.map(w => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm text-gray-600">{language === 'he' ? 'תאריך' : 'Date'}</label>
            <div className="flex items-center gap-2">
              <Input type="date" value={date} onChange={e=>setDate(e.target.value)} />
              <CalendarIcon className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600">{language === 'he' ? 'סוג דיווח' : 'Report Type'}</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full"><SelectValue placeholder={language === 'he' ? 'בחר' : 'Select'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="start">{language === 'he' ? 'תחילת יום' : 'Start of day'}</SelectItem>
                <SelectItem value="end">{language === 'he' ? 'סוף יום' : 'End of day'}</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-gray-500 mt-1">{language === 'he' ? 'סימון סוף יום מתבצע בסיכום יומי.' : 'End of day marking is done in Daily Summary.'}</div>
          </div>
          <div className="flex items-end gap-2">
            <Button variant={mode==='preset'? 'default':'outline'} onClick={()=>setMode('preset')}>{language === 'he' ? 'קבוע מראש' : 'Preset'}</Button>
            <Button variant={mode==='free'? 'default':'outline'} onClick={()=>setMode('free')}>{language === 'he' ? 'חופשי' : 'Free'}</Button>
            <Button variant="outline" onClick={setPresetForWarehouse} title={language === 'he' ? 'הגדרה מהירה' : 'Quick preset'}><Settings className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="space-y-2">
          {mode==='free' && (
            <Button variant="outline" size="sm" onClick={addFreeRow} className="gap-2"><Plus className="w-4 h-4"/> {language === 'he' ? 'הוסף פריט' : 'Add item'}</Button>
          )}
          <div className="border rounded-lg divide-y">
            {rows.length > 0 && (
              <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50 text-xs font-medium text-gray-500 rounded-t-lg hidden md:grid">
                <div className="md:col-span-4">{language === 'he' ? 'פריט' : 'Item'}</div>
                <div className="md:col-span-2">{language === 'he' ? 'כמות' : 'Quantity'}</div>
                <div className="md:col-span-2">{language === 'he' ? 'מחיר ליחידה' : 'Price per unit'}</div>
                <div className="md:col-span-3">{language === 'he' ? 'סיבה' : 'Reason'}</div>
                <div className="md:col-span-1"></div>
              </div>
            )}
            {rows.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">{mode==='preset' ? (language === 'he' ? 'אין פריטים קבועים. לחץ על גלגל השיניים להגדרת רשימה.' : 'No preset items. Click the gear to set preset list.') : (language === 'he' ? 'אין פריטים עדיין. הוסף פריטים לדיווח פחת.' : 'No items yet. Add items to report waste.')}</div>
            ) : rows.map((r, idx) => (
              <div key={idx} className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                <div className="md:col-span-4">
                  <div className="text-xs text-gray-500 mb-1 md:hidden">{language === 'he' ? 'פריט' : 'Item'}</div>
                  {mode==='free' ? (
                    <Select value={r.item_id} onValueChange={(v)=>{
                      const it = items.find(x=>x.id===v);
                      updateRowField(idx, 'item_id', v);
                      updateRowField(idx, 'item_name', it?.name || '');
                      updateRowField(idx, 'unit', it?.unit || 'unit');
                      updateRowField(idx, 'price_per_unit', it?.price || 0);
                    }}>
                      <SelectTrigger className="w-full"><SelectValue placeholder={language === 'he' ? 'בחר פריט' : 'Select item'} /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {items.map(it => (<SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm font-medium">{r.item_name}</div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Input type="number" step="0.01" value={r.quantity} onChange={e=>updateRowField(idx,'quantity', e.target.value)} placeholder={language === 'he' ? 'כמות' : 'Qty'} />
                </div>
                <div className="md:col-span-2">
                  <Input type="number" step="0.01" value={r.price_per_unit} onChange={e=>updateRowField(idx,'price_per_unit', e.target.value)} placeholder={language === 'he' ? 'מחיר' : 'Price'} />
                </div>
                <div className="md:col-span-3">
                  <Input value={r.reason} onChange={e=>updateRowField(idx,'reason', e.target.value)} placeholder={language === 'he' ? 'סיבה (פג תוקף, פגום...)' : 'Reason (expired, damaged, over-prep...)'} />
                </div>
                <div className="md:col-span-1 text-right">
                  <Button variant="ghost" size="icon" onClick={()=>removeRow(idx)}><Trash2 className="w-4 h-4"/></Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-gray-600">{language === 'he' ? 'הערות' : 'Notes'}</label>
          <Input value={note} onChange={e=>setNote(e.target.value)} placeholder={language === 'he' ? 'הערות אופציונליות' : 'Optional notes'} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>{language === 'he' ? 'ביטול' : 'Cancel'}</Button>
          <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Save className="w-4 h-4 mr-1 rtl:ml-1 rtl:mr-0"/> {report ? (language === 'he' ? 'עדכן דיווח' : 'Update Report') : (language === 'he' ? 'שמור דיווח' : 'Save Report')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}