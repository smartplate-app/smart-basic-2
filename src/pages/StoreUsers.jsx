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
  const [personalMessage, setPersonalMessage] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedHTML, setGeneratedHTML] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);

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
    if (!userName.trim() || !userEmail.trim()) {
      alert(language === 'he' ? 'נא למלא שם ואימייל' : 'Please fill in name and email');
      return;
    }

    try {
      setSaving(true);
      console.log('[StoreUsers] Starting user creation...');

      const ownerEmail = user.acting_as_store_email || user.email;
      const storeName = user.acting_as_store_name || user.business_name || user.full_name + (language === 'he' ? " - חנות" : " - Store");
      const storeId = user.acting_as_store_id || "main";

      console.log('[StoreUsers] Creating StoreUser record...');
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
      console.log('[StoreUsers] StoreUser created successfully');

      // Create short token-based invite
      const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const inviteLink = `${window.location.origin}/pages/Register?invite=${inviteToken}`;
      
      // Create UserInvite record with the token
      await base44.entities.UserInvite.create({
        token: inviteToken,
        email: userEmail,
        full_name: userName,
        invite_type: 'store_user',
        store_id: storeId,
        store_name: storeName,
        role: userRole,
        inviter_email: ownerEmail,
        inviter_name: user.full_name,
        restaurant_name: user.business_name || user.acting_as_store_name || storeName,
        restaurant_address: user.business_address || '',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        used: false
      });
      
      console.log('[StoreUsers] Generated invite link:', inviteLink);

      // Reload the user list
      console.log('[StoreUsers] Loading updated data...');
      await loadData();
      console.log('[StoreUsers] User list updated!');

      // Generate HTML email with styled button
      const htmlContent = `
<!DOCTYPE html>
<html dir="${language === 'he' ? 'rtl' : 'ltr'}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f4f4f4; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #1a1a1a; margin-bottom: 20px; }
    p { margin: 15px 0; }
    .button { display: inline-block; padding: 15px 30px; background: #2563eb; color: white !important; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; text-align: center; }
    .button:hover { background: #1d4ed8; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${language === 'he' ? '🎉 הוזמנת להצטרף!' : '🎉 You\'re Invited!'}</h1>
    <p>${language === 'he' ? 'שלום' : 'Hello'} ${userName},</p>
    <p>${language === 'he' 
      ? `הוזמנת על ידי ${user.full_name} להצטרף למסעדה <strong>${user.business_name || storeName}</strong> כ${userRole === 'manager' ? 'מנהל' : 'עובד'}.`
      : `You've been invited by ${user.full_name} to join <strong>${user.business_name || storeName}</strong> as a ${userRole === 'manager' ? 'Manager' : 'Worker'}.`
    }</p>
    ${personalMessage ? `<p style="background: #f0f9ff; padding: 15px; border-radius: 8px; border-right: 4px solid #2563eb;"><strong>${language === 'he' ? 'הודעה אישית:' : 'Personal Message:'}</strong><br>${personalMessage}</p>` : ''}
    <div style="text-align: center;">
      <a href="${inviteLink}" class="button">
        ${language === 'he' ? '👉 לחץ כאן להצטרף' : '👉 Click Here to Join'}
      </a>
    </div>
    <p style="font-size: 14px; color: #666;">
      ${language === 'he' 
        ? 'ההזמנה תפוג בעוד 7 ימים. אם יש לך שאלות, צור קשר עם המסעדה.'
        : 'This invitation expires in 7 days. If you have any questions, contact the restaurant.'
      }
    </p>
    <div class="footer">
      <p>${language === 'he' ? 'בברכה,' : 'Best regards,'}<br><strong>${user.business_name || storeName}</strong></p>
    </div>
  </div>
</body>
</html>`;

      setGeneratedLink(inviteLink);
      setGeneratedHTML(htmlContent);
      setLinkCopied(false);
      setHtmlCopied(false);
      
      console.log('[StoreUsers] All done!');
    } catch (error) {
      console.error("[StoreUsers] Error adding user:", error);
      alert((language === 'he' ? 'שגיאה: ' : 'Error: ') + error.message);
      setSaving(false);
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
          
          <Dialog open={showAddUser} onOpenChange={(open) => {
            setShowAddUser(open);
            if (!open) {
              // Reset form when closing
              setGeneratedLink("");
              setGeneratedHTML("");
              setUserName("");
              setUserEmail("");
              setUserRole("worker");
              setPersonalMessage("");
              setLinkCopied(false);
              setHtmlCopied(false);
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
                <DialogTitle className={isRTL ? 'text-right' : ''}>{t.addUser}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
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
                  <Label className={isRTL ? 'text-right block' : ''}>{t.userName}</Label>
                  <Input 
                    value={userName} 
                    onChange={(e) => setUserName(e.target.value)}
                    className={isRTL ? 'text-right' : ''}
                  />
                </div>
                <div>
                  <Label className={isRTL ? 'text-right block' : ''}>{t.personalMessage}</Label>
                  <textarea 
                    value={personalMessage} 
                    onChange={(e) => setPersonalMessage(e.target.value)}
                    placeholder={t.personalMessagePlaceholder}
                    className={`w-full min-h-[80px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 ${isRTL ? 'text-right' : ''}`}
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
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className={`text-green-800 font-semibold mb-3 ${isRTL ? 'text-right' : ''}`}>
                        ✅ {t.userAdded}
                      </p>
                      
                      {/* Preview iframe to show HTML properly */}
                      <div className="bg-white border border-gray-300 rounded-lg mb-3 max-h-96 overflow-auto">
                        <iframe
                          srcDoc={generatedHTML}
                          className="w-full h-96 border-0"
                          title="Email Preview"
                        />
                      </div>
                      
                      {/* Copy HTML Button - copies formatted HTML for Gmail */}
                      <Button
                        onClick={async () => {
                          try {
                            // Create a blob with HTML content
                            const blob = new Blob([generatedHTML], { type: 'text/html' });
                            const clipboardItem = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([generatedLink], { type: 'text/plain' }) });
                            await navigator.clipboard.write([clipboardItem]);
                            setHtmlCopied(true);
                            setTimeout(() => setHtmlCopied(false), 2000);
                          } catch (err) {
                            // Fallback to plain text if HTML copy fails
                            await navigator.clipboard.writeText(generatedHTML);
                            setHtmlCopied(true);
                            setTimeout(() => setHtmlCopied(false), 2000);
                          }
                        }}
                        className={htmlCopied ? "bg-green-600 hover:bg-green-700 w-full mb-2" : "bg-blue-600 hover:bg-blue-700 w-full mb-2"}
                      >
                        {htmlCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {htmlCopied ? t.copied : (language === 'he' ? 'העתק הזמנה מעוצבת (Gmail)' : 'Copy Formatted Invitation (Gmail)')}
                      </Button>
                      
                      {/* Copy short link button */}
                      <Button
                        onClick={async () => {
                          await navigator.clipboard.writeText(generatedLink);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        {linkCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {linkCopied ? t.copied : (language === 'he' ? 'העתק לינק בלבד' : 'Copy Link Only')}
                      </Button>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setShowAddUser(false);
                        setGeneratedLink("");
                        setGeneratedHTML("");
                        setUserName("");
                        setUserEmail("");
                        setUserRole("worker");
                        setPersonalMessage("");
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