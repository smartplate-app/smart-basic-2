import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader, Plus, Mail, Trash2, Shield, User as UserIcon, Copy, Check } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function UsersPage() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [showInvitePreview, setShowInvitePreview] = useState(false);
  const [generatedInviteHTML, setGeneratedInviteHTML] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      if (user.role !== 'admin') {
        alert(language === 'he' ? 'גישה נדחתה - נדרשות הרשאות אדמין' : 'Access denied - Admin permissions required');
        window.location.href = '/';
        return;
      }

      const response = await base44.functions.invoke('getAdminData', {
        action: 'listUsers'
      });

      if (response.data.success) {
        setUsers(response.data.users);
      } else {
        throw new Error(response.data.error || 'Failed to load users');
      }
      
    } catch (error) {
      console.error("Error loading data:", error);
      alert(language === 'he' ? 'שגיאה בטעינת נתונים' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const generateInviteHTML = () => {
    const appUrl = window.location.origin;
    const senderName = currentUser.email_sender_name || currentUser.business_name || currentUser.full_name || 'Smart Plate';
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg';

    return `<!DOCTYPE html>
<html dir="${language === 'he' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937; direction: ${language === 'he' ? 'rtl' : 'ltr'}; background: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1f2937; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo { max-height: 60px; margin-bottom: 15px; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #1f2937; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .button:hover { background: #374151; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    ul { color: #374151; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Smart Plate" class="logo" />
      <h1 style="margin: 0; font-size: 24px;">${language === 'he' ? 'הזמנה למערכת Smart Plate' : 'Invitation to Smart Plate'}</h1>
    </div>
    <div class="content">
      <p>${language === 'he' ? `שלום ${inviteData.full_name},` : `Hello ${inviteData.full_name},`}</p>
      
      <p>${language === 'he' 
        ? `הוזמנת על ידי ${currentUser.full_name} להצטרף למערכת Smart Plate לניהול עלויות מזון ועבודה.`
        : `You've been invited by ${currentUser.full_name} to join Smart Plate - Food & Labor Cost Management System.`
      }</p>
      
      <p style="font-weight: bold; color: #1f2937;">${language === 'he'
        ? 'המערכת מאפשרת לך לנהל:'
        : 'The system allows you to manage:'
      }</p>
      <ul>
        <li>${language === 'he' ? 'הזמנות לספקים' : 'Orders to suppliers'}</li>
        <li>${language === 'he' ? 'קבלת תעודות משלוח' : 'Receipt of supply documents'}</li>
        <li>${language === 'he' ? 'ניהול מלאי' : 'Inventory management'}</li>
        <li>${language === 'he' ? 'מעקב עלויות' : 'Cost tracking'}</li>
        <li>${language === 'he' ? 'דוחות וניתוחים' : 'Reports and analytics'}</li>
      </ul>
      
      ${inviteData.message ? `
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1f2937;">
        <p style="margin: 0; font-style: italic; color: #374151;">${inviteData.message}</p>
      </div>
      ` : ''}
      
      <div style="text-align: center;">
        <a href="${appUrl}" class="button">
          ${language === 'he' ? 'לחץ כאן להתחברות עם Google או Microsoft' : 'Click here to login with Google or Microsoft'}
        </a>
      </div>
      
      <p style="font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px;">
        ${language === 'he' 
          ? 'תתבקש להתחבר עם חשבון Google או Microsoft שלך'
          : 'You will be asked to login with your Google or Microsoft account'
        }
      </p>
    </div>
    <div class="footer">
      <p>${language === 'he' ? 'Smart Plate - מערכת לניהול עלויות מזון ועבודה' : 'Smart Plate - Food & Labor Cost Management'}</p>
    </div>
  </div>
</body>
</html>`;
  };

  const handleCopyInvite = () => {
    if (!inviteData.email || !inviteData.full_name) {
      alert(language === 'he' ? 'יש למלא אימייל ושם מלא' : 'Email and full name are required');
      return;
    }

    const html = generateInviteHTML();
    setGeneratedInviteHTML(html);
    setShowInvitePreview(true);
  };

  const downloadHTMLFile = () => {
    const blob = new Blob([generatedInviteHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation-${inviteData.email}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAppLink = async () => {
    try {
      const appUrl = window.location.origin;
      await navigator.clipboard.writeText(appUrl);
      alert(language === 'he' ? 'הקישור הועתק! שלח אותו ב-WhatsApp' : 'Link copied! Send it via WhatsApp');
    } catch (error) {
      console.error("Error copying link:", error);
      alert(language === 'he' ? 'שגיאה בהעתקה' : 'Error copying');
    }
  };

  const copyToClipboard = async () => {
    try {
      // Try to copy as HTML
      const blob = new Blob([generatedInviteHTML], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({
        'text/html': blob,
        'text/plain': new Blob([generatedInviteHTML], { type: 'text/plain' }) // Fallback for plain text
      });
      await navigator.clipboard.write([clipboardItem]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback to plain text
      try {
        await navigator.clipboard.writeText(generatedInviteHTML);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Error copying to clipboard:", error);
        alert(language === 'he' ? 'שגיאה בהעתקה - נסה להוריד כקובץ' : 'Error copying - try downloading as file');
      }
    }
  };

  const handleSendInvite = async () => {
    if (!inviteData.email || !inviteData.full_name) {
      alert(language === 'he' ? 'יש למלא אימייל ושם מלא' : 'Email and full name are required');
      return;
    }

    try {
      setSending(true);

      const senderName = currentUser.email_sender_name || currentUser.business_name || currentUser.full_name || 'Smart Plate';
      const emailBody = generateInviteHTML();

      await base44.integrations.Core.SendEmail({
        from_name: senderName,
        to: inviteData.email,
        subject: language === 'he' ? 'הזמנה למערכת Smart Plate' : 'Invitation to Smart Plate',
        body: emailBody
      });

      alert(language === 'he' ? 'ההזמנה נשלחה בהצלחה!' : 'Invitation sent successfully!');
      setShowInviteForm(false);
      setInviteData({ email: '', full_name: '', message: '' });
      
    } catch (error) {
      console.error("Error sending invite:", error);
      alert(language === 'he' ? 'שגיאה בשליחת ההזמנה' : 'Error sending invitation');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (userEmail === currentUser.email) {
      alert(language === 'he' ? 'לא ניתן למחוק את המשתמש שלך' : 'Cannot delete your own account');
      return;
    }

    if (!confirm(language === 'he' ? 'האם אתה בטוח שברצונך למחוק משתמש זה?' : 'Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await base44.functions.invoke('deleteUserAccount', { userId });
      alert(language === 'he' ? 'המשתמש נמחק בהצלחה' : 'User deleted successfully');
      loadData();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(language === 'he' ? 'שגיאה במחיקת המשתמש' : 'Error deleting user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-lg text-gray-700">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">
              {language === 'he' ? 'גישה נדחתה' : 'Access Denied'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{language === 'he' ? 'רק מנהלים יכולים לגשת לדף זה' : 'Only administrators can access this page'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {language === 'he' ? 'ניהול משתמשים' : 'User Management'}
            </h1>
            <p className="text-gray-600 mt-2">
              {language === 'he' ? 'הזמן משתמשים חדשים ונהל משתמשים קיימים' : 'Invite new users and manage existing users'}
            </p>
          </div>
          <Button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            {language === 'he' ? 'הזמן משתמש חדש' : 'Invite New User'}
          </Button>
        </div>

        {showInviteForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {language === 'he' ? 'הזמנת משתמש חדש' : 'Invite New User'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {language === 'he' ? 'אימייל' : 'Email'} *
                  </label>
                  <Input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {language === 'he' ? 'שם מלא' : 'Full Name'} *
                  </label>
                  <Input
                    value={inviteData.full_name}
                    onChange={(e) => setInviteData({...inviteData, full_name: e.target.value})}
                    placeholder={language === 'he' ? 'ישראל ישראלי' : 'John Doe'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    {language === 'he' ? 'הודעה אישית (אופציונלי)' : 'Personal Message (Optional)'}
                  </label>
                  <textarea
                    value={inviteData.message}
                    onChange={(e) => setInviteData({...inviteData, message: e.target.value})}
                    placeholder={language === 'he' ? 'הוסף הודעה אישית...' : 'Add a personal message...'}
                    className="w-full min-h-[100px] p-3 border rounded-lg"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                  <p className="font-semibold mb-2 text-amber-800">
                    {language === 'he' ? '⚠️ חשוב!' : '⚠️ Important!'}
                  </p>
                  <p className="text-amber-700">
                    {language === 'he' 
                      ? 'אימיילים שנשלחים ישירות מהמערכת עלולים להיכנס לספאם. מומלץ להעתיק את ההזמנה ולשלוח אותה מהאימייל האישי שלך או דרך WhatsApp.'
                      : 'Emails sent directly from the system may go to spam. We recommend copying the invitation and sending it from your personal email or via WhatsApp.'}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p className="font-semibold mb-2">
                    {language === 'he' ? '💡 איך זה עובד:' : '💡 How it works:'}
                  </p>
                  <ol className={`list-decimal space-y-1 ${language === 'he' ? 'mr-4' : 'ml-4'}`}>
                    <li>{language === 'he' ? 'המשתמש יקבל אימייל הזמנה' : 'User receives invitation email'}</li>
                    <li>{language === 'he' ? 'לחיצה על הקישור תוביל לדף התחברות' : 'Clicking the link leads to login page'}</li>
                    <li>{language === 'he' ? 'המשתמש מתחבר עם Google או Microsoft' : 'User logs in with Google or Microsoft'}</li>
                    <li>{language === 'he' ? 'המשתמש מקבל גישה למערכת' : 'User gains access to the system'}</li>
                  </ol>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteData({ email: '', full_name: '', message: '' });
                    }}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={handleCopyInvite}
                    variant="outline"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {language === 'he' ? 'העתק הזמנה (מומלץ)' : 'Copy Invitation (Recommended)'}
                  </Button>
                  <Button
                    onClick={handleSendInvite}
                    disabled={sending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {sending ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        {language === 'he' ? 'שולח...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        {language === 'he' ? 'שלח הזמנה באימייל' : 'Send Email Invitation'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              {language === 'he' ? 'משתמשים במערכת' : 'System Users'}
              <Badge variant="outline" className="ml-2">{users.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-700 font-semibold">
                        {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{user.full_name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      {user.business_name && (
                        <div className="text-xs text-gray-500">{user.business_name}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role === 'admin' ? (
                        <>
                          <Shield className="w-3 h-3 mr-1" />
                          {language === 'he' ? 'מנהל' : 'Admin'}
                        </>
                      ) : (
                        <>
                          <UserIcon className="w-3 h-3 mr-1" />
                          {language === 'he' ? 'משתמש' : 'User'}
                        </>
                      )}
                    </Badge>

                    {user.email !== currentUser.email && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showInvitePreview} onOpenChange={setShowInvitePreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {language === 'he' ? 'שלח הזמנה' : 'Send Invitation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-2">
                {language === 'he' ? '📧 בחר איך לשלוח (אופציות שעובדות):' : '📧 Choose how to send (working options):'}
              </p>
              <ol className={`list-decimal space-y-2 ${language === 'he' ? 'mr-4' : 'ml-4'}`}>
                <li className="font-semibold">
                  {language === 'he' ? '🎯 מומלץ ביותר: הורד קובץ HTML' : '🎯 Most Recommended: Download HTML file'}
                  <p className="font-normal text-xs mt-1">
                    {language === 'he' 
                      ? 'פתח את הקובץ בדפדפן, לחץ Ctrl+A (בחר הכל), לחץ Ctrl+C (העתק), והדבק באימייל'
                      : 'Open file in browser, press Ctrl+A (select all), press Ctrl+C (copy), and paste in email'}
                  </p>
                </li>
                <li>
                  {language === 'he' ? '💬 שלח רק את הקישור דרך WhatsApp או SMS' : '💬 Send just the link via WhatsApp or SMS'}
                  <p className="font-normal text-xs mt-1">
                    {language === 'he' 
                      ? `הקישור: ${window.location.origin}`
                      : `Link: ${window.location.origin}`}
                  </p>
                </li>
                <li>
                  {language === 'he' ? '📋 העתק HTML וצור אימייל חדש ידנית' : '📋 Copy HTML and create new email manually'}
                  <p className="font-normal text-xs mt-1">
                    {language === 'he' 
                      ? 'לחץ "העתק HTML", פתח Gmail/Outlook, צור אימייל חדש, והדבק'
                      : 'Click "Copy HTML", open Gmail/Outlook, create new email, and paste'}
                  </p>
                </li>
              </ol>
            </div>

            <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: generatedInviteHTML }} />
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInvitePreview(false);
                  setCopied(false);
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={copyAppLink}
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {language === 'he' ? 'העתק קישור למערכת' : 'Copy App Link'}
              </Button>
              <Button
                onClick={downloadHTMLFile}
                className="bg-green-600 hover:bg-green-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {language === 'he' ? 'הורד HTML (מומלץ)' : 'Download HTML (Recommended)'}
              </Button>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="border-orange-600 text-orange-600 hover:bg-orange-50"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {language === 'he' ? 'הועתק!' : 'Copied!'}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    {language === 'he' ? 'העתק HTML' : 'Copy HTML'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}