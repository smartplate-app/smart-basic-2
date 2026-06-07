import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserCog, Plus, Loader, Trash2, Mail, CheckCircle, Users } from 'lucide-react';
import { useLanguage } from '../components/LanguageProvider';

export default function ManagersSection() {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [inviting, setInviting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await base44.auth.me();
      setUser(u);
      const ownerEmail = u.acting_as_store_email || u.email;
      const all = await base44.entities.StoreUser.filter({ owner_email: ownerEmail });
      setManagers(all.filter(r => r.role === 'manager'));
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      alert(language === 'he' ? 'נא למלא שם ואימייל' : 'Please fill in name and email');
      return;
    }
    setInviting(true);
    setSuccessMsg('');
    try {
      const ownerEmail = user.acting_as_store_email || user.email;
      const storeName = user.acting_as_store_name || user.business_name || user.full_name || 'המסעדה';

      // 1. Create StoreUser record as manager (active immediately — owner approved by creating it)
      await base44.entities.StoreUser.create({
        store_id: user.id,
        store_name: storeName,
        user_email: email.trim().toLowerCase(),
        user_name: name.trim(),
        role: 'manager',
        owner_email: ownerEmail,
        is_active: true,
        description: ''
      });

      // 2. Send Base44 invite so they can sign up / login with Google
      await base44.users.inviteUser(email.trim().toLowerCase(), 'user');

      // 3. Send custom email mentioning the restaurant name
      try {
        await base44.functions.invoke('sendStoreUserInvite', {
          userEmail: email.trim().toLowerCase(),
          userName: name.trim(),
          storeName,
          role: 'manager',
          language
        });
      } catch (emailErr) {
        console.warn('Custom invite email failed (non-blocking):', emailErr?.message);
      }

      setSuccessMsg(name.trim());
      setEmail('');
      setName('');
      await loadData();
    } catch (err) {
      alert((language === 'he' ? 'שגיאה: ' : 'Error: ') + (err.message || 'Unknown error'));
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async (mgr) => {
    if (!confirm(language === 'he' ? `למחוק את ${mgr.user_name}?` : `Remove ${mgr.user_name}?`)) return;
    setDeletingId(mgr.id);
    try {
      await base44.entities.StoreUser.delete(mgr.id);
      await loadData();
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const activeManagers = managers.filter(m => m.is_active);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <UserCog className="w-7 h-7 text-blue-700" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {language === 'he' ? 'מנהלים' : 'Managers'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {language === 'he'
                ? 'הוסף מנהלים שיקבלו גישה מלאה למסעדה כ"בעל-משנה"'
                : 'Add managers who get full access to your restaurant as sub-owners'}
            </p>
          </div>
        </div>

        {/* Invite Card */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Mail className="w-5 h-5 text-blue-600" />
              {language === 'he' ? 'הזמן מנהל חדש' : 'Invite New Manager'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'he' ? 'שם מלא' : 'Full Name'}</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={language === 'he' ? 'ישראל ישראלי' : 'John Doe'}
                    className={isRTL ? 'text-right' : ''}
                  />
                </div>
                <div>
                  <Label>{language === 'he' ? 'אימייל' : 'Email'}</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="manager@example.com"
                    className={isRTL ? 'text-right' : ''}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                {language === 'he'
                  ? '📧 המנהל יקבל הזמנה להירשם למערכת עם Google. לאחר ההרשמה תפתח לו גישה מלאה למסעדה.'
                  : '📧 The manager will receive an invite to register with Google. Once they sign up, they get full access to your restaurant.'}
              </div>

              <Button type="submit" disabled={inviting} className="bg-blue-600 hover:bg-blue-700">
                {inviting
                  ? <Loader className="w-4 h-4 animate-spin" />
                  : <><Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />{language === 'he' ? 'שלח הזמנה' : 'Send Invite'}</>}
              </Button>

              {successMsg && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {language === 'he'
                    ? `✅ ההזמנה נשלחה ל${successMsg}! ברגע שיתחבר לראשונה יהיה לו גישה מלאה.`
                    : `✅ Invite sent to ${successMsg}! Once they log in for the first time, they'll have full access.`}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Active Managers */}
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Users className="w-5 h-5 text-blue-600" />
              {language === 'he' ? 'מנהלים פעילים' : 'Active Managers'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeManagers.length === 0 ? (
              <p className="text-gray-400 text-center py-6 text-sm">
                {language === 'he' ? 'אין מנהלים פעילים עדיין' : 'No active managers yet'}
              </p>
            ) : (
              <div className="space-y-3">
                {activeManagers.map(mgr => (
                  <div key={mgr.id} className={`flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <UserCog className="w-5 h-5 text-blue-600" />
                      <div className={isRTL ? 'text-right' : ''}>
                        <p className="font-semibold text-gray-800">{mgr.user_name}</p>
                        <p className="text-sm text-gray-500">{mgr.user_email}</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        {language === 'he' ? 'מנהל פעיל' : 'Active Manager'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(mgr)}
                      disabled={deletingId === mgr.id}
                      className="text-red-500 hover:bg-red-50"
                    >
                      {deletingId === mgr.id ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
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