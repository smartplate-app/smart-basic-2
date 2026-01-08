import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import IngredientRows from "./IngredientRows";
import { base44 } from "@/api/base44Client";
import { Loader, Save, PlusCircle } from "lucide-react";

export default function RecipeManager({ entityName = "Recipe", title = "Recipes" }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  const [yieldQty, setYieldQty] = useState(1);
  const [yieldUnit, setYieldUnit] = useState("portion");
  const [posSku, setPosSku] = useState("");
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const prepsPromise = entityName === "Recipe" ? base44.entities.Prep.list() : Promise.resolve([]);
        const [its, recs, ps] = await Promise.all([
          base44.entities.Item.list(),
          base44.entities[entityName].list(),
          prepsPromise
        ]);
        setItems(its);
        setList(recs);
        setPreps(ps);
      } finally {
        setLoading(false);
      }
    })();
  }, [entityName]);

  const totalCost = useMemo(() => {
    const prepCostPerUnit = (prep) => {
      if (!prep) return 0;
      const total = (prep.ingredients || []).reduce((s, ing) => {
        const it = items.find((x) => x.id === ing.item_id);
        const price = it ? (it.price_after_discount ?? it.price ?? 0) : 0;
        const qty = Number(ing.quantity) || 0;
        return s + price * qty;
      }, 0);
      const y = Number(prep.yield_quantity) || 1;
      return y > 0 ? total / y : 0;
    };
    return rows.reduce((sum, r) => {
      if (r.type === 'prep') {
        const p = preps.find((x) => x.id === r.prep_id);
        return sum + prepCostPerUnit(p) * (Number(r.quantity) || 0);
      }
      const it = items.find((x) => x.id === r.item_id);
      const price = it ? (it.price_after_discount ?? it.price ?? 0) : 0;
      const qty = Number(r.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [rows, items, preps]);

  const costPerUnit = useMemo(() => {
    const y = Number(yieldQty) || 0;
    return y > 0 ? totalCost / y : 0;
  }, [totalCost, yieldQty]);

  const resetForm = () => {
    setName("");
    setYieldQty(1);
    setYieldUnit(entityName === "Prep" ? "kg" : "portion");
    setPosSku("");
    setRows([]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        yield_quantity: Number(yieldQty) || 1,
        yield_unit: yieldUnit,
        ingredients: rows.map((r) => (
          r.type === 'prep'
            ? { type: 'prep', prep_id: r.prep_id, prep_name: r.prep_name, quantity: Number(r.quantity) || 0, unit: r.unit || '' }
            : { type: 'item', item_id: r.item_id, item_name: r.item_name, quantity: Number(r.quantity) || 0, unit: r.unit || '' }
        )),
        ...(entityName === 'Recipe' && posSku ? { pos_sku: posSku } : {})
      };
      await base44.entities[entityName].create(payload);
      const refreshed = await base44.entities[entityName].list();
      setList(refreshed);
      resetForm();
      alert(`${title.slice(0, -1)} saved`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32"><Loader className="w-5 h-5 animate-spin" /></div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> New {title.slice(0, -1)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Name of ${title.slice(0, -1).toLowerCase()}`} />
            <Input type="number" value={yieldQty} onChange={(e) => setYieldQty(e.target.value)} placeholder="Yield quantity" />
            <Input value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)} placeholder="Yield unit" />
          </div>
          {entityName === 'Recipe' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <Input value={posSku} onChange={(e) => setPosSku(e.target.value)} placeholder="POS SKU (optional)" />
            </div>
          )}

          <IngredientRows items={items} preps={preps} rows={rows} setRows={setRows} allowPreps={entityName === 'Recipe'} />

          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>Total cost: ₪{totalCost.toFixed(2)}</div>
            <div>Cost per {yieldUnit || 'unit'}: ₪{costPerUnit.toFixed(2)}</div>
          </div>

          <Button onClick={save} disabled={saving || !name || rows.length === 0} className="bg-gray-900 hover:bg-gray-800">
            {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <div className="text-gray-500 text-sm">No {title.toLowerCase()} yet.</div>
          ) : (
            <div className="space-y-3">
              {list.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-sm text-gray-600">Yield: {r.yield_quantity} {r.yield_unit}</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {r.ingredients?.length || 0} ingredients
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}