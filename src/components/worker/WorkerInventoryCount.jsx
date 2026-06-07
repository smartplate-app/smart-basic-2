import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, CheckCircle, Loader } from "lucide-react";

export default function WorkerInventoryCount({ items = [], ownerId, onBack, onSubmit }) {
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({});
  const [countType, setCountType] = useState("monthly");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filtered = useMemo(() =>
    items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase())),
    [items, search]
  );

  const totalCost = useMemo(() => {
    return Object.entries(counts).reduce((sum, [itemId, qty]) => {
      const item = items.find(i => i.id === itemId);
      if (!item || !qty) return sum;
      return sum + ((item.price_after_discount || 0) * parseFloat(qty || 0));
    }, 0);
  }, [counts, items]);

  const countedItems = Object.keys(counts).filter(id => counts[id] > 0).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const countItems = Object.entries(counts)
        .filter(([, qty]) => qty > 0)
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

      await onSubmit({
        warehouse_name: 'ספירה כללית',
        count_date: new Date().toISOString().split('T')[0],
        count_type: countType,
        items: countItems,
        total_inventory_value: totalCost
      });
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
        <h2 className="text-2xl font-bold text-gray-800">הספירה נשמרה!</h2>
        <p className="text-gray-500">סה"כ שווי מלאי: ₪{totalCost.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <Button onClick={onBack} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">חזרה לתפריט</Button>
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
        <h2 className="text-xl font-bold text-gray-800">ספירת מלאי</h2>
        <div />
      </div>

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
              countType === key
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-600 border-gray-300'
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
      <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto">
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
          {saving ? <Loader className="w-5 h-5 animate-spin" /> : 'שמור ספירה'}
        </Button>
      </div>
    </div>
  );
}