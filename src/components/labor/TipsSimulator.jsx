import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader } from "lucide-react";

export default function TipsSimulator({ presetWorkers, schedules: propSchedules, positions: propPositions }) {
  const [workers, setWorkers] = useState(presetWorkers || []);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [cash, setCash] = useState(0);
  const [credit, setCredit] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [localPositions, setLocalPositions] = useState([]);

  const activePositions = propPositions || localPositions;

  useEffect(() => {
    const load = async () => {
      const u = await base44.auth.me();
      const pol = await base44.entities.TipPolicy.list();
      
      if (!propPositions) {
        const pos = await base44.entities.JobPosition.filter({ created_by: u.acting_as_store_email || u.email }, 'name');
        setLocalPositions(pos || []);
      }
      
      setPolicies(pol || []);
      if (pol?.length && !selectedPolicy) setSelectedPolicy(pol[0].id);
    };
    load();
  }, [propPositions]);

  const run = async () => {
    setLoading(true);
    try {
      let activeSchedules = propSchedules;
      if (!activeSchedules || activeSchedules.length === 0) {
        const user = await base44.auth.me();
        let workingEmail = user.acting_as_store_email || user.email;
        let ownerEmail = user.store_user_owner_email || null;
        if (!ownerEmail) {
          try {
            const storeUserRecords = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
            if (storeUserRecords.length > 0) ownerEmail = storeUserRecords[0].owner_email || null;
          } catch (_) {}
        }
        if (ownerEmail) workingEmail = ownerEmail;
        
        activeSchedules = await base44.entities.WeeklySchedule.filter({ created_by: workingEmail });
      }

      // find schedule that contains the selected date
      const target = activeSchedules.find(s => {
        if (!s.week_start_date) return false;
        const start = new Date(s.week_start_date);
        const end = new Date(new Date(s.week_start_date).getTime() + 6 * 24 * 60 * 60 * 1000);
        const d = new Date(date);
        return d >= start && d <= end;
      });

      if (!target) {
        alert("לא נמצא סידור עבודה לתאריך זה");
        setLoading(false);
        return;
      }

      const shifts = (target?.shifts || []).filter(sh => sh.date === date);

      if (shifts.length === 0) {
        alert("לא נמצאו משמרות לתאריך זה בסידור העבודה");
        setLoading(false);
        return;
      }

      const byWorker = new Map();
      for (const sh of shifts) {
        const wid = sh.worker_id;
        const posId = sh.job_position_id || 'default';
        if (!wid) continue;
        const hrs = typeof sh.hours_worked === 'number' && sh.hours_worked > 0
          ? sh.hours_worked
          : (() => {
              if (!sh.start_time || !sh.end_time) return 0;
              const [shh, sm] = String(sh.start_time).split(":").map(Number);
              const [eh, em] = String(sh.end_time).split(":").map(Number);
              return ((eh * 60 + em) - (shh * 60 + sm)) / 60;
            })();
        if (hrs <= 0) continue;
        
        const key = `${wid}_${posId}`;
        const prev = byWorker.get(key) || { worker_id: wid, hours: 0, job_position_id: sh.job_position_id };
        prev.hours += hrs;
        byWorker.set(key, prev);
      }

      const workersPayload = Array.from(byWorker.values());

      const payload = {
        cash_tips: Number(cash) || 0,
        credit_tips: Number(credit) || 0,
        policy_id: selectedPolicy || null,
        workers: workersPayload
      };
      const { data } = await base44.functions.invoke('calculateTips', payload);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("שגיאה בחישוב הטיפים: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>חישוב טיפים לפי סידור</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-gray-600">טיפ מזומן</label>
              <Input type="number" value={cash === 0 || cash === "0" ? "" : cash} placeholder="0" onChange={(e) => setCash(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">טיפ אשראי</label>
              <Input type="number" value={credit === 0 || credit === "0" ? "" : credit} placeholder="0" onChange={(e) => setCredit(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">מדיניות</label>
              <select className="w-full border rounded-md h-10 px-2" value={selectedPolicy} onChange={(e) => setSelectedPolicy(e.target.value)}>
                <option value="">ללא</option>
                {policies.map(p => (
                  <option key={p.id} value={p.id}>{p.policy_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600">תאריך משמרת</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <p className="text-sm text-gray-500">השעות ייאספו אוטומטית מסידור העבודה ליום הנבחר לפי התפקידים המוגדרים.</p>

          <Button onClick={run} className="bg-gray-900 hover:bg-gray-800" disabled={loading}>
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'חשב'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>תוצאות</CardTitle>
            <div className="text-sm text-gray-500">סה"כ שחולק: ₪{(result?.summary?.distributed_total || 0).toLocaleString()}</div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-right">עובד</th>
                    <th className="p-2 text-right">תפקיד</th>
                    <th className="p-2 text-right">סה"כ</th>
                    <th className="p-2 text-right">מזומן</th>
                    <th className="p-2 text-right">אשראי</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results?.map((r) => (
                    <tr key={r.worker_id} className="border-b">
                      <td className="p-2">{r.worker_name}</td>
                      <td className="p-2">{r.job_position_name || activePositions.find(p => p.id === r.job_position_id)?.name || ''}</td>
                      <td className="p-2">₪{(r.total || 0).toLocaleString()}</td>
                      <td className="p-2">₪{(r.total_cash || 0).toLocaleString()}</td>
                      <td className="p-2">₪{(r.total_credit || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}