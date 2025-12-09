import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Loader, Trash2, UserCheck, UserCog, Store, Copy, Check } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

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
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("worker");
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const t = {
    he: {
      title: "משתמשי המסעדה",
      addUser: "הוסף משתמש",
      userName: "שם מלא",
      userEmail: "אימייל",
      role: "תפקיד",
      manager: "מנהל - גישה מלאה",
      worker: "עובד - הזמנות, קבלות וספירות בלבד",
      save: "שמור",
      cancel: "ביטול",
      loading: "טוען...",
      noUsers: "אין משתמשים עדיין",
      delete: "מחק",
      inviteSent: "המשתמש נוסף בהצלחה!",
      inviteFailed: "המשתמש נוסף! לא ניתן לשלוח מייל אוטומטית.",
      copyLink: "העתק קישור",
      copied: "הועתק!",
      shareLink: "שתף את הקישור הזה עם המשתמש:",
      currentRestaurant: "המסעדה הנוכחית שלך",
      managerDesc: "יכול לראות הכל ולנהל את המסעדה",
      workerDesc: "יכול ליצור הזמנות, לקבל אספקה ולבצע ספירות"
    },
    en: {
      title: "Restaurant Users",
      addUser: "Add User",
      userName: "Full Name",
      userEmail: "Email",
      role: "Role",
      manager: "Manager - Full Access",
      worker: "Worker - Orders, Receipts & Counts Only",
      save: "Save",
      cancel: "Cancel",
      loading: "Loading...",
      noUsers: "No users yet",
      delete: "Delete",
      inviteSent: "User added successfully!",
      inviteFailed: "User added! Email couldn't be sent automatically.",
      copyLink: "Copy Link",
      copied: "Copied!",
      shareLink: "Share this link with the user:",
      currentRestaurant: "Your Current Restaurant",
      managerDesc: "Can see everything and manage the restaurant",
      workerDesc: "Can create orders, receive supplies and do counts"
    }
  }[language] || {};

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load store users created by this user (or for acting store)
      const ownerEmail = currentUser.acting_as_store_email || currentUser.email;
      const users = await base44.entities.StoreUser.filter({ owner_email: ownerEmail });
      setStoreUsers(users);
    } catch (error) {
      console.error("Error loading store users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!userName.trim() || !userEmail.trim()) return;

    try {
      setSaving(true);

      const ownerEmail = user.acting_as_store_email || user.email;
      const storeName = user.acting_as_store_name || user.full_name + (language === 'he' ? " - חנות" : " - Store");
      const storeId = user.acting_as_store_id || "main";

      // Create store user
      await base44.entities.StoreUser.create({
        store_id: storeId,
        store_name: storeName,
        user_email: userEmail,
        user_name: userName,
        role: userRole,
        owner_email: ownerEmail,
        is_active: true
      });

      // Create long encoded link with restaurant data (no token needed)
      const restaurantData = {
        ownerEmail: ownerEmail,
        restaurantName: user.business_name || user.acting_as_store_name || storeName,
        restaurantAddress: user.business_address || '',
        restaurantLogo: user.restaurant_logo || '',
        inviteeName: userName,
        inviteeEmail: userEmail,
        role: userRole
      };

      const encodedData = btoa(JSON.stringify(restaurantData));
      const inviteLink = `${window.location.origin}/pages/JoinRestaurant?data=${encodedData}`;

      // Show the link for copying instead of alert
      setGeneratedLink(inviteLink);
      setLinkCopied(false);
      await loadData();
    } catch (error) {
      console.error("Error adding user:", error);
      alert(error.message);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-12 h-12 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className={`flex items-center justify-between mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Users className="w-8 h-8 text-gray-700" />
            <div>
              <h1 className={`text-3xl font-bold text-gray-900 ${isRTL ? 'text-right' : ''}`}>{t.title}</h1>
              {user?.acting_as_store_name && (
                <p className={`text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                  <Store className="w-4 h-4 inline mr-1" />
                  {user.acting_as_store_name}
                </p>
              )}
            </div>
          </div>
          
          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogTrigger asChild>
              <Button className="bg-gray-900 hover:bg-gray-800">
                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t.addUser}
              </Button>
            </DialogTrigger>
            <DialogContent dir={isRTL ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle className={isRTL ? 'text-right' : ''}>{t.addUser}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className={isRTL ? 'text-right block' : ''}>{t.userName}</Label>
                  <Input 
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)}
                    className={isRTL ? 'text-right' : ''}
                  />
                </div>
                <div>
                  <Label className={isRTL ? 'text-right block' : ''}>{t.userEmail}</Label>
                  <Input 
                    type="email"
                    value={userEmail} 
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="user@example.com"
                    className={isRTL ? 'text-right' : ''}
                  />
                </div>
                <div>
                  <Label className={isRTL ? 'text-right block' : ''}>{t.role}</Label>
                  <Select value={userRole} onValueChange={setUserRole}>
                    <SelectTrigger className={isRTL ? 'text-right' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <UserCog className="w-4 h-4 text-blue-600" />
                          {t.manager}
                        </div>
                      </SelectItem>
                      <SelectItem value="worker">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <UserCheck className="w-4 h-4 text-green-600" />
                          {t.worker}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    {userRole === 'manager' ? t.managerDesc : t.workerDesc}
                  </p>
                </div>
                {!generatedLink ? (
                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button onClick={handleAddUser} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
                      {saving ? <Loader className="w-4 h-4 animate-spin" /> : t.save}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddUser(false)}>
                      {t.cancel}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className={`text-green-800 font-semibold mb-2 ${isRTL ? 'text-right' : ''}`}>
                        ✅ {t.inviteSent}
                      </p>
                      <p className={`text-sm text-green-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                        {language === 'he' ? 'העתק את הקוד HTML למטה והדבק במייל Gmail שלך:' : 'Copy the HTML code below and paste in your Gmail:'}
                      </p>
                      <div className="bg-white border rounded p-2 mb-3 max-h-48 overflow-auto">
                        <code className="text-xs whitespace-pre-wrap" id="htmlCode">
{`<!DOCTYPE html>
<html dir="${language === 'he' ? 'rtl' : 'ltr'}">
<head><meta charset="UTF-8"><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}.content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}.button{display:inline-block;background:#667eea;color:white;padding:15px 30px;text-decoration:none;border-radius:5px;margin:20px 0;font-weight:bold}</style></head>
<body><div class="container"><div class="header"><h1>${language === 'he' ? '🎉 הזמנה להצטרף למסעדה' : '🎉 Restaurant Invitation'}</h1></div>
<div class="content"><p>${language === 'he' ? 'שלום' : 'Hello'} ${userName},</p>
<p>${language === 'he' ? `הוזמנת להצטרף למסעדת <strong>${user.business_name || user.full_name}</strong> כ${userRole === 'manager' ? 'מנהל' : 'עובד'}.` : `You've been invited to join <strong>${user.business_name || user.full_name}</strong> as a ${userRole}.`}</p>
<p>${language === 'he' ? 'לחץ על הכפתור למטה כדי להצטרף:' : 'Click the button below to join:'}</p>
<div style="text-align:center"><a href="${generatedLink}" class="button">${language === 'he' ? '🔗 הצטרף עכשיו' : '🔗 Join Now'}</a></div>
<p style="color:#666;font-size:12px">${language === 'he' ? 'או העתק והדבק את הקישור הזה בדפדפן:' : 'Or copy and paste this link:'}</p>
<p style="word-break:break-all;background:white;padding:10px;border-radius:5px;font-size:11px">${generatedLink}</p></div></div></body></html>`}
                        </code>
                      </div>
                      <Button
                        onClick={async () => {
                          const htmlCode = document.getElementById('htmlCode').textContent;
                          await navigator.clipboard.writeText(htmlCode);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }}
                        className={linkCopied ? "bg-green-600 hover:bg-green-700 w-full mb-2" : "bg-blue-600 hover:bg-blue-700 w-full mb-2"}
                      >
                        {linkCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {linkCopied ? (language === 'he' ? 'הועתק!' : 'Copied!') : (language === 'he' ? 'העתק HTML למייל' : 'Copy HTML for Email')}
                      </Button>
                      <p className="text-xs text-gray-600 mb-2">
                        {language === 'he' ? 'הוראות: פתח Gmail → צור מייל חדש → הדבק (Ctrl+Shift+V) → שלח' : 'Instructions: Open Gmail → Compose → Paste (Ctrl+Shift+V) → Send'}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setShowAddUser(false);
                        setGeneratedLink("");
                        setUserName("");
                        setUserEmail("");
                        setUserRole("worker");
                      }}
                    >
                      {t.cancel}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role Explanation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <UserCog className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-bold text-blue-900">{language === 'he' ? 'מנהל' : 'Manager'}</h3>
                  <p className="text-sm text-blue-700">{t.managerDesc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <UserCheck className="w-8 h-8 text-green-600" />
                <div>
                  <h3 className="font-bold text-green-900">{language === 'he' ? 'עובד' : 'Worker'}</h3>
                  <p className="text-sm text-green-700">{t.workerDesc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className={isRTL ? 'text-right' : ''}>{t.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {storeUsers.length === 0 ? (
              <p className={`text-gray-500 text-center py-8 ${isRTL ? 'text-right' : ''}`}>{t.noUsers}</p>
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
                        <p className="text-sm text-gray-500">{storeUser.user_email}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        storeUser.role === 'manager' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {storeUser.role === 'manager' ? (language === 'he' ? 'מנהל' : 'Manager') : (language === 'he' ? 'עובד' : 'Worker')}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteUser(storeUser.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
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