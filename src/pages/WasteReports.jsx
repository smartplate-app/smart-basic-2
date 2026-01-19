import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WasteReportForm from "../components/waste/WasteReportForm";
import DailySummaryTab from "../components/waste/DailySummaryTab";
import { Plus, Trash2, Pencil, ListChecks } from "lucide-react";

export default function WasteReports() {
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [wh, its, reps] = await Promise.all([
      base44.entities.Warehouse.list(),
      base44.entities.Item.list(),
      base44.entities.WasteReport.list()
    ]);
    setWarehouses(wh);
    setItems(its);
    setReports(reps.sort((a,b)=> (b.report_date||'').localeCompare(a.report_date||'')));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex gap-2">
          <Button variant={!showForm ? 'default' : 'outline'} onClick={()=>setShowForm(false)}>Daily Summary</Button>
          <Button variant={showForm ? 'default' : 'outline'} onClick={()=>setShowForm(true)}>New Report</Button>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Waste Reports</h1>
          <Button onClick={()=>setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 gap-2"><Plus className="w-4 h-4"/> New Report</Button>
        </div>

        {showForm && (
          <WasteReportForm
            warehouses={warehouses}
            items={items}
            report={showForm?.edit ? showForm.report : null}
            onCancel={()=>setShowForm(false)}
            onSaved={()=>{ setShowForm(false); loadAll(); }}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : reports.length === 0 ? (
              <div className="text-gray-500">No reports yet.</div>
            ) : (
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="p-3 rounded-lg border flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.warehouse_name} • {r.report_date} • {r.shift}</div>
                      <div className="text-sm text-gray-600">{r.items?.length || 0} items • Total {Number(r.total_waste_value||0).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{(r.items||[]).slice(0,3).map(i=>i.item_name).join(', ')}{(r.items||[]).length>3?'…':''}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={()=>{
                          setShowForm({ edit: true, report: r });
                        }}
                      >
                        <Pencil className="w-3 h-3"/> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async ()=>{
                          if (!confirm('Delete this report?')) return;
                          await base44.entities.WasteReport.delete(r.id);
                          setReports(reports.filter(x=>x.id!==r.id));
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600"/>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}