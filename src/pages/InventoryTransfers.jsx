import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, ArrowLeftRight, Loader } from "lucide-react";
import moment from "moment";

export default function InventoryTransfers() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState([]);
  const [items, setItems] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    from_store_id: "",
    to_store_id: "",
    transfer_date: moment().format("YYYY-MM-DD"),
    notes: "",
  });
  const [lines, setLines] = useState([]);
  const [newLine, setNewLine] = useState({ item_id: "", quantity: 1, unit_cost: 0 });

  const fromStore = useMemo(() => stores.find(s => s.id === form.from_store_id), [stores, form.from_store_id]);
  const toStore = useMemo(() => stores.find(s => s.id === form.to_store_id), [stores, form.to_store_id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const me = await base44.auth.me();
        setUser(me);

        // Load chain stores for this user (head can see all in chain)
        let chainId = me.chain_id;
        if (!chainId) {
          const chains = await base44.entities.Chain.filter({ head_store_user_email: me.email });
          if (chains?.length) chainId = chains[0].id;
        }
        const cs = chainId ? await base44.entities.ChainStore.filter({ chain_id: chainId }) : [];
        setStores(cs);

        // Load items (use head owner's items if available)
        const headEmail = (await base44.entities.Chain.filter({ id: chainId }))?.[0]?.head_store_user_email || me.email;
        const itemList = await base44.entities.Item.filter({ created_by: headEmail }, "name");
        setItems(itemList);

        // Recent transfers (this month)
        const month = moment().format("YYYY-MM");
        const tx = await base44.entities.InventoryTransfer.filter({ month }, "-created_date");
        setTransfers(tx?.slice(0, 20) || []);
      } catch (e) {
        setError(e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const addLine = () => {
    if (!newLine.item_id) return;
    const item = items.find(i => i.id === newLine.item_id);
    const unit_cost = newLine.unit_cost || item?.price_after_discount || item?.price || 0;
    const line = {
      item_id: item?.id,
      item_name: item?.name,
      supplier_name: item?.supplier_name || "",
      unit: item?.unit || "unit",
      quantity: Number(newLine.quantity) || 0,
      unit_cost: Number(unit_cost) || 0,
      total_cost: (Number(newLine.quantity) || 0) * (Number(unit_cost) || 0),
    };
    setLines(prev => [...prev, line]);
    setNewLine({ item_id: "", quantity: 1, unit_cost: 0 });
  };

  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx));

  const totalCost = useMemo(() => lines.reduce((s, l) => s + (l.total_cost || 0), 0), [lines]);

  const saveTransfer = async () => {
    if (!fromStore || !toStore) {
      alert("Please select From and To stores");
      return;
    }
    if (fromStore.id === toStore.id) {
      alert("From and To stores must be different");
      return;
    }
    if (lines.length === 0) {
      alert("Add at least one line item");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        chain_id: fromStore.chain_id,
        from_store_id: fromStore.id,
        from_store_name: fromStore.store_name,
        from_store_email: fromStore.user_email,
        to_store_id: toStore.id,
        to_store_name: toStore.store_name,
        to_store_email: toStore.user_email,
        transfer_date: form.transfer_date,
        month: moment(form.transfer_date).format("YYYY-MM"),
        items: lines,
        total_cost: totalCost,
        status: "completed",
        notes: form.notes || "",
      };
      const res = await base44.entities.InventoryTransfer.create(payload);
      setTransfers(prev => [res, ...prev]);
      setLines([]);
      alert("Transfer saved");
    } catch (e) {
      alert("Failed to save: " + (e?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <ArrowLeftRight className="w-6 h-6 text-purple-700" />
        <h1 className="text-3xl font-bold">Inventory Transfers</h1>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded">{error}</div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>New Transfer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>From Store</Label>
              <Select value={form.from_store_id} onValueChange={(v) => setForm({ ...form, from_store_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.store_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>To Store</Label>
              <Select value={form.to_store_id} onValueChange={(v) => setForm({ ...form, to_store_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.store_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.transfer_date} onChange={(e) => setForm({ ...form, transfer_date: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Add Item</Label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <Select value={newLine.item_id} onValueChange={(v) => setNewLine({ ...newLine, item_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {items.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input type="number" min="0" step="0.01" value={newLine.quantity}
                  onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })} />
              </div>
              <div>
                <Label>Unit Cost</Label>
                <Input type="number" min="0" step="0.01" value={newLine.unit_cost}
                  onChange={(e) => setNewLine({ ...newLine, unit_cost: e.target.value })} />
              </div>
              <div>
                <Button onClick={addLine} className="w-full"><Plus className="w-4 h-4 mr-2" /> Add</Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500">No items added</TableCell>
                  </TableRow>
                ) : (
                  lines.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{l.item_name}</TableCell>
                      <TableCell>{l.supplier_name || '-'}</TableCell>
                      <TableCell>{l.unit}</TableCell>
                      <TableCell className="text-right">{l.quantity}</TableCell>
                      <TableCell className="text-right">{l.unit_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{l.total_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-semibold">Total</TableCell>
                  <TableCell className="text-right font-bold">{totalCost.toFixed(2)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div>
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </div>

          <div className="flex justify-end">
            <Button onClick={saveTransfer} disabled={saving || lines.length === 0}>
              {saving ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
              Save Transfer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transfers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500">No transfers yet</TableCell>
                  </TableRow>
                ) : (
                  transfers.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{t.transfer_date}</TableCell>
                      <TableCell>{t.from_store_name}</TableCell>
                      <TableCell>{t.to_store_name}</TableCell>
                      <TableCell className="text-right">{t.items?.length || 0}</TableCell>
                      <TableCell className="text-right">{(t.total_cost || 0).toFixed(2)}</TableCell>
                      <TableCell>{t.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}