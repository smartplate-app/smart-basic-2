import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, CheckCircle, Loader, Edit, ChevronRight } from "lucide-react";

export default function WorkerInventoryCount({ items = [], warehouses = [], counts = [], ownerId, onBack, onSubmit }) {
  const [mode, setMode] = useState('list'); // 'list' | 'form'
  const [editingCount, setEditingCount] = useState(null); // null = new count

  const handleStartNew = () => {
    setEditingCount(null);
    setMode('form');
  };

  const handleEdit = (count) => {
    setEditingCount(count);
    setMode('form');
  };

  const handleFormSave = async (countData, countId) => {
    await onSubmit(countData, countId);
    setMode('list');
  };

  if (mode === 'form') {
    return (
      <CountForm
        items={items}
        warehouses={warehouses}
        existingCount={editingCount}
        onSave={handleFormSave}
        onBack={() => setMode('list')}
      />
    );
  }

  // List mode
  return (
    <div className="w-full" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          חזרה
        </Button>
        <h2 className="text-xl font-bold text-gray-800">ספירת מלאי</h2>
        <Button onClick={handleStartNew} className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4">
          + ספירה חדשה
        </Button>
      </div>

      {counts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-4">אין ספירות עדיין</p>
          <Button onClick={handleStartNew} className="bg-amber-500 hover:bg-amber-600 text-white">
            התחל ספירה ראשונה
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {counts.slice(0, 30).map(count => (
            <div
              key={count.id}
              className="bg-white border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-amber-50 transition"
              onClick={() => handleEdit(count)}
            >
              <div className="flex items-center gap-2 text-amber-600">
                <Edit className="w-4 h-4" />
                <span className="text-sm font-medium">עריכה</span>
              </div>
              <div className="text-right flex-1 mr-3">
                <div className="font-semibold text-gray-800 text-sm">
                  {count.warehouse_name || 'ספירה כללית'}
                </div>
                <div className="text-xs text-gray-400">
                  {count.count_date} · {count.count_type === 'daily' ? 'יומית' : count.count_type === 'weekly' ? 'שבועית' : 'חודשית'} · {(count.items || []).length} פריטים
                </div>
                <div className="text-xs font-bold text-amber-700 mt-0.5">
                  ₪{(count.total_inventory_value || 0).toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 rotate-180" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CountForm({ items, warehouses, existingCount, onSave, onBack }) {
  // Pre-fill from existingCount if editing
  const initialCounts = useMemo(() => {
    if (!existingCount?.items) return {};
    const map = {};
    existingCount.items.forEach(ci => {
      if (ci.item_id) map[ci.item_id] = ci.counted_quantity?.toString() || '';
    });
    return map;
  }, [existingCount]);

  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState(initialCounts);
  const [countType, setCountType] = useState(existingCount?.count_type || "monthly");
  const [warehouseId, setWarehouseId] = useState(existingCount?.warehouse_id || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedWarehouse = warehouses.find(w => w.id === warehouseId);
  const warehouseName = selectedWarehouse?.name || (warehouseId ? '' : 'ספירה כללית');

  // Filter items by warehouse catalog if warehouse selected
  const warehouseItems = useMemo(() => {
    if (!warehouseId || !selectedWarehouse?.catalog_items?.length) return items;
    return items.filter(i => selectedWarehouse.catalog_items.includes(i.id));
  }, [items, warehouseId, selectedWarehouse]);

  const filtered = useMemo(() =>
    warehouseItems.filter(i => i.name?.toLowerCase().includes(search.toLowerCase())),
    [warehouseItems, search]
  );

  const totalCost = useMemo(() => {
    return Object.entries(counts).reduce((sum, [itemId, qty]) => {
      const item = items.find(i => i.id === itemId);
      if (!item || !qty) return sum;
      return sum + ((item.price_after_discount || 0) * parseFloat(qty || 0));
    }, 0);
  }, [counts, items]);

  const countedItems = Object.keys(counts).filter(id => parseFloat(counts[id]) > 0).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const countItems = Object.entries(counts)
        .filter(([, qty]) => parseFloat(qty) > 0)
        .map(([itemId, qty]) => {
          const item = items.find(i => i.id === itemId);
          return {
            item_id: itemId,
            item_name: item?.name || '',
            supplier_name: item?.supplier_name || '',
            counted_quantity: parseFloat(qty),
            unit: item?.unit || 'unit',
            price_per_unit: item?.price_after_discount || 0,
            total_cost: (item?.price_after_discount || 0) * parseFloat(qty)
          };
        });

      await onSave({
        warehouse_id: warehouseId || '',
        warehouse_name: warehouseName,
        count_date: existingCount?.count_date || new Date().toISOString().split('T')[0],
        count_type: countType,
        items: countItems,
        total_inventory_value: totalCost
      }, existingCount?.id);

      setSaved(true);
    } catch (e) {
      alert("שגיאה בשמירה: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4" dir="rtl">
        <CheckCircle className="w-16 h-16 text-green-500" />
        <h2 className="text-2xl font-bold text-gray-800">{existingCount ? 'הספירה עודכנה!' : 'הספירה נשמרה!'}</h2>
        <p className="text-gray-500">סה"כ שווי מלאי: ₪{totalCost.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <Button onClick={onBack} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">חזרה לרשימה</Button>
      </div>
    );
  }

  return (
    <div className="w-full" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          חזרה
        </Button>
        <h2 className="text-xl font-bold text-gray-800">{existingCount ? 'עריכת ספירה' : 'ספירה חדשה'}</h2>
        <div />
      </div>

      {/* Warehouse selector */}
      {warehouses.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">מחסן</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setWarehouseId("")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                warehouseId === '' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              כללי
            </button>
            {warehouses.map(w => (
              <button
                key={w.id}
                onClick={() => setWarehouseId(w.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  warehouseId === w.id ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Count type */}
      <div className="flex gap-2 mb-4 justify-center">
        {[
          { key: 'daily', label: 'יומית' },
          { key: 'weekly', label: 'שבועית' },
          { key: 'monthly', label: 'חודשית' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCountType(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
              countType === key ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש פריט..."
          className="pr-9 text-right"
        />
      </div>

      {/* Items list */}
      <div className="space-y-2 mb-6 max-h-[45vh] overflow-y-auto">
        {filtered.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-white border rounded-xl px-4 py-3 gap-3">
            <div className="flex-1 text-right">
              <div className="font-medium text-gray-800 text-sm">{item.name}</div>
              <div className="text-xs text-gray-400">{item.supplier_name} · {item.unit}</div>
            </div>
            <input
              type="number"
              min="0"
              step="0.1"
              value={counts[item.id] || ''}
              onChange={e => setCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
              placeholder="0"
              className="w-20 text-center border-2 border-gray-200 rounded-lg px-2 py-2 text-lg font-bold focus:border-amber-400 focus:outline-none"
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 py-8">לא נמצאו פריטים</div>
        )}
      </div>

      {/* Summary + Save */}
      <div className="sticky bottom-0 bg-white border-t rounded-t-2xl shadow-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-gray-500 text-sm">{countedItems} פריטים נספרו</span>
          <div className="text-right">
            <div className="text-xs text-gray-400">סה"כ שווי מלאי</div>
            <div className="text-2xl font-bold text-amber-700">₪{totalCost.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || countedItems === 0}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg py-3 rounded-xl"
        >
          {saving ? <Loader className="w-5 h-5 animate-spin" /> : (existingCount ? 'עדכן ספירה' : 'שמור ספירה')}
        </Button>
      </div>
    </div>
  );
}