import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Clock, LogIn, Zap } from "lucide-react";

function getWeekStart() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

const ACTION_LABELS = {
  'הזמנה': '🛒 הזמנות',
  'קבלת אספקה': '📦 קבלות',
  'ספירת מלאי': '🏪 ספירות',
  'דיווח פחת': '🗑️ פחת',
};

export default function WorkerActivityStats({ ownerId, language }) {
  const isRTL = language === 'he';
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    loadSessions();
  }, [ownerId]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await base44.functions.invoke('workerPortalData', { ownerId, action: 'loadSessions' });
      setSessions(res.data?.sessions || []);
    } catch {}
    finally { setLoading(false); }
  };

  const weekStart = getWeekStart();
  const weekSessions = sessions.filter(s => s.login_at && new Date(s.login_at) >= weekStart);

  // Aggregate per worker
  const byWorker = {};
  weekSessions.forEach(s => {
    const name = s.worker_name || 'עובד';
    if (!byWorker[name]) byWorker[name] = { logins: 0, minutes: 0, subjects: {} };
    byWorker[name].logins++;
    byWorker[name].minutes += s.duration_minutes || 0;
    (s.actions || []).forEach(a => {
      const subj = a.subject || 'כללי';
      byWorker[name].subjects[subj] = (byWorker[name].subjects[subj] || 0) + 1;
    });
  });

  const workers = Object.entries(byWorker);

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
          <Zap className="w-5 h-5 text-amber-500" />
          {language === 'he' ? 'פעילות עובדים השבוע' : 'Worker Activity This Week'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : workers.length === 0 ? (
          <p className={`text-gray-400 text-center py-6 text-sm ${isRTL ? 'text-right' : ''}`}>
            {language === 'he' ? 'אין פעילות השבוע עדיין' : 'No activity this week yet'}
          </p>
        ) : (
          <div className="space-y-4">
            {workers.map(([name, data]) => (
              <div key={name} className={`p-4 bg-gray-50 rounded-xl border ${isRTL ? 'text-right' : ''}`}>
                <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="font-bold text-gray-800 text-base">👤 {name}</span>
                  <div className={`flex items-center gap-3 text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="flex items-center gap-1">
                      <LogIn className="w-3.5 h-3.5" />
                      {data.logins} {language === 'he' ? 'כניסות' : 'logins'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {data.minutes < 60
                        ? `${data.minutes} ${language === 'he' ? 'דק\'' : 'min'}`
                        : `${Math.round(data.minutes / 60 * 10) / 10} ${language === 'he' ? 'שע\'' : 'hrs'}`}
                    </span>
                  </div>
                </div>
                {Object.keys(data.subjects).length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : ''}`}>
                    {Object.entries(data.subjects).map(([subj, count]) => (
                      <span key={subj} className="bg-white border border-gray-200 text-gray-700 text-xs px-2.5 py-1 rounded-full font-medium">
                        {ACTION_LABELS[subj] || subj} ×{count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}