import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { Loader } from "lucide-react";

function formatCurrency(n) {
  try { return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n || 0); } catch { return `₪${Math.round(n || 0).toLocaleString()}`; }
}

export default function ConsumptionReport({ from, to }) {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState([]);
  const [counts, setCounts] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [r, c] = await Promise.all([
          base44.entities.SupplyReceipt.list(),
          base44.entities.InventoryCount.list(),
        ]);
        if (!mounted) return;
        setReceipts(Array.isArray(r) ? r : []);
        setCounts(Array.isArray(c) ? c : []);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [from, to]);

  const data = useMemo(() => {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const inRange = (d) => {
      if (!d) return false;
      const dt = new Date(d);
      return dt >= fromDate && dt <= toDate;
    };

    const purchases = receipts.filter(r => inRange(r.received_date));
    const purchasesTotal = purchases.reduce((sum, r) => sum + (Number(r.invoice_total) || 0), 0);

    const openingCandidates = counts.filter(c => c.count_date && new Date(c.count_date) <= fromDate);
    const closingCandidates = counts.filter(c => c.count_date && new Date(c.count_date) <= toDate);

    const latestByDate = (arr) => arr.sort((a,b) => new Date(b.count_date) - new Date(a.count_date))[0];
    const opening = latestByDate(openingCandidates);
    const closing = latestByDate(closingCandidates);

    const openingValue = Number(opening?.total_inventory_value) || 0;
    const closingValue = Number(closing?.total_inventory_value) || 0;

    const consumption = openingValue + purchasesTotal - closingValue; // CON
    const days = Math.max(1, Math.ceil((toDate - fromDate) / (1000*60*60*24)));
    const avgPerDay = consumption / days;

    return { openingValue, purchasesTotal, closingValue, consumption, avgPerDay, days };
  }, [receipts, counts, from, to]);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Card><CardHeader className="py-3"><CardTitle className="text-sm">Opening</CardTitle></CardHeader><CardContent className="pt-0 text-2xl font-bold">{formatCurrency(data.openingValue)}</CardContent></Card>
      <Card><CardHeader className="py-3"><CardTitle className="text-sm">Purchases</CardTitle></CardHeader><CardContent className="pt-0 text-2xl font-bold">{formatCurrency(data.purchasesTotal)}</CardContent></Card>
      <Card><CardHeader className="py-3"><CardTitle className="text-sm">Closing</CardTitle></CardHeader><CardContent className="pt-0 text-2xl font-bold">{formatCurrency(data.closingValue)}</CardContent></Card>
      <Card className="md:col-span-3"><CardHeader className="py-3"><CardTitle className="text-sm">Consumption (Opening + Purchases − Closing)</CardTitle></CardHeader><CardContent className="pt-0 text-3xl font-extrabold text-purple-700">{formatCurrency(data.consumption)} <span className="ml-2 text-sm text-gray-500">({data.days} days • {formatCurrency(data.avgPerDay)}/day)</span></CardContent></Card>
    </div>
  );
}