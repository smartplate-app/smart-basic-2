import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export default function IngredientRows({ items, preps = [], rows, setRows, allowPreps = false }) {
  const addRow = () => setRows([
    ...rows,
    { type: 'item', item_id: '', item_name: '', prep_id: '', prep_name: '', quantity: 1, unit: 'unit' }
  ]);
  const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));
  const updateRow = (idx, patch) => setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const computePrepCostPerUnit = (prep) => {
    if (!prep) return 0;
    const total = (prep.ingredients || []).reduce((sum, ing) => {
      const it = items.find((x) => String(x.id) === String(ing.item_id));
      const price = it ? (it.price_after_discount ?? it.price ?? 0) : 0;
      const qty = Number(ing.quantity) || 0;
      return sum + price * qty;
    }, 0);
    const y = Number(prep.yield_quantity) || 1;
    return y > 0 ? total / y : 0;
  };

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => {
        const selectedItem = items.find((it) => String(it.id) === String(row.item_id));
        const selectedPrep = preps.find((p) => String(p.id) === String(row.prep_id));
        const lineCost = row.type === 'prep'
          ? computePrepCostPerUnit(selectedPrep) * (Number(row.quantity) || 0)
          : ((selectedItem ? (selectedItem.price_after_discount ?? selectedItem.price ?? 0) : 0) * (Number(row.quantity) || 0));

        return (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
            {allowPreps && (
              <Select
                value={row.type || 'item'}
                onValueChange={(v) => updateRow(idx, { type: v, item_id: '', item_name: '', prep_id: '', prep_name: '' })}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="item">Item</SelectItem>
                  <SelectItem value="prep">Prep</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(!allowPreps || row.type === 'item') && (
              <Select
                value={row.item_id || undefined}
                onValueChange={(v) => {
                  const it = items.find((x) => String(x.id) === String(v));
                  updateRow(idx, { item_id: v, item_name: it?.name || '', type: 'item' });
                }}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent className="max-h-64 overflow-auto">
                  {items.map((it) => (
                    <SelectItem key={it.id} value={String(it.id)}>
                      {it.name} {it.unit ? `· ${it.unit}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {allowPreps && row.type === 'prep' && (
              <Select
                value={row.prep_id || undefined}
                onValueChange={(v) => {
                  const p = preps.find((x) => String(x.id) === String(v));
                  updateRow(idx, { prep_id: v, prep_name: p?.name || '', type: 'prep' });
                }}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select prep" /></SelectTrigger>
                <SelectContent className="max-h-64 overflow-auto">
                  {preps.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} · yield {p.yield_quantity} {p.yield_unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input
              type="number"
              value={row.quantity}
              onChange={(e) => updateRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
              placeholder="Qty"
            />

            <Input
              value={row.unit || ''}
              onChange={(e) => updateRow(idx, { unit: e.target.value })}
              placeholder="Unit"
            />

            <div className="text-sm text-gray-500">
              {lineCost > 0 ? `₪${lineCost.toFixed(2)}` : '-'}
            </div>

            <Button variant="ghost" size="icon" onClick={() => removeRow(idx)} className="text-red-600">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      })}

      <Button type="button" variant="outline" onClick={addRow} className="gap-2">
        <Plus className="w-4 h-4" /> Add ingredient
      </Button>
    </div>
  );
}