import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader } from "lucide-react";
import { base44 } from "@/api/base44Client";
import moment from "moment";

export default function MonthlyCogsReport() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [preps, setPreps] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [month, setMonth] = useState(moment().format('YYYY-MM'));
  const [qtyById, setQtyById] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [its, ps, rs] = await Promise.all([
          base44.entities.Item.list(),
          base44.entities.Prep.list(),
          base44.entities.Recipe.list()
        ]);
        setItems(its);
        setPreps(ps);
        setRecipes(rs);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const prepCostPerUnit = (prep) => {
    if (!prep) return 0;
    const total = (prep.ingredients || []).reduce((sum, ing) => {
      const it = items.find((x) => String(x.id) === String(ing.item_id));
      const price = it ? (it.price_after_discount ?? it.price ?? 0) : 0;
      return sum + (Number(ing.quantity) || 0) * price;
    }, 0);
    const y = Number(prep.yield_quantity) || 1;
    return y > 0 ? total / y : 0;
  };

  const recipeCostPerPortion = useMemo(() => {
    const map = new Map();
    recipes.forEach((r) => {
      const total = (r.ingredients || []).reduce((sum, ing) => {
        if (ing.type === 'prep') {
          const p = preps.find((x) => String(x.id) === String(ing.prep_id));
          return sum + prepCostPerUnit(p) * (Number(ing.quantity) || 0);
        }
        const it = items.find((x) => String(x.id) === String(ing.item_id));
        const price = it ? (it.price_after_discount ?? it.price ?? 0) : 0;
        return sum + price * (Number(ing.quantity) || 0);
      }, 0);
      const y = Number(r.yield_quantity) || 1;
      map.set(r.id, y > 0 ? total / y : 0);
    });
    return map;
  }, [recipes, preps, items]);

  const rows = recipes.map((r) => {
    const cpu = recipeCostPerPortion.get(r.id) || 0;
    const qty = Number(qtyById[r.id] || 0);
    return { id: r.id, name: r.name, cpu, qty, total: cpu * qty };
  });

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32"><Loader className="w-5 h-5 animate-spin" /></div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Monthly COGS by POS Recipe</h3>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-40 cursor-pointer px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
        >
          {Array.from({ length: 12 }, (_, i) => {
            const d = moment().subtract(i, 'months');
            const v = d.format('YYYY-MM');
            return <option key={v} value={v}>{v}</option>;
          })}
        </select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enter sold quantities for {month}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-gray-500">No POS recipes yet.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-left py-2 pr-3">Recipe</th>
                    <th className="text-right py-2 px-3">Cost/portion</th>
                    <th className="text-right py-2 px-3">Qty sold</th>
                    <th className="text-right py-2 pl-3">Total cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 px-3 text-right">₪{r.cpu.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right">
                        <Input
                          type="number"
                          value={qtyById[r.id] || ''}
                          onChange={(e) => setQtyById((m) => ({ ...m, [r.id]: e.target.value }))}
                          className="w-24 text-right"
                          placeholder="0"
                        />
                      </td>
                      <td className="py-2 pl-3 text-right font-semibold">₪{r.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-3 text-right font-semibold">Grand total</td>
                    <td className="py-3 text-right font-bold">₪{grandTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}