import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Loader, Trash2, UserCheck, UserCog, Store, Edit, ExternalLink, RefreshCw, Copy, Check, Link, AlertTriangle, Share2 } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import WorkerActivityStats from "../components/worker/WorkerActivityStats";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

function AccessLinkCard({ role, title, subtitle, pin, link, generating, copied, onGenerate, onCopy, accentClass, language, isRTL }) {
  const isAmber = accentClass === 'amber';
  const bgCard = isAmber ? 'bg-amber-900' : 'bg-blue-900';
  const btnBg = isAmber ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-500 hover:bg-blue-600';
  const pinColor = isAmber ? 'text-amber-300' : 'text-blue-300';
  const icon = isAmber ? '🍽️' : '🗂️';

  return (
    <div className={`${bgCard} text-white rounded-xl px-5 py-5`}>
      <div className={`flex items-center justify-between mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <p className="font-semibold text-base flex items-center gap-2">{icon} {title}</p>
          <p className="text-white/60 text-xs mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className={`flex items-center gap-2 ${btnBg} disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition`}
        >
          {generating ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {language === 'he' ? 'צור / חדש' : 'Generate'}
        </button>
      </div>

      {link ? (
        <div className="bg-white/10 rounded-xl p-3 space-y-2">
          <div className="text-center">
            <p className="text-white/50 text-xs mb-0.5">{language === 'he' ? 'קוד גישה' : 'Access PIN'}</p>
            <div className="flex items-center justify-center gap-2">
              <p className={`text-3xl font-bold tracking-widest ${pinColor}`}>{pin}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(pin); }}
                className="text-white/50 hover:text-white transition p-1 rounded"
                title={language === 'he' ? 'העתק קוד' : 'Copy PIN'}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="flex-1 bg-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 truncate font-mono">
              {link}
            </div>
            <button onClick={onCopy} className="flex items-center gap-1 bg-white text-gray-900 px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 whitespace-nowrap transition">
              {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
              {copied ? (language === 'he' ? 'הועתק!' : 'Copied!') : (language === 'he' ? 'העתק' : 'Copy')}
            </button>
            <button
              onClick={async () => {
                const msg = language === 'he'
                  ? `שלום! הנה הקישור לפורטל העובדים:\n${link}\n\nקוד גישה: ${pin}`
                  : `Hi! Here is your worker portal link:\n${link}\n\nAccess PIN: ${pin}`;
                if (navigator.share) {
                  try {
                    await navigator.share({ text: msg });
                  } catch (e) {
                    if (e.name !== 'AbortError') {
                      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                    }
                  }
                } else {
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }
              }}
              className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition"
            >
              <span>📤</span>
              {language === 'he' ? 'שתף' : 'Share'}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center bg-white/20 hover:bg-white/30 text-white px-2 py-1.5 rounded-lg transition">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      ) : (
        <p className="text-white/40 text-xs text-center py-2">
          {language === 'he' ? 'לחץ "צור / חדש" ליצירת קישור וקוד גישה' : 'Click "Generate" to create a link & PIN'}
        </p>
      )}
    </div>
  );
}

export default function StoreUsersPage() {
  const { language } = useLanguage();
  const isRTL = language === 'he';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeUsers, setStoreUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [userName, setUserName] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("worker");
  const [editingUser, setEditingUser] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [workerPin, setWorkerPin] = useState("");
  const [workerLink, setWorkerLink] = useState("");
  const [generatingWorker, setGeneratingWorker] = useState(false);
  const [copiedWorker, setCopiedWorker] = useState(false);
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false);
  const [showShareNewCode, setShowShareNewCode] = useState(false);
  const [pendingNewPin, setPendingNewPin] = useState(null);
  const [pendingNewLink, setPendingNewLink] = useState(null);

  useEffect(() => { loadData(); }, []);

  const generateLink = () => {
    // If there's already a PIN, warn the manager before regenerating
    if (workerPin) {
      setShowRegenerateWarning(true);
    } else {
      doGenerateLink();
    }
  };

  const doGenerateLink = async () => {
    setGeneratingWorker(true);
    try {
      const currentUser = user || await base44.auth.me();
      const pin = Math.floor(10000000 + Math.random() * 90000000).toString();
      await base44.auth.updateMe({ worker_access_pin: pin });
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/WorkerLogin?store=${currentUser.id}&role=worker`;
      setWorkerPin(pin);
      setWorkerLink(link);
      setPendingNewPin(pin);
      setPendingNewLink(link);
      setShowShareNewCode(true);
    } catch (err) {
      alert(language === 'he' ? 'שגיאה ביצירת קישור' : 'Error generating link');
    } finally {
      setGeneratingWorker(false);
    }
  };

  const shareNewCode = async (pin, link) => {
    const msg = language === 'he'
      ? `שלום! הקוד החדש לפורטל העובדים:\n${link}\n\nקוד גישה: ${pin}`
      : `Hi! New worker portal code:\n${link}\n\nAccess PIN: ${pin}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: msg });
      } catch (e) {
        if (e.name !== 'AbortError') {
          window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        }
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    setCopiedWorker(true);
    setTimeout(() => setCopiedWorker(false), 2000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const baseUrl = window.location.origin;
      if (currentUser.worker_access_pin) {
        setWorkerPin(currentUser.worker_access_pin);
        setWorkerLink(`${baseUrl}/WorkerLogin?store=${currentUser.id}&role=worker`);
      }
      const ownerEmail = currentUser.acting_as_store_email || currentUser.email;
      const users = await base44.entities.StoreUser.filter({ owner_email: ownerEmail });
      setStoreUsers(users);
    } catch (error) {
      console.error("Error loading store users:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUserName("");
    setUserUsername("");
    setUserPassword("");
    setUserRole("worker");
    setEditingUser(null);
    setSuccessMsg("");
  };

  const handleAddUser = async () => {
    if (!userName.trim() || !userUsername.trim()) {
      alert(language === 'he' ? 'נא למלא שם מלא ושם משתמש' : 'Please fill in full name and username');
      return;
    }
    if (!editingUser && !userPassword.trim()) {
      alert(language === 'he' ? 'נא להזין סיסמה' : 'Please enter a password');
      return;
    }
    if (!editingUser && userPassword.trim().length < 6) {
      alert(language === 'he' ? 'הסיסמה חייבת להיות לפחות 6 תווים' : 'Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      const ownerEmail = user.acting_as_store_email || user.email;
      const storeName = user.acting_as_store_name || user.business_name || user.full_name;
      // Build a fake-email from the username so backend stays unchanged
      const uname = userUsername.toLowerCase().trim().replace(/\s+/g, '.');
      const fakeEmail = `${uname}@smartplate.worker`;

      if (editingUser) {
        // Update name/role on StoreUser
        await base44.entities.StoreUser.update(editingUser.id, {
          user_name: userName,
          role: userRole,
          is_active: true
        });
        // Update password if provided
        if (userPassword.trim()) {
          await base44.functions.invoke("createRestaurantUser", {
            email: fakeEmail,
            password: userPassword.trim(),
            full_name: userName,
            role: userRole,
            store_name: storeName,
            owner_email: ownerEmail
          });
        }
      } else {
        const res = await base44.functions.invoke("createRestaurantUser", {
          email: fakeEmail,
          password: userPassword.trim(),
          full_name: userName,
          role: userRole,
          store_name: storeName,
          owner_email: ownerEmail
        });
        if (!res.data?.success) {
          throw new Error(res.data?.error || 'Failed to create user');
        }
        setSuccessMsg(userName);
      }

      await loadData();

      if (editingUser) {
        setShowAddUser(false);
        resetForm();
      }
    } catch (error) {
      console.error("Error adding/updating user:", error);
      alert((language === 'he' ? '❌ שגיאה: ' : '❌ Error: ') + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm(language === 'he' ? 'למחוק משתמש זה?' : 'Delete this user?')) return;
    try {
      await base44.entities.StoreUser.delete(userId);
      await loadData();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleEditUser = (storeUser) => {
    setEditingUser(storeUser);
    setUserName(storeUser.user_name || "");
    // Extract username from fake email
    setUserUsername((storeUser.user_email || "").replace('@smartplate.worker', '').replace(/\./g, ' '));
    setUserPassword("");
    setUserRole(storeUser.role);
    setSuccessMsg("");
    setShowAddUser(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-12 h-12 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Users className="w-8 h-8 text-gray-700" />
            <div>
              <h1 className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : ''}`}>
                {language === 'he' ? 'משתמשי המסעדה' : 'Restaurant Users'}
              </h1>
              {user?.acting_as_store_name && (
                <p className={`text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                  <Store className="w-4 h-4 inline mr-1" />
                  {user.acting_as_store_name}
                </p>
              )}
            </div>
          </div>

          <Dialog open={showAddUser} onOpenChange={(open) => {
            setShowAddUser(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gray-900 hover:bg-gray-800">
                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {language === 'he' ? 'הוסף משתמש' : 'Add User'}
              </Button>
            </DialogTrigger>
            <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle className={isRTL ? 'text-right' : ''}>
                  {editingUser
                    ? (language === 'he' ? 'עריכת משתמש' : 'Edit User')
                    : (language === 'he' ? 'הוסף משתמש' : 'Add User')}
                </DialogTitle>
              </DialogHeader>

              {successMsg ? (
                <div className="space-y-4 mt-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-green-800 font-semibold text-lg mb-2">✅ {language === 'he' ? 'המשתמש נוצר!' : 'User Created!'}</p>
                    <p className="text-green-700 text-sm mb-3">
                      {language === 'he'
                        ? `${successMsg} נוסף בהצלחה. שלח לעובד את הקישור הבא:`
                        : `${successMsg} was added. Share this link with them:`}
                    </p>
                    <a
                      href="/WorkerLogin"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {language === 'he' ? 'כניסת עובדים' : 'Worker Login'}
                    </a>
                  </div>
                  <Button className="w-full" variant="outline" onClick={() => { setShowAddUser(false); resetForm(); }}>
                    {language === 'he' ? 'סגור' : 'Close'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'שם מלא' : 'Full Name'}</Label>
                    <Input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder={language === 'he' ? 'שם מלא' : 'Full Name'}
                      className={isRTL ? 'text-right' : ''}
                    />
                  </div>
                  <div>
                    <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'שם משתמש' : 'Username'}</Label>
                    <Input
                      value={userUsername}
                      onChange={(e) => setUserUsername(e.target.value)}
                      placeholder={language === 'he' ? 'לדוגמה: nitsan123' : 'e.g. nitsan123'}
                      className={isRTL ? 'text-right' : ''}
                      disabled={!!editingUser}
                    />
                  </div>
                  <div>
                    <Label className={isRTL ? 'text-right block' : ''}>
                      {editingUser
                        ? (language === 'he' ? 'סיסמה חדשה (השאר ריק לאי שינוי)' : 'New Password (leave blank to keep)')
                        : (language === 'he' ? 'סיסמה' : 'Password')}
                    </Label>
                    <Input
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder={language === 'he' ? 'לפחות 6 תווים' : 'At least 6 characters'}
                      className={isRTL ? 'text-right' : ''}
                    />
                  </div>
                  <div>
                    <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'תפקיד' : 'Role'}</Label>
                    <Select value={userRole} onValueChange={setUserRole}>
                      <SelectTrigger className={isRTL ? 'text-right' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <UserCog className="w-4 h-4 text-blue-600" />
                            {language === 'he' ? 'מנהל - גישה מלאה' : 'Manager - Full Access'}
                          </div>
                        </SelectItem>
                        <SelectItem value="worker">
                          <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <UserCheck className="w-4 h-4 text-green-600" />
                            {language === 'he' ? 'עובד - הזמנות, קבלות וספירות' : 'Worker - Orders, Receipts & Counts'}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button onClick={handleAddUser} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
                      {saving ? <Loader className="w-4 h-4 animate-spin" /> : (editingUser ? (language === 'he' ? 'עדכן' : 'Update') : (language === 'he' ? 'צור משתמש' : 'Create User'))}
                    </Button>
                    <Button variant="outline" onClick={() => { setShowAddUser(false); resetForm(); }}>
                      {language === 'he' ? 'ביטול' : 'Cancel'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Access Link - Worker Portal */}
        <div className="mb-6">
          <div className={`mb-2 px-1 text-sm text-gray-500 ${isRTL ? 'text-right' : ''}`}>
            {language === 'he'
              ? '🔑 פורטל העובדים מאפשר לעובדים להיכנס בלי חשבון אישי — רק עם הקישור וקוד הגישה. העובדים יכולים: לבצע הזמנות לספקים, לקלוט קבלות וחשבוניות, לבצע ספירות מלאי ולדווח על זריקות. כל פעם שתייצר קוד חדש, הקוד הישן יחסם אוטומטית.'
              : '🔑 The Worker Portal lets staff log in without a personal account — just the link and PIN. Workers can: place supplier orders, receive invoices & delivery notes, perform inventory counts, and report waste. Every time you generate a new code, the old one is automatically blocked.'}
          </div>
          <AccessLinkCard
            role="worker"
            title={language === 'he' ? 'פורטל עובדים' : 'Worker Portal'}
            subtitle={language === 'he' ? 'קוד גישה לעובדים בלבד' : 'PIN for workers only'}
            pin={workerPin}
            link={workerLink}
            generating={generatingWorker}
            copied={copiedWorker}
            onGenerate={() => generateLink()}
            onCopy={() => copyLink(workerLink)}
            accentClass="amber"
            language={language}
            isRTL={isRTL}
          />
        </div>

        {/* Regenerate warning dialog */}
        <AlertDialog open={showRegenerateWarning} onOpenChange={setShowRegenerateWarning}>
          <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
            <AlertDialogHeader>
              <AlertDialogTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                {language === 'he' ? 'שים לב — הקוד הישן יחסם!' : 'Warning — Old code will be blocked!'}
              </AlertDialogTitle>
              <AlertDialogDescription className={isRTL ? 'text-right' : ''}>
                {language === 'he'
                  ? 'כל עובד שמחזיק את הקוד הישן לא יוכל להתחבר יותר. לאחר היצירה תוכל לשלוח להם את הקוד החדש.'
                  : 'Any worker using the old code will be locked out. After generating, you can send them the new code.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
              <AlertDialogCancel>{language === 'he' ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => { setShowRegenerateWarning(false); doGenerateLink(); }}
              >
                {language === 'he' ? 'צור קוד חדש ושלח לעובדים' : 'Generate & Send to Workers'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Share new code dialog */}
        <AlertDialog open={showShareNewCode} onOpenChange={setShowShareNewCode}>
          <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
            <AlertDialogHeader>
              <AlertDialogTitle className={isRTL ? 'text-right' : ''}>
                {language === 'he' ? '✅ קוד חדש נוצר — שלח לעובדים' : '✅ New code generated — Send to workers'}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <p className="text-sm text-gray-600">
                    {language === 'he'
                      ? 'הקוד החדש מוכן. שלח אותו לעובדים שלך כדי שיוכלו להתחבר.'
                      : 'The new code is ready. Share it with your workers so they can log in.'}
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-amber-600 mb-1">{language === 'he' ? 'קוד גישה חדש' : 'New Access PIN'}</p>
                    <p className="text-3xl font-bold tracking-widest text-amber-700">{pendingNewPin}</p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className={`flex-col gap-2 ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'}`}>
              <AlertDialogCancel className="sm:mt-0">{language === 'he' ? 'סגור' : 'Close'}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2"
                onClick={() => shareNewCode(pendingNewPin, pendingNewLink)}
              >
                <Share2 className="w-4 h-4" />
                {language === 'he' ? 'שתף עם העובדים' : 'Share with Workers'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Worker Activity Stats */}
        {user && <div className="mb-6"><WorkerActivityStats ownerId={user.id} language={language} /></div>}

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className={isRTL ? 'text-right' : ''}>{language === 'he' ? 'משתמשים' : 'Users'}</CardTitle>
          </CardHeader>
          <CardContent>
            {storeUsers.length === 0 ? (
              <p className={`text-gray-500 text-center py-8`}>{language === 'he' ? 'אין משתמשים עדיין' : 'No users yet'}</p>
            ) : (
              <div className="space-y-3">
                {storeUsers.map((storeUser) => (
                  <div
                    key={storeUser.id}
                    className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                      {storeUser.role === 'manager' ? (
                        <UserCog className="w-6 h-6 text-blue-600" />
                      ) : (
                        <UserCheck className="w-6 h-6 text-green-600" />
                      )}
                      <div>
                        <p className="font-semibold">{storeUser.user_name}</p>
                        <p className="text-sm text-gray-500">
                          {(storeUser.user_email || '').includes('@smartplate.worker')
                            ? `@${(storeUser.user_email || '').replace('@smartplate.worker', '')}`
                            : storeUser.user_email}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        storeUser.role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {storeUser.role === 'manager'
                          ? (language === 'he' ? 'מנהל' : 'Manager')
                          : (language === 'he' ? 'עובד' : 'Worker')}
                      </span>
                    </div>
                    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditUser(storeUser)}
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(storeUser.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
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