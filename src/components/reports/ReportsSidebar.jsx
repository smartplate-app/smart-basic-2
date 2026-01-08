import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import COGSReport from "./COGSReport";
import ConsumptionReport from "./ConsumptionReport";
import RecipesReport from "./RecipesReport";

function rangeToDates(range) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const last30 = new Date(now); last30.setDate(now.getDate() - 29);
  const fmt = (d) => d.toISOString().slice(0,10);
  if (range === 'last_month') return { from: fmt(lastMonthStart), to: fmt(lastMonthEnd) };
  if (range === 'last_30') return { from: fmt(last30), to: fmt(now) };
  return { from: fmt(startOfMonth), to: fmt(endOfMonth) };
}

export default function ReportsSidebar({ open, onClose }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('reports_unlocked') === '1');
  const [code, setCode] = useState("");
  const [tab, setTab] = useState("cogs");
  const [range, setRange] = useState('this_month');
  const { from, to } = useMemo(() => rangeToDates(range), [range]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute top-0 right-0 h-full w-[92vw] max-w-[860px] bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="font-bold text-lg">Reports</div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        {!unlocked ? (
          <div className="p-6 space-y-3">
            <p className="text-sm text-gray-600">This section is protected. Enter access code.</p>
            <div className="flex gap-2 max-w-xs">
              <Input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" />
              <Button onClick={() => { if (code === '2233') { sessionStorage.setItem('reports_unlocked','1'); setUnlocked(true); } else { alert('Incorrect code'); } }}>Unlock</Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="border-b px-4 py-3 flex items-center gap-2">
              <select value={range} onChange={(e)=>setRange(e.target.value)} className="h-9 border rounded px-2 text-sm">
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_30">Last 30 Days</option>
              </select>
              <div className="text-xs text-gray-500">{from} → {to}</div>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
              <div className="px-4 pt-3">
                <TabsList>
                  <TabsTrigger value="cogs">COGS</TabsTrigger>
                  <TabsTrigger value="con">Consumption</TabsTrigger>
                  <TabsTrigger value="recipes">Recipes</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <TabsContent value="cogs" className="m-0"><COGSReport from={from} to={to} /></TabsContent>
                <TabsContent value="con" className="m-0"><ConsumptionReport from={from} to={to} /></TabsContent>
                <TabsContent value="recipes" className="m-0"><RecipesReport /></TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}