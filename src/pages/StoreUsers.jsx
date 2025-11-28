import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Loader, Trash2, UserCheck, UserCog, Store } from "lucide-react";
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

  const t = {
    he: {
      title: "משתמשי החנות",
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
      inviteSent: "המשתמש נוסף והזמנה נשלחה",
      inviteFailed: "המשתמש נוסף אך שליחת ההזמנה נכשלה",
      currentStore: "החנות הנוכחית שלך",
      managerDesc: "יכול לראות הכל ולנהל את החנות",
      workerDesc: "יכול ליצור הזמנות, לקבל אספקה ולבצע ספירות"
    },
    en: {
      title: "Store Users",
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
      inviteSent: "User added and invite sent",
      inviteFailed: "User added but invite failed to send",
      currentStore: "Your Current Store",
      managerDesc: "Can see everything and manage the store",
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
      
      // Create store user
      await base44.entities.StoreUser.create({
        store_id: user.acting_as_store_id || "main",
        store_name: storeName,
        user_email: userEmail,
        user_name: userName,
        role: userRole,
        owner_email: ownerEmail,
        is_active: true
      });

      // Send invite email via backend function (can send to any email)
      await base44.functions.invoke('sendStoreUserInvite', {
        userEmail,
        userName,
        storeName,
        role: userRole,
        language
      });
      
      alert(t.inviteSent);

      setShowAddUser(false);
      setUserName("");
      setUserEmail("");
      setUserRole("worker");
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
                <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Button onClick={handleAddUser} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
                    {saving ? <Loader className="w-4 h-4 animate-spin" /> : t.save}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddUser(false)}>
                    {t.cancel}
                  </Button>
                </div>
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