import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Loader, CheckCircle, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function WorkerWasteForm({ items = [], ownerId, onBack, onSubmit }) {
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingWh, setLoadingWh] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.functions.invoke('workerPortalData', { ownerId, action: 'loadWarehouses' })
      .then(res => {
        const wh = res.data?.warehouses || [];
        setWarehouses(wh);
        if (wh.length > 0) setWarehouseId(wh[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingWh(false));
  }, [ownerId]);

  const selectedWarehouse = useMemo(() => warehouses.find(w => w.id === warehouseId), [warehouses, warehouseId]);

  // Auto-load preset items when warehouse changes
  useEffect(() => {
    if (!selectedWarehouse) return;
    const presetIds = selectedWarehouse.waste_preset_items || [];
    if (presetIds.length === 0) { setRows([]); return; }
    const map = new Map(items.map(i => [i.id, i]));
    setRows(presetIds.map(id => map.get(id)).filter(Boolean).map(it => ({
      item_id: it.id,
      item_name: it.name,
      unit: it.unit,
      price_per_unit: it.price_after_discount || 0,
      quantity: '',
      reason: ''
    })));
  }, [warehouseId, items]);

  const filteredItems = useMemo(() =>
    items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  const addRow = () => setRows(r => [...r, { item_id: '', item_name: '', unit: 'unit', price_per_unit: 0, quantity: '', reason: '' }]);
  const removeRow = idx => setRows(r => r.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => setRows(r => r.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const total = useMemo(() =>
    rows.reduce((s, r) => s + (Number(r.quantity || 0) * Number(r.price_per_unit || 0)), 0),
    [rows]
  );

  const handleSave = async () => {
    const validRows = rows.filter(r => r.item_id && Number(r.quantity) > 0);
    if (validRows.length === 0) { alert('יש להוסיף לפחות פריט אחד עם כמות'); return; }
    setSaving(true);
    try {
      const wasteItems = validRows.map(r => ({
        ...r,
        quantity: parseFloat(r.quantity),
        total_cost: Number(r.quantity) * Number(r.price_per_unit || 0)
      }));
      await onSubmit({
        warehouse_id: warehouseId,
        warehouse_name: selectedWarehouse?.name || '',
        report_date: date,
        shift: 'daily',
        items: wasteItems,
        total_waste_value: total,
        notes
      });
      setSaved(true);
    } catch (e) {
      alert('שגיאה בשמירה: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4" dir="rtl">
        <CheckCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold text-gray-800">דיווח הפחת נשמר!</h2>
        <p className="text-gray-500">סה"כ שווי פחת: ₪{total.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <Button onClick={onBack} className="mt-4 bg-red-500 hover:bg-red-600 text-white">חזרה לתפריט</Button>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          חזרה
        </Button>
        <h2 className="text-xl font-bold text-gray-800">דיווח פחת</h2>
        <div />
      </div>

      {/* Warehouse + Date */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-sm text-gray-600 mb-1 block">מחסן</label>
          {loadingWh ? (
            <div className="text-gray-400 text-sm">טוען...</div>
          ) : (
            <Select value={warehouseId} onValueChange={setWarehouseId}>
              <SelectTrigger><SelectValue placeholder="בחר מחסן" /></SelectTrigger>
              <SelectContent>
                {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div>
          <label className="text-sm text-gray-600 mb-1 block">תאריך</label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>

      {/* Add item row */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפש פריט להוספה..."
            className="pr-9 text-right"
          />
        </div>
      </div>

      {/* Quick-add from search results */}
      {search.length > 0 && (
        <div className="bg-white border rounded-xl mb-4 max-h-40 overflow-y-auto shadow-sm">
          {filteredItems.slice(0, 10).map(item => (
            <button
              key={item.id}
              onClick={() => {
                const alreadyIn = rows.find(r => r.item_id === item.id);
                if (!alreadyIn) {
                  setRows(r => [...r, { item_id: item.id, item_name: item.name, unit: item.unit, price_per_unit: item.price_after_discount || 0, quantity: '', reason: '' }]);
                }
                setSearch('');
              }}
              className="w-full text-right px-4 py-2 hover:bg-amber-50 text-sm border-b last:border-0 flex justify-between items-center"
            >
              <span className="text-gray-500 text-xs">{item.supplier_name} · {item.unit}</span>
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
          {filteredItems.length === 0 && <div className="text-center text-gray-400 py-3 text-sm">לא נמצא</div>}
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2 mb-6 max-h-[40vh] overflow-y-auto">
        {rows.length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm">חפש פריט להוספה או לחץ הוסף שורה</div>
        )}
        {rows.map((row, idx) => (
          <div key={idx} className="bg-white border rounded-xl px-4 py-3 flex gap-3 items-center">
            <div className="flex-1 text-right">
              <div className="font-medium text-gray-800 text-sm">{row.item_name || 'פריט לא נבחר'}</div>
              <div className="text-xs text-gray-400">{row.unit}</div>
              {row.reason !== undefined && (
                <Input
                  value={row.reason}
                  onChange={e => updateRow(idx, 'reason', e.target.value)}
                  placeholder="סיבה (פג תוקף, פגום...)"
                  className="mt-1 text-xs h-7 text-right"
                />
              )}
            </div>
            <input
              type="number"
              min="0"
              step="0.1"
              value={row.quantity}
              onChange={e => updateRow(idx, 'quantity', e.target.value)}
              placeholder="0"
              className="w-20 text-center border-2 border-gray-200 rounded-lg px-2 py-2 text-lg font-bold focus:border-red-400 focus:outline-none"
            />
            <Button variant="ghost" size="icon" onClick={() => removeRow(idx)}>
              <Trash2 className="w-4 h-4 text-gray-400" />
            </Button>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-4">
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="הערות..." className="text-right" />
      </div>

      {/* Summary + Save */}
      <div className="sticky bottom-0 bg-white border-t rounded-t-2xl shadow-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500 text-sm">{rows.filter(r => Number(r.quantity) > 0).length} פריטים</span>
          <div className="text-right">
            <div className="text-xs text-gray-400">סה"כ שווי פחת</div>
            <div className="text-2xl font-bold text-red-600">₪{total.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || rows.filter(r => Number(r.quantity) > 0).length === 0}
          className="w-full bg-red-500 hover:bg-red-600 text-white text-lg py-3 rounded-xl"
        >
          {saving ? <Loader className="w-5 h-5 animate-spin" /> : 'שמור דיווח פחת'}
        </Button>
      </div>
    </div>
  );
}