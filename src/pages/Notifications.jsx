import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RuleForm from '../components/notifications/RuleForm';
import { Loader, Bell, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../components/LanguageProvider';

export default function Notifications() {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const t = (he, en) => (language === 'he' ? he : en);

  const [user, setUser] = useState(null);
  const [rules, setRules] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [running, setRunning] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const u = await base44.auth.me();
    setUser(u);
    const workingEmail = u.acting_as_store_email || u.acting_as_user_email || u.email;
    const [r, n] = await Promise.all([
      base44.entities.NotificationRule.filter({ created_by: workingEmail }),
      base44.entities.Notification.filter({ user_email: workingEmail }, '-created_date')
    ]);
    setRules(r || []);
    setNotifications(n || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const saveRule = async (form) => {
    if (editingRule) {
      await base44.entities.NotificationRule.update(editingRule.id, form);
    } else {
      await base44.entities.NotificationRule.create(form);
    }
    setShowForm(false);
    setEditingRule(null);
    await loadAll();
  };

  const deleteRule = async (rule) => {
    if (!confirm(t('למחוק את הכלל?', 'Delete this rule?'))) return;
    await base44.entities.NotificationRule.delete(rule.id);
    await loadAll();
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { data } = await base44.functions.invoke('evaluateNotifications', { trigger: 'manual' });
      alert((t('ההרצה הסתיימה. נוצרו', 'Run completed. Created')) + ` ${data?.created || 0} notifications`);
      await loadAll();
    } finally { setRunning(false); }
  };

  const markRead = async (n) => {
    await base44.entities.Notification.update(n.id, { is_read: true });
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <h1 className="text-3xl font-bold">{t('מערכת התראות', 'Notifications')}</h1>
          <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Button variant="outline" onClick={runNow} disabled={running} className="gap-2">
              {running ? <Loader className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} {t('הרץ עכשיו', 'Run now')}
            </Button>
            <Button onClick={() => { setEditingRule(null); setShowForm(true); }}>{t('כלל חדש', 'New rule')}</Button>
          </div>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle>{editingRule ? t('עריכת כלל', 'Edit rule') : t('כלל חדש', 'New rule')}</CardTitle></CardHeader>
            <CardContent>
              <RuleForm initial={editingRule} onSave={saveRule} onCancel={() => { setShowForm(false); setEditingRule(null); }} isRTL={isRTL} language={language} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>{t('כללים', 'Rules')}</CardTitle></CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-gray-500">{t('אין כללים עדיין', 'No rules yet')}</div>
              ) : (
                <div className="space-y-3">
                  {rules.map(r => (
                    <div key={r.id} className="border rounded p-3 bg-white flex items-center justify-between">
                      <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-gray-600">
                          {t('סוג', 'Type')}: {r.rule_type} · {t('תדירות', 'Frequency')}: {r.frequency} · {t('ערוץ', 'Channel')}: {(r.channels||[]).join(', ')}
                        </div>
                      </div>
                      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button variant="outline" size="sm" onClick={() => { setEditingRule(r); setShowForm(true); }}>{t('ערוך', 'Edit')}</Button>
                        <Button variant="outline" size="sm" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => deleteRule(r)}>{t('מחק', 'Delete')}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('התראות אחרונות', 'Recent notifications')}</CardTitle></CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-gray-500">{t('אין התראות להצגה', 'No notifications to show')}</div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0,20).map(n => (
                    <div key={n.id} className={`border rounded p-3 bg-white flex items-center justify-between ${n.is_read ? 'opacity-70' : ''}`}>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {n.severity === 'critical' ? <AlertTriangle className="w-4 h-4 text-red-600" /> : <Bell className="w-4 h-4 text-yellow-600" />}
                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                          <div className="font-semibold">{n.rule_name || n.rule_type}</div>
                          <div className="text-gray-700">{n.message}</div>
                        </div>
                      </div>
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        {n.link_url && (
                          <a href={n.link_url} className="text-blue-600 underline text-sm" target="_blank" rel="noreferrer">{t('פתח', 'Open')}</a>
                        )}
                        {!n.is_read && (
                          <Button size="sm" variant="outline" onClick={() => markRead(n)} className="gap-1">
                            <CheckCircle2 className="w-4 h-4" /> {t('סמן נקרא', 'Mark read')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}