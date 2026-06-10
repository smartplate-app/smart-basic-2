import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import WasteReportForm from "../components/waste/WasteReportForm";
import DailySummaryTab from "../components/waste/DailySummaryTab";
import { Plus, Trash2, Pencil, ListChecks } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

export default function WasteReports() {
  const [warehouses, setWarehouses] = useState([]);
  const [items, setItems] = useState([]);
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const isHE = language === 'he';

  const loadAll = async () => {
    setLoading(true);
    let currentUser;
    try { currentUser = await base44.auth.me(); } catch(e){}
    
    let whData = [];
    let itsData = [];
    let repsData = [];

    const isAdminControlling = !!(currentUser?.admin_original_email && currentUser?.acting_as_user_email);
    const ownerEmail = currentUser?.acting_as_store_email || currentUser?.store_user_owner_email;
    const isStoreUser = !!ownerEmail;
    let targetEmail = ownerEmail || currentUser?.acting_as_user_email || currentUser?.email;
    
    if (isAdminControlling) {
        try {
            const { data } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: targetEmail });
            if (data?.success) {
                whData = data.data.warehouses || [];
                itsData = data.data.items || [];
                repsData = data.data.wasteReports || [];
            }
        } catch(e) {}
    } else if (isStoreUser) {
        const { data: mgData } = await base44.functions.invoke('getManagerData', {
          ownerEmail,
          entities: ['warehouses', 'items', 'wasteReports']
        });
        if (mgData?.data) {
          whData = mgData.data.warehouses || [];
          itsData = mgData.data.items || [];
          repsData = mgData.data.wasteReports || [];
        }
    } else {
        const [wh, its, reps] = await Promise.all([
          base44.entities.Warehouse.filter({ $or: [{ created_by: targetEmail }, { store_owner_email: targetEmail }] }),
          base44.entities.Item.filter({ $or: [{ created_by: targetEmail }, { store_owner_email: targetEmail }] }),
          base44.entities.WasteReport.filter({ $or: [{ created_by: targetEmail }, { store_owner_email: targetEmail }] })
        ]);
        whData = wh;
        itsData = its;
        repsData = reps;
    }
    
    setWarehouses(whData);
    setItems(itsData);
    setReports(repsData.sort((a,b)=> (b.report_date||'').localeCompare(a.report_date||'')));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex gap-2">
          <Button variant={!showForm ? 'default' : 'outline'} onClick={()=>setShowForm(false)}>{isHE ? 'סיכום יומי' : 'Daily Summary'}</Button>
          <Button variant={showForm ? 'default' : 'outline'} onClick={()=>setShowForm(true)}>{isHE ? 'דוח חדש' : 'New Report'}</Button>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{isHE ? 'דיווח זריקות' : 'Waste Reports'}</h1>
        </div>

        {showForm ? (
          <WasteReportForm
            warehouses={warehouses}
            items={items}
            report={showForm?.edit ? showForm.report : null}
            onCancel={()=>setShowForm(false)}
            onSaved={()=>{ setShowForm(false); loadAll(); }}
          />
        ) : (
          <DailySummaryTab />
        )}

        <Card>
          <CardHeader>
            <CardTitle>{isHE ? 'דוחות אחרונים' : 'Recent Reports'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-gray-500">{isHE ? 'טוען...' : 'Loading...'}</div>
            ) : reports.length === 0 ? (
              <div className="text-gray-500">{isHE ? 'אין עדיין דוחות.' : 'No reports yet.'}</div>
            ) : (
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="p-3 rounded-lg border flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.warehouse_name} • {r.report_date} • {r.shift}</div>
                      <div className="text-sm text-gray-600">{r.items?.length || 0} {isHE ? 'פריטים' : 'items'} • {isHE ? 'סה"כ' : 'Total'} {Number(r.total_waste_value||0).toFixed(2)}</div>
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
                        <Pencil className="w-3 h-3"/> {isHE ? 'עריכה' : 'Edit'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async ()=>{
                          if (!confirm(isHE ? 'למחוק את הדוח?' : 'Delete this report?')) return;
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