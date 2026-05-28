import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Loader, Trash2, UserCheck, UserCog, Store, Copy, Check, Edit } from "lucide-react";
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
  const [userUsername, setUserUsername] = useState(""); // Replaced userEmail with username
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("worker");
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState(null);

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
      copyLink: "העתק הזמנה",
      copied: "הועתק!",
      shareLink: "שתף את הקישור הזה עם המשתמש:",
      currentRestaurant: "המסעדה הנוכחית שלך",
      managerDesc: "יכול לראות הכל ולנהל את המסעדה",
      workerDesc: "יכול ליצור הזמנות, לקבל אספקה ולבצע ספירות",
      personalMessage: "הודעה אישית (אופציונלי)",
      personalMessagePlaceholder: "הוסף הודעה אישית...",
      userAdded: "המשתמש נוסף בהצלחה!"
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
      copyLink: "Copy Invitation",
      copied: "Copied!",
      shareLink: "Share this link with the user:",
      currentRestaurant: "Your Current Restaurant",
      managerDesc: "Can see everything and manage the restaurant",
      workerDesc: "Can create orders, receive supplies and do counts",
      personalMessage: "Personal Message (Optional)",
      personalMessagePlaceholder: "Add a personal message...",
      userAdded: "User added successfully!"
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
      if (!userName.trim() || !userUsername.trim() || (!editingUser && !userPassword.trim())) {
        alert(language === 'he' ? 'נא למלא את כל השדות' : 'Please fill in all fields');
        return;
      }

      if (userPassword && userPassword.trim().length < 6) {
        alert(language === 'he' ? 'הסיסמה חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters');
        return;
      }

      try {
          setSaving(true);
          console.log('[StoreUsers] Starting user creation/update...');

          const ownerEmail = user.acting_as_store_email || user.email;
          const storeName = user.acting_as_store_name || user.business_name || user.full_name + (language === 'he' ? " - חנות" : " - Store");
          const restaurantAddress = user.business_address || '';
          
          // Generate an internal email based on username + owner ID to avoid collisions
          const generatedInternalEmail = `${userUsername.toLowerCase().trim().replace(/[^a-z0-9]/g, '')}@${user.id}.local`;

          const createResponse = await base44.functions.invoke('createRestaurantUser', {
            email: generatedInternalEmail,
            password: userPassword,
            full_name: userName,
            store_name: storeName,
            role: userRole,
            owner_email: ownerEmail,
            update_existing: !!editingUser
          });

          if (!createResponse.data.success) {
            throw new Error(createResponse.data.error || 'Failed to create user');
          }

          console.log('[StoreUsers] User created successfully');

        // Reload the user list
        console.log('[StoreUsers] Loading updated data...');
        await loadData();
        console.log('[StoreUsers] User list updated!');

        // Show success message
        setGeneratedCredentials({
          username: userUsername,
          password: userPassword,
          loginUrl: `${window.location.origin}/StoreLogin`
        });
        setGeneratedLink(generatedInternalEmail);
        setLinkCopied(false);

        console.log('[StoreUsers] All done!');
      } catch (error) {
        console.error("[StoreUsers] Error adding/updating user:", error);

        let errorMessage = error?.response?.data?.error || error.message || 'Unknown error occurred';

        if (language === 'he') {
          if (errorMessage.includes('6 characters')) {
            errorMessage = 'הסיסמה חייבת להכיל לפחות 6 תווים';
          } else if (errorMessage.includes('Email already exists')) {
            errorMessage = '❌ האימייל כבר קיים במערכת';
          } else if (errorMessage.includes('Unauthorized') || errorMessage.includes('permission')) {
            errorMessage = 'אין הרשאה לבצע פעולה זו';
          } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
            errorMessage = 'שגיאת רשת - בדוק את החיבור לאינטרנט';
          }
        }

        alert((language === 'he' ? '❌ שגיאה: ' : '❌ Error: ') + errorMessage);
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
      // Extract original username from email (e.g. username@storeid.local)
      const extractedUsername = storeUser.user_email.split('@')[0];
      setUserUsername(extractedUsername);
      setUserPassword(''); // Force entering a new password if editing, or maybe we leave it blank to indicate no change (but API requires password currently)
      setUserRole(storeUser.role);
      setShowAddUser(true);
    };

  const handleMigration = async () => {
    if (!confirm(language === 'he' ? 'להעביר משתמשים קיימים למערכת החדשה?' : 'Migrate existing users to new system?')) {
      return;
    }

    try {
      setMigrating(true);
      const response = await base44.functions.invoke('migrateStoreUsers', {});
      
      if (response.data.success) {
        setMigrationResults(response.data);
        await loadData();
        alert((language === 'he' ? 'הועברו בהצלחה: ' : 'Migrated: ') + response.data.migrated + '\n\n' +
              (language === 'he' ? 'שלח סיסמאות זמניות למשתמשים' : 'Send temporary passwords to users'));
      } else {
        alert((language === 'he' ? 'שגיאה: ' : 'Error: ') + response.data.error);
      }
    } catch (error) {
      console.error("Migration error:", error);
      alert((language === 'he' ? 'שגיאה בהעברה' : 'Migration error'));
    } finally {
      setMigrating(false);
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
      <div className="w-full max-w-4xl mx-auto">
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
          
          {storeUsers.length > 0 && (
            <Button 
              variant="outline" 
              onClick={handleMigration}
              disabled={migrating}
              className="border-purple-500 text-purple-700 hover:bg-purple-50"
            >
              {migrating ? <Loader className="w-4 h-4 animate-spin" /> : '🔄 העבר משתמשים'}
            </Button>
          )}
          <Dialog open={showAddUser} onOpenChange={(open) => {
            setShowAddUser(open);
            if (!open) {
              // Reset form when closing
              setGeneratedLink("");
              setGeneratedCredentials(null);
              setUserName("");
              setUserUsername("");
              setUserPassword("");
              setUserRole("worker");
              setLinkCopied(false);
              setEditingUser(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-gray-900 hover:bg-gray-800">
                <Plus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                {t.addUser}
              </Button>
            </DialogTrigger>
            <DialogContent dir={isRTL ? 'rtl' : 'ltr'} key={generatedLink || 'new'}>
              <DialogHeader>
                <DialogTitle className={isRTL ? 'text-right' : ''}>
                  {editingUser ? (language === 'he' ? 'עריכת משתמש' : 'Edit User') : t.addUser}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className={isRTL ? 'text-right block' : ''}>{t.userName}</Label>
                  <Input 
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)}
                    className={isRTL ? 'text-right' : ''}
                    placeholder={language === 'he' ? 'שם מלא' : 'Full Name'}
                  />
                </div>
                <div>
                  <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'שם משתמש להתחברות' : 'Login Username'}</Label>
                  <Input 
                    type="text"
                    value={userUsername} 
                    onChange={(e) => setUserUsername(e.target.value)}
                    placeholder={language === 'he' ? 'לדוגמה: ivory' : 'e.g. ivory'}
                    className={isRTL ? 'text-right' : ''}
                    disabled={!!editingUser}
                  />
                  {editingUser && <p className="text-xs text-gray-500 mt-1">{language === 'he' ? 'לא ניתן לשנות שם משתמש קיים' : 'Cannot change existing username'}</p>}
                </div>
                <div>
                  <Label className={isRTL ? 'text-right block' : ''}>{language === 'he' ? 'סיסמה' : 'Password'}</Label>
                  <Input 
                    type="text"
                    value={userPassword} 
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder={language === 'he' ? 'הכנס סיסמה' : 'Enter password'}
                    className={isRTL ? 'text-right' : ''}
                  />
                  {editingUser && <p className="text-xs text-amber-600 mt-1">{language === 'he' ? 'הכנס סיסמה חדשה (חובה לעדכן סיסמה בעריכה)' : 'Enter new password (required on edit)'}</p>}
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
                          {language === 'he' ? 'מנהל - גישה מלאה' : 'Manager - Full Access'}
                        </div>
                      </SelectItem>
                      <SelectItem value="worker">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <UserCheck className="w-4 h-4 text-green-600" />
                          {language === 'he' ? 'עובד - הזמנות, קבלות וספירות' : 'Worker - Orders, Receipts & Counts'}
                        </div>
                      </SelectItem>
                      <SelectItem value="viewer">
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <UserCheck className="w-4 h-4 text-amber-600" />
                          {language === 'he' ? 'צופה - צפייה בכל הדפים בלבד' : 'Viewer - View all pages only'}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    {userRole === 'manager'
                      ? (language === 'he' ? 'רואה הכל ומנהל את המסעדה' : 'Can see everything and manage restaurant')
                      : userRole === 'viewer'
                      ? (language === 'he' ? 'צופה בלבד, ללא אפשרות לבצע שינויים' : 'View-only, cannot make changes')
                      : (language === 'he' ? 'יוצר הזמנות, מקבל אספקה ועושה ספירות' : 'Creates orders, receives supplies, does counts')}
                  </p>
                </div>
                {!generatedLink ? (
                  <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button onClick={handleAddUser} disabled={saving} className="bg-gray-900 hover:bg-gray-800">
                      {saving ? <Loader className="w-4 h-4 animate-spin" /> : (editingUser ? (language === 'he' ? 'עדכן' : 'Update') : t.save)}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddUser(false)}>
                      {t.cancel}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className={`text-green-800 font-semibold mb-3 ${isRTL ? 'text-right' : ''}`}>
                        ✅ {t.userAdded}
                      </p>

                      {/* Display email */}
                      <div className="bg-white border border-blue-200 rounded-lg p-4 mb-3">
                        <Label className={`text-sm font-semibold text-gray-700 mb-2 block ${isRTL ? 'text-right' : ''}`}>
                          {language === 'he' ? '✅ המשתמש נוסף בהצלחה!' : '✅ User added successfully!'}
                        </Label>
                        {generatedCredentials && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className={`text-sm text-blue-800 ${isRTL ? 'text-right' : ''}`}>
                              <strong>{language === 'he' ? '👤 שם משתמש:' : '👤 Username:'}</strong> {generatedCredentials.username}
                            </p>
                            <p className={`text-sm text-blue-800 mt-1 ${isRTL ? 'text-right' : ''}`}>
                              <strong>{language === 'he' ? '🔑 סיסמה:' : '🔑 Password:'}</strong> {generatedCredentials.password}
                            </p>
                            <p className={`text-sm text-blue-700 mt-3 ${isRTL ? 'text-right' : ''}`}>
                              <strong>{language === 'he' ? '💡 איך מתחברים:' : '💡 How to login:'}</strong>
                            </p>
                            <ul className={`text-sm text-blue-700 mt-2 space-y-1 ${isRTL ? 'list-inside mr-4' : 'list-inside ml-4'}`}>
                              <li>{language === 'he' ? 'המשתמש נכנס לקישור הבא:' : 'User goes to the following link:'} <br/><a href={generatedCredentials.loginUrl} target="_blank" className="underline break-all">{generatedCredentials.loginUrl}</a></li>
                              <li>{language === 'he' ? 'מזין את שם המשתמש והסיסמה שנוצרו עבורו.' : 'Enters the username and password created for them.'}</li>
                              <li>{language === 'he' ? 'מקבל גישה ישירה למסעדה שלך בהתאם להרשאות.' : 'Gets direct access to your restaurant based on their role.'}</li>
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* WhatsApp Quick Share Button */}
                      <Button
                        onClick={() => {
                          const loginLink = generatedCredentials?.loginUrl;
                          const uname = generatedCredentials?.username;
                          const pwd = generatedCredentials?.password;
                          const message = `${language === 'he' ? 'היי' : 'Hi'} ${userName}! ${language === 'he' ? 'נוצר עבורך חשבון למסעדה' : 'An account was created for you at'} ${user.business_name || user.full_name}.\n\n${language === 'he' ? '💡 פרטי התחברות:' : '💡 Login Details:'}\n${language === 'he' ? 'קישור:' : 'Link:'} ${loginLink}\n${language === 'he' ? 'שם משתמש:' : 'Username:'} ${uname}\n${language === 'he' ? 'סיסמה:' : 'Password:'} ${pwd}`;
                          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                        className="w-full mb-2"
                        style={{ backgroundColor: '#25D366' }}
                      >
                        <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        {language === 'he' ? 'שלח בווצאפ' : 'Send via WhatsApp'}
                      </Button>

                      {/* HTML Email Copy Button */}
                      <Button
                        onClick={async () => {
                          const loginLink = generatedCredentials?.loginUrl;
                          const uname = generatedCredentials?.username;
                          const pwd = generatedCredentials?.password;
                          const htmlContent = `
                            <div style="font-family: Arial, sans-serif; direction: ${isRTL ? 'rtl' : 'ltr'};">
                              <p>${language === 'he' ? 'היי' : 'Hi'} ${userName}!</p>
                              <p>${language === 'he' ? 'נוצר עבורך חשבון למסעדה' : 'An account was created for you at'} <strong>${user.business_name || user.full_name}</strong>.</p>
                              <p><strong>${language === 'he' ? '💡 פרטי התחברות:' : '💡 Login Details:'}</strong></p>
                              <ul>
                                <li><strong>${language === 'he' ? 'קישור:' : 'Link:'}</strong> <a href="${loginLink}">${loginLink}</a></li>
                                <li><strong>${language === 'he' ? 'שם משתמש:' : 'Username:'}</strong> ${uname}</li>
                                <li><strong>${language === 'he' ? 'סיסמה:' : 'Password:'}</strong> ${pwd}</li>
                              </ul>
                            </div>
                          `;
                          try {
                            const blobHtml = new Blob([htmlContent], { type: 'text/html' });
                            const blobText = new Blob([htmlContent.replace(/<[^>]+>/g, '')], { type: 'text/plain' });
                            const data = new ClipboardItem({
                              'text/html': blobHtml,
                              'text/plain': blobText,
                            });
                            await navigator.clipboard.write([data]);
                            alert(language === 'he' ? "הועתק בהצלחה! ניתן להדביק במייל או בצ'אט" : "Copied successfully! You can paste it into an email or chat.");
                          } catch (err) {
                            console.error('Failed to copy html: ', err);
                            // Fallback to text copy
                            try {
                              await navigator.clipboard.writeText(htmlContent.replace(/<[^>]+>/g, ''));
                              alert(language === 'he' ? 'הועתק כטקסט רגיל!' : 'Copied as plain text!');
                            } catch (e) {
                              alert(language === 'he' ? 'שגיאה בהעתקה' : 'Error copying');
                            }
                          }
                        }}
                        variant="outline"
                        className="w-full mb-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Copy className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {language === 'he' ? 'העתק למייל (HTML)' : 'Copy for Email (HTML)'}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setShowAddUser(false);
                          setGeneratedLink("");
                          setUserName("");
                          setUserUsername("");
                          setUserPassword("");
                          setUserRole("worker");
                      }}
                    >
                      {language === 'he' ? 'סגור' : 'Close'}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Role Explanation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <UserCheck className="w-8 h-8 text-amber-600" />
                <div>
                  <h3 className="font-bold text-amber-900">{language === 'he' ? 'צופה' : 'Viewer'}</h3>
                  <p className="text-sm text-amber-700">{language === 'he' ? 'צפייה בכל הדפים בלבד, ללא אפשרות לשינויים' : 'View all pages only, no changes allowed'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Migration Results */}
        {migrationResults && (
          <Card className="mb-6 border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <h3 className="font-bold text-purple-900 mb-2">
                {language === 'he' ? '✅ הועברו משתמשים' : '✅ Users Migrated'}
              </h3>
              <div className="space-y-2">
                {migrationResults.users.map((u, i) => (
                  <div key={i} className="bg-white p-2 rounded text-sm">
                    <div className="font-medium">{u.email}</div>
                    <div className="text-gray-600">
                      {language === 'he' ? 'סיסמה זמנית: ' : 'Temp password: '}
                      <code className="bg-gray-100 px-2 py-1 rounded">{u.temp_password}</code>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                      ) : storeUser.role === 'viewer' ? (
                        <UserCheck className="w-6 h-6 text-amber-600" />
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
                          : storeUser.role === 'viewer'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {storeUser.role === 'manager'
                          ? (language === 'he' ? 'מנהל' : 'Manager')
                          : storeUser.role === 'viewer'
                          ? (language === 'he' ? 'צופה' : 'Viewer')
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