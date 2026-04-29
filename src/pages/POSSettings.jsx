import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, Save, RefreshCw } from "lucide-react";

export default function POSSettings() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    pos_type: 'tabit',
    label: '',
    tabit_email: '',
    tabit_password: '',
    beecomm_email: '',
    beecomm_password: '',
    beecomm_restaurant_id: '',
    is_active: true
  });

  useEffect(() => {
    loadConnection();
  }, []);

  const loadConnection = async () => {
    try {
      const connections = await base44.entities.POSConnection.filter({});
      if (connections.length > 0) {
        const conn = connections[0];
        setConnection(conn);
        setFormData({
          pos_type: conn.pos_type || 'tabit',
          label: conn.label || '',
          tabit_email: conn.tabit_email || '',
          tabit_password: conn.tabit_password || '',
          tabit_branches: (conn.tabit_branches || []).join(', '),
          beecomm_email: conn.beecomm_email || '',
          beecomm_password: conn.beecomm_password || '',
          beecomm_restaurant_id: conn.beecomm_restaurant_id || '',
          is_active: conn.is_active !== false
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        pos_type: formData.pos_type,
        label: formData.label,
        tabit_email: formData.tabit_email,
        tabit_password: formData.tabit_password,
        tabit_branches: formData.tabit_branches.split(',').map(s => s.trim()).filter(Boolean),
        beecomm_email: formData.beecomm_email,
        beecomm_password: formData.beecomm_password,
        beecomm_restaurant_id: formData.beecomm_restaurant_id,
        is_active: formData.is_active
      };
      if (connection) {
        await base44.entities.POSConnection.update(connection.id, payload);
      } else {
        const newConn = await base44.entities.POSConnection.create(payload);
        setConnection(newConn);
      }
      alert('הגדרות נשמרו בהצלחה!');
    } catch (e) {
      alert('שגיאה בשמירה: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncPOSData', {});
      if (res.data?.success) {
        alert('הייבוא בוצע בהצלחה!');
        loadConnection();
      } else {
        alert('שגיאה בייבוא: ' + (res.data?.error || 'Unknown'));
      }
    } catch (e) {
      alert('שגיאה: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader className="animate-spin mx-auto text-gray-600" /></div>;

  return (
    <div className="p-4 md:p-8 rtl text-right max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">הגדרות קופה (POS)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>פרטי חיבור</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">סוג קופה</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  value={formData.pos_type}
                  onChange={e => setFormData({...formData, pos_type: e.target.value})}
                >
                  <option value="tabit">Tabit</option>
                  <option value="beecomm">Beecomm</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">שם המסעדה (לתצוגה)</label>
                <Input value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} required />
              </div>

              {formData.pos_type === 'tabit' && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm text-blue-800 mb-4">
                    <strong>שים לב:</strong> הגדרת חיבור זה תשמש באופן אוטומטי את כל המשתמשים במסעדה לסנכרון מול Tabit. (מערכת Tabit Chef).
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">אימייל Tabit</label>
                    <Input value={formData.tabit_email} onChange={e => setFormData({...formData, tabit_email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">סיסמה Tabit</label>
                    <Input type="password" value={formData.tabit_password} onChange={e => setFormData({...formData, tabit_password: e.target.value})} />
                  </div>

                </div>
              )}

              {formData.pos_type === 'beecomm' && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">אימייל Beecomm</label>
                    <Input value={formData.beecomm_email} onChange={e => setFormData({...formData, beecomm_email: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">סיסמה Beecomm</label>
                    <Input type="password" value={formData.beecomm_password} onChange={e => setFormData({...formData, beecomm_password: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">מזהה מסעדה (אופציונלי)</label>
                    <Input value={formData.beecomm_restaurant_id} onChange={e => setFormData({...formData, beecomm_restaurant_id: e.target.value})} />
                  </div>
                </div>
              )}

              <Button type="submit" disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12">
                {saving ? <Loader className="w-5 h-5 animate-spin rtl:ml-2 ltr:mr-2" /> : <Save className="w-5 h-5 rtl:ml-2 ltr:mr-2" />}
                שמור הגדרות
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader><CardTitle>סטטוס חיבור</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {connection ? (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-2">
                <p className="text-gray-700"><strong>סוג:</strong> {connection.pos_type}</p>
                <p className="text-gray-700"><strong>סנכרון אחרון:</strong> {connection.last_synced ? new Date(connection.last_synced).toLocaleString('he-IL') : 'טרם סונכרן'}</p>
                <Button onClick={handleSync} disabled={syncing} variant="outline" className="w-full mt-4 h-12 font-bold text-blue-600 border-blue-200 hover:bg-blue-50">
                  {syncing ? <Loader className="w-5 h-5 animate-spin rtl:ml-2 ltr:mr-2" /> : <RefreshCw className="w-5 h-5 rtl:ml-2 ltr:mr-2" />}
                  סנכרן עכשיו
                </Button>
              </div>
            ) : (
              <p className="text-gray-500">יש להגדיר ולשמור פרטי התחברות תחילה.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}