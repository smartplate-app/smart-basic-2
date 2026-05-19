import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader, Save } from "lucide-react";
import moment from "moment";

export default function TipsSimulator({ presetWorkers, schedules: propSchedules, positions: propPositions }) {
  const [workers, setWorkers] = useState(presetWorkers || []);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [cash, setCash] = useState(0);
  const [credit, setCredit] = useState(0);
  const [periodType, setPeriodType] = useState('day');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localPositions, setLocalPositions] = useState([]);

  const activePositions = propPositions || localPositions;

  const saveTips = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const isWeek = result.inputs.period_type !== 'day';
      const targetDate = result.inputs.period_date || date;

      const existing = await base44.entities.TipEntry.filter({
        date: targetDate,
        shift_type: "evening" // Simulator currently saves all as evening
      });

      if (existing && existing.length > 0) {
        const msg = isWeek 
          ? "כבר חושבו טיפים לשבוע זה (לפי תאריך תחילת שבוע). האם ברצונך להוסיף רשומה נוספת בכל זאת?"
          : "כבר חושבו טיפים למשמרת זו בתאריך הנבחר. האם ברצונך להוסיף רשומה נוספת בכל זאת?";
        if (!window.confirm(msg)) {
          setSaving(false);
          return;
        }
      }

      const total_tips = (result.inputs.cash_tips || 0) + (result.inputs.credit_tips || 0);
      const workersData = result.results.map(r => ({
        worker_id: r.worker_id,
        worker_name: r.worker_name,
        tip_amount: r.total,
        cash_tips: r.total_cash || 0,
        credit_tips: r.total_credit || 0,
        tip_percentage: total_tips > 0 ? (r.total / total_tips) * 100 : 0
      }));

      await base44.entities.TipEntry.create({
        date: targetDate,
        shift_type: "evening",
        total_tips: total_tips,
        cash_tips: result.inputs.cash_tips || 0,
        credit_tips: result.inputs.credit_tips || 0,
        workers: workersData,
        notes: `מדיניות: ${result.inputs.policy_name || 'ללא'} | ${isWeek ? 'חישוב שבועי' : 'חישוב יומי'}`
      });
      alert("הנתונים נשמרו בהצלחה!");
    } catch(err) {
      alert("שגיאה בשמירת נתונים: " + err.message);
    } finally {
      setSaving(false);
    }
  };

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

      let shifts = [];

      if (periodType === 'day') {
        const target = activeSchedules.find(s => {
          if (!s.week_start_date) return false;
          const start = new Date(s.week_start_date);
          const end = new Date(new Date(s.week_start_date).getTime() + 6 * 24 * 60 * 60 * 1000);
          const d = new Date(date);
          return d >= start && d <= end;
        });

        if (!target) {
          alert("לא נמצא סידור עבודה לשבוע של תאריך זה");
          setLoading(false);
          return;
        }
        shifts = (target?.shifts || []).filter(sh => sh.date === date);
      } else {
        let targetStart;
        if (periodType === 'current_week') {
          targetStart = moment().startOf('week').format('YYYY-MM-DD');
        } else if (periodType === 'last_week') {
          targetStart = moment().subtract(1, 'week').startOf('week').format('YYYY-MM-DD');
        }
        
        const target = activeSchedules.find(s => s.week_start_date === targetStart);
        if (!target) {
          alert("לא נמצא סידור עבודה לשבוע הנבחר");
          setLoading(false);
          return;
        }
        shifts = target?.shifts || [];
      }

      if (shifts.length === 0) {
        alert("לא נמצאו משמרות בסידור העבודה לתקופה שנבחרה");
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
      
      // Store period metadata for save context
      data.inputs.period_type = periodType;
      data.inputs.period_date = periodType === 'day' ? date : (periodType === 'current_week' ? moment().startOf('week').format('YYYY-MM-DD') : moment().subtract(1, 'week').startOf('week').format('YYYY-MM-DD'));
      
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <label className="text-sm text-gray-600">תקופת חישוב</label>
              <select className="w-full border rounded-md h-10 px-2" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
                <option value="day">יום ספציפי (מלוח שנה)</option>
                <option value="current_week">שבוע נוכחי</option>
                <option value="last_week">שבוע שעבר</option>
              </select>
            </div>
            {periodType === 'day' && (
              <div>
                <label className="text-sm text-gray-600">תאריך</label>
                <Input type="date" value={date} dir="ltr" className="w-full text-left" onChange={(e) => setDate(e.target.value)} />
              </div>
            )}
          </div>

          <p className="text-sm text-gray-500">
            {periodType === 'day' 
              ? 'השעות ייאספו אוטומטית מסידור העבודה ליום הנבחר לפי התפקידים המוגדרים.' 
              : 'השעות ייאספו ויסוכמו מכל סידור העבודה של השבוע הנבחר עבור כל עובד.'}
          </p>

          <Button onClick={run} className="bg-gray-900 hover:bg-gray-800" disabled={loading}>
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'חשב'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>תוצאות מפורטות</CardTitle>
              <div className="text-sm text-gray-500 mt-1">סה"כ שחולק: ₪{(result?.summary?.distributed_total || 0).toLocaleString()}</div>
            </div>
            <Button onClick={saveTips} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white gap-2">
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              שמור נתוני טיפים
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-right font-semibold">עובד</th>
                    <th className="p-2 text-right font-semibold">תפקיד</th>
                    <th className="p-2 text-right font-semibold">שעות</th>
                    <th className="p-2 text-right font-semibold">שיטה</th>
                    <th className="p-2 text-right font-semibold">מזומן</th>
                    <th className="p-2 text-right font-semibold">אשראי</th>
                    <th className="p-2 text-right font-bold text-gray-900">סה"כ</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results?.map((r) => (
                    <tr key={`${r.worker_id}_${r.job_position_id}`} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="p-2 font-medium">{r.worker_name}</td>
                      <td className="p-2 text-gray-600">{r.job_position_name || activePositions.find(p => p.id === r.job_position_id)?.name || ''}</td>
                      <td className="p-2 text-gray-600">{r.hours?.toFixed(2) || 0}</td>
                      <td className="p-2 text-xs text-gray-500">
                        {r.tips_method === 'fixed_hourly' ? `₪${r.hourly_rate} לשעה` : 
                         r.tips_method === 'percent_allocation' ? 'אחוזים' : 
                         r.tips_method === 'general_pool' ? 'קופה כללית' : 'ללא טיפים'}
                      </td>
                      <td className="p-2 text-gray-600">₪{(r.total_cash || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="p-2 text-gray-600">₪{(r.total_credit || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="p-2 font-bold text-green-700 bg-green-50/50">₪{(r.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
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