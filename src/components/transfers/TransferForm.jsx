import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const units = [
  { value: "unit", label: "Unit" },
  { value: "kg", label: "Kg" },
  { value: "liter", label: "Liter" },
  { value: "case", label: "Case" },
];

export default function TransferForm({ stores, currentStoreEmail, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    transfer_date: new Date().toISOString().slice(0, 10),
    to_store_email: "",
    notes: "",
  });
  const [items, setItems] = useState([
    { item_name: "", unit: "unit", quantity: 1, unit_price: 0 }
  ]);

  const availableStores = useMemo(() => (stores || []).filter(s => s.user_email !== currentStoreEmail), [stores, currentStoreEmail]);

  const addRow = () => setItems(prev => [...prev, { item_name: "", unit: "unit", quantity: 1, unit_price: 0 }]);
  const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateRow = (idx, field, value) => {
    setItems(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const total = items.reduce((sum, r) => sum + (Number(r.quantity || 0) * Number(r.unit_price || 0)), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.to_store_email) return alert("Select destination store");
    if (items.length === 0 || items.some(i => !i.item_name || !i.quantity)) return alert("Fill item names and quantities");

    const toStore = (stores || []).find(s => s.user_email === form.to_store_email);

    onSubmit({
      ...form,
      items: items.map(i => ({
        ...i,
        quantity: Number(i.quantity || 0),
        unit_price: Number(i.unit_price || 0),
        total_value: Number(i.quantity || 0) * Number(i.unit_price || 0)
      })),
      to_store_name: toStore?.store_name || toStore?.storeName || "",
      total_value: total,
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.transfer_date}
                     onChange={(e) => setForm({ ...form, transfer_date: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Destination Store</Label>
              <Select value={form.to_store_email} onValueChange={(v) => setForm({ ...form, to_store_email: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose store" />
                </SelectTrigger>
                <SelectContent>
                  {availableStores.map(s => (
                    <SelectItem key={s.id} value={s.user_email}>
                      {s.store_name || s.storeName || s.user_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus className="w-4 h-4 mr-2" /> Add Row
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Label className="text-xs">Item</Label>
                    <Input value={row.item_name} onChange={(e) => updateRow(idx, 'item_name', e.target.value)} placeholder="Name" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Unit</Label>
                    <Select value={row.unit} onValueChange={(v) => updateRow(idx, 'unit', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {units.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min="0" step="0.01" value={row.quantity}
                           onChange={(e) => updateRow(idx, 'quantity', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input type="number" min="0" step="0.01" value={row.unit_price}
                           onChange={(e) => updateRow(idx, 'unit_price', e.target.value)} />
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(idx)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-right font-semibold">Total: {total.toFixed(2)}</div>
          </div>

          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" className="bg-gray-900 hover:bg-gray-800">Create Transfer</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}