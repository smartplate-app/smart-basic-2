import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader } from "lucide-react";
import { base44 } from "@/api/base44Client";

function formatCurrency(n) {
  try { return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n || 0); } catch { return `₪${Math.round(n || 0).toLocaleString()}`; }
}

export default function COGSReport({ from, to }) {
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
      } finally {
        if (mounted) setLoading(false);
      }
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

    const cogs = openingValue + purchasesTotal - closingValue;

    const supplierMap = new Map();
    purchases.forEach(p => {
      const key = p.supplier_name || 'Unknown';
      supplierMap.set(key, (supplierMap.get(key) || 0) + (Number(p.invoice_total) || 0));
    });
    const supplierRows = Array.from(supplierMap.entries()).sort((a,b) => b[1] - a[1]).map(([name, total]) => ({ name, total }));

    return { openingValue, purchasesTotal, closingValue, cogs, supplierRows };
  }, [receipts, counts, from, to]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12"><Loader className="w-6 h-6 animate-spin text-blue-600" /></div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardHeader className="py-3"><CardTitle className="text-sm">Opening Inv.</CardTitle></CardHeader><CardContent className="pt-0 text-2xl font-bold">{formatCurrency(data.openingValue)}</CardContent></Card>
        <Card><CardHeader className="py-3"><CardTitle className="text-sm">Purchases</CardTitle></CardHeader><CardContent className="pt-0 text-2xl font-bold">{formatCurrency(data.purchasesTotal)}</CardContent></Card>
        <Card><CardHeader className="py-3"><CardTitle className="text-sm">Closing Inv.</CardTitle></CardHeader><CardContent className="pt-0 text-2xl font-bold">{formatCurrency(data.closingValue)}</CardContent></Card>
        <Card><CardHeader className="py-3"><CardTitle className="text-sm">COGS</CardTitle></CardHeader><CardContent className="pt-0 text-2xl font-bold text-blue-700">{formatCurrency(data.cogs)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Purchases by Supplier</CardTitle></CardHeader>
        <CardContent>
          {data.supplierRows.length === 0 ? (
            <p className="text-sm text-gray-500">No purchases in range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.supplierRows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}