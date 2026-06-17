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
  const [shiftFilter, setShiftFilter] = useState('all');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localPositions, setLocalPositions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const activePositions = propPositions || localPositions;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const targetDate = periodType === 'day' ? date : (periodType === 'current_week' ? moment().startOf('week').format('YYYY-MM-DD') : moment().subtract(1, 'week').startOf('week').format('YYYY-MM-DD'));
        const existing = await base44.entities.TipEntry.filter({ date: targetDate });
        setHistory(existing || []);
      } catch(e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [date, periodType]);

  const toggleLock = async (entry) => {
    try {
      const newStatus = entry.status === 'locked' ? 'saved' : 'locked';
      await base44.entities.TipEntry.update(entry.id, { status: newStatus });
      setHistory(prev => prev.map(h => h.id === entry.id ? { ...h, status: newStatus } : h));
    } catch(e) {
      alert("שגיאה בשינוי מצב רשומה: " + e.message);
    }
  };

  const deleteEntry = async (entry) => {
    if (!window.confirm("האם למחוק רשומה זו?")) return;
    try {
      await base44.entities.TipEntry.delete(entry.id);
      setHistory(prev => prev.filter(h => h.id !== entry.id));
    } catch(e) {
      alert("שגיאה במחיקת רשומה: " + e.message);
    }
  };

  const saveTips = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const isWeek = result.inputs.period_type !== 'day';
      const targetDate = result.inputs.period_date || date;
      const shiftFilterVal = result.inputs.shift_filter || 'all';
      
      let dbShiftType = "evening";
      if (!isWeek && shiftFilterVal === "morning") dbShiftType = "morning";
      if (!isWeek && shiftFilterVal === "afternoon") dbShiftType = "morning"; // Afternoon falls back to morning enum or evening. Let's use morning. Actually evening is default.
      if (!isWeek && shiftFilterVal === "night") dbShiftType = "night";

      const existing = await base44.entities.TipEntry.filter({
        date: targetDate,
        shift_type: dbShiftType
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

      const shiftFilterNameHeb = shiftFilterVal === 'morning' ? 'בוקר' : shiftFilterVal === 'afternoon' ? 'צהריים' : shiftFilterVal === 'evening' ? 'ערב' : 'לילה';

      await base44.entities.TipEntry.create({
        date: targetDate,
        shift_type: dbShiftType,
        total_tips: total_tips,
        cash_tips: result.inputs.cash_tips || 0,
        credit_tips: result.inputs.credit_tips || 0,
        workers: workersData,
        notes: `מדיניות: ${result.inputs.policy_name || 'ללא'} | ${isWeek ? 'חישוב שבועי' : `חישוב יומי - ${shiftFilterVal === 'all' ? 'כל היום' : shiftFilterNameHeb}`}`
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

      if (periodType === 'day' && shiftFilter !== 'all') {
        shifts = shifts.filter(sh => {
          if (!sh.start_time) return false;
          const hr = parseInt(sh.start_time.split(':')[0], 10);
          if (shiftFilter === 'morning') return hr >= 4 && hr < 12;
          if (shiftFilter === 'afternoon') return hr >= 12 && hr < 17;
          if (shiftFilter === 'evening') return hr >= 17 || hr < 4;
          return true;
        });
      }

      if (shifts.length === 0) {
        alert("לא נמצאו משמרות בסידור העבודה לתקופה/משמרת שנבחרה");
        setLoading(false);
        return;
      }

      const byWorker = new Map();
      for (const sh of shifts) {
        const wid = sh.worker_id;
        const posId = sh.job_position_id || 'default';
        if (!wid) continue;
        
        // Use actual hours if set, otherwise fallback to planned
        const targetHours = sh.actual_hours_worked != null ? sh.actual_hours_worked : sh.hours_worked;
        const targetStart = sh.actual_start_time || sh.start_time;
        const targetEnd = sh.actual_end_time || sh.end_time;
        
        const hrs = typeof targetHours === 'number' && targetHours > 0
          ? targetHours
          : (() => {
              if (!targetStart || !targetEnd) return 0;
              const [shh, sm] = String(targetStart).split(":").map(Number);
              const [eh, em] = String(targetEnd).split(":").map(Number);
              let diff = ((eh * 60 + em) - (shh * 60 + sm)) / 60;
              if (diff < 0) diff += 24; // Cross-midnight fix
              return diff;
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
      data.inputs.shift_filter = shiftFilter;
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
              <label className="text-sm text-gray-600">תאריך</label>
              <Input type="date" value={date} dir="ltr" className="w-full text-left" onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-600">סינון משמרת</label>
              <select className="w-full border rounded-md h-10 px-2" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
                <option value="all">כל היום</option>
                <option value="morning">משמרת בוקר</option>
                <option value="afternoon">משמרת צהריים</option>
                <option value="evening">משמרת ערב/לילה</option>
              </select>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            {shiftFilter === 'all' 
                 ? 'השעות ייאספו אוטומטית מכלל משמרות היום בסידור העבודה לתאריך הנבחר.' 
                 : `השעות ייאספו אך ורק מהמשמרות המוגדרות כ${shiftFilter === 'morning' ? 'בוקר' : shiftFilter === 'afternoon' ? 'צהריים' : 'ערב'} באותו תאריך בסידור העבודה.`}
          </p>

          <Button onClick={run} className="bg-gray-900 hover:bg-gray-800" disabled={loading}>
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'חשב'}
          </Button>
        </CardContent>
      </Card>

      {loadingHistory ? (
        <div className="flex justify-center p-4"><Loader className="animate-spin text-gray-500" /></div>
      ) : history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>היסטוריית חישובים לתאריך זה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {history.map(h => (
              <div key={h.id} className="border p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50">
                <div>
                  <div className="font-semibold text-lg flex items-center gap-2">
                    סה״כ חולק: ₪{h.total_tips?.toLocaleString()} 
                    {h.status === 'locked' && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded">נעול לשכר</span>}
                    {h.status !== 'locked' && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">טיוטה שמורה</span>}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    משמרת: {h.shift_type === 'morning' ? 'בוקר' : h.shift_type === 'evening' ? 'ערב' : 'לילה'} | 
                    מזומן: ₪{h.cash_tips} | אשראי: ₪{h.credit_tips}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{h.notes}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleLock(h)}>
                    {h.status === 'locked' ? 'שחרר נעילה' : 'נעל לשכר'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteEntry(h)}>
                    מחק
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                תוצאות מפורטות 
                {result.inputs.period_type === 'day' && result.inputs.shift_filter !== 'all' && (
                  <span className="mr-2 text-purple-600">
                    ({result.inputs.shift_filter === 'morning' ? 'משמרת בוקר' : result.inputs.shift_filter === 'afternoon' ? 'משמרת צהריים' : 'משמרת ערב'})
                  </span>
                )}
              </CardTitle>
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