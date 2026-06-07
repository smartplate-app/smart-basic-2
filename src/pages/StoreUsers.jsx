import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Loader, Trash2, UserCheck, UserCog, Store, Edit } from "lucide-react";
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
  const [editingUser, setEditingUser] = useState(null);
  const [successEmail, setSuccessEmail] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
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
    setUserEmail("");
    setUserRole("worker");
    setEditingUser(null);
    setSuccessEmail("");
  };

  const handleAddUser = async () => {
    if (!userName.trim() || !userEmail.trim()) {
      alert(language === 'he' ? 'נא למלא את כל השדות' : 'Please fill in all fields');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail.trim())) {
      alert(language === 'he' ? 'נא להזין אימייל תקין' : 'Please enter a valid email');
      return;
    }

    try {
      setSaving(true);
      const ownerEmail = user.acting_as_store_email || user.email;
      const storeName = user.acting_as_store_name || user.business_name || user.full_name;
      const email = userEmail.toLowerCase().trim();

      if (editingUser) {
        // Update existing StoreUser record
        await base44.entities.StoreUser.update(editingUser.id, {
          user_name: userName,
          role: userRole,
          is_active: true
        });
      } else {
        // Create StoreUser record
        const existing = await base44.entities.StoreUser.filter({ user_email: email, owner_email: ownerEmail });
        if (existing.length > 0) {
          await base44.entities.StoreUser.update(existing[0].id, {
            user_name: userName,
            role: userRole,
            is_active: true
          });
        } else {
          await base44.entities.StoreUser.create({
            store_id: ownerEmail,
            store_name: storeName,
            user_email: email,
            user_name: userName,
            role: userRole,
            owner_email: ownerEmail,
            is_active: true
          });
        }
        // Send official invite email
        await base44.users.inviteUser(email, 'user');
        setSuccessEmail(email);
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
    setUserName(storeUser.user_name);
    setUserEmail(storeUser.user_email);
    setUserRole(storeUser.role);
    setSuccessEmail("");
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

              {successEmail ? (
                <div className="space-y-4 mt-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <p className="text-green-800 font-semibold text-lg mb-2">✅ {language === 'he' ? 'הזמנה נשלחה!' : 'Invite Sent!'}</p>
                    <p className="text-green-700 text-sm">
                      {language === 'he'
                        ? `נשלח מייל הזמנה ל-${successEmail}. המשתמש יוכל להתחבר עם חשבון גוגל שלו.`
                        : `An invite email was sent to ${successEmail}. They can sign in with their Google account.`}
                    </p>
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
                    <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'אימייל (Gmail)' : 'Email (Gmail)'}</Label>
                    <Input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="user@gmail.com"
                      className={isRTL ? 'text-right' : ''}
                      disabled={!!editingUser}
                    />
                    {!editingUser && (
                      <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
                        {language === 'he'
                          ? 'המשתמש יקבל הזמנה במייל ויתחבר עם חשבון הגוגל שלו'
                          : 'The user will receive an invite email and log in with their Google account'}
                      </p>
                    )}
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
                      {saving ? <Loader className="w-4 h-4 animate-spin" /> : (editingUser ? (language === 'he' ? 'עדכן' : 'Update') : (language === 'he' ? 'שלח הזמנה' : 'Send Invite'))}
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

        {/* Role Explanation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <UserCog className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-bold text-blue-900">{language === 'he' ? 'מנהל' : 'Manager'}</h3>
                  <p className="text-sm text-blue-700">{language === 'he' ? 'רואה הכל ומנהל את המסעדה' : 'Can see everything and manage restaurant'}</p>
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
                  <p className="text-sm text-green-700">{language === 'he' ? 'יוצר הזמנות, מקבל אספקה ועושה ספירות' : 'Creates orders, receives supplies, does counts'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                        <p className="text-sm text-gray-500">{storeUser.user_email}</p>
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