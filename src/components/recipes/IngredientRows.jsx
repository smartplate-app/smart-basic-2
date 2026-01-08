import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

export default function IngredientRows({ items, rows, setRows }) {
  const addRow = () => setRows([...rows, { item_id: "", item_name: "", quantity: 1, unit: "unit" }]);
  const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));
  const updateRow = (idx, patch) => setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((row, idx) => {
        const selectedItem = items.find((it) => it.id === row.item_id);
        return (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
            <Select
              value={row.item_id || undefined}
              onValueChange={(v) => {
                const it = items.find((x) => x.id === v);
                updateRow(idx, { item_id: v, item_name: it?.name || "" });
              }}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select item" /></SelectTrigger>
              <SelectContent className="max-h-64 overflow-auto">
                {items.map((it) => (
                  <SelectItem key={it.id} value={String(it.id)}>
                    {it.name} {it.unit ? `· ${it.unit}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              value={row.quantity}
              onChange={(e) => updateRow(idx, { quantity: parseFloat(e.target.value) || 0 })}
              placeholder="Qty"
            />

            <Input
              value={row.unit || ""}
              onChange={(e) => updateRow(idx, { unit: e.target.value })}
              placeholder="Unit"
            />

            <div className="text-sm text-gray-500">
              {selectedItem ? `₪${(((selectedItem.price_after_discount ?? selectedItem.price ?? 0) * (row.quantity || 0))).toFixed(2)}` : "-"}
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