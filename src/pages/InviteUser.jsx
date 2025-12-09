import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Mail, Loader } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

export default function InviteUserPage() {
  const { t, language } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteeEmail, setInviteeEmail] = useState("");
  const [inviteeName, setInviteeName] = useState("");
  const [role, setRole] = useState("manager");
  const [generatedHTML, setGeneratedHTML] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = () => {
    if (!inviteeEmail || !inviteeName) {
      alert(language === 'he' ? 'נא למלא את כל השדות' : 'Please fill all fields');
      return;
    }

    // Create a long encoded link with restaurant data
    const restaurantData = {
      ownerEmail: user.email,
      restaurantName: user.business_name || user.full_name,
      restaurantAddress: user.business_address || '',
      restaurantLogo: user.restaurant_logo || '',
      inviteeName: inviteeName,
      inviteeEmail: inviteeEmail,
      role: role
    };

    const encodedData = btoa(JSON.stringify(restaurantData));
    const link = `${window.location.origin}/pages/JoinRestaurant?data=${encodedData}`;
    setInviteLink(link);

    // Generate HTML email template
    const html = `
<!DOCTYPE html>
<html dir="${language === 'he' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${language === 'he' ? '🎉 הזמנה להצטרף למסעדה' : '🎉 Restaurant Invitation'}</h1>
    </div>
    <div class="content">
      <p>${language === 'he' ? 'שלום' : 'Hello'} ${inviteeName},</p>
      
      <p>${language === 'he' ? `הוזמנת להצטרף למסעדת <strong>${user.business_name || user.full_name}</strong> כ${role === 'manager' ? 'מנהל' : 'עובד'}.` : `You've been invited to join <strong>${user.business_name || user.full_name}</strong> as a ${role}.`}</p>
      
      <p>${language === 'he' ? 'לחץ על הכפתור למטה כדי להצטרף:' : 'Click the button below to join:'}</p>
      
      <div style="text-align: center;">
        <a href="${link}" class="button">${language === 'he' ? '🔗 הצטרף עכשיו' : '🔗 Join Now'}</a>
      </div>
      
      <p style="color: #666; font-size: 12px;">${language === 'he' ? 'או העתק והדבק את הקישור הזה בדפדפן:' : 'Or copy and paste this link in your browser:'}</p>
      <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px; font-size: 11px;">${link}</p>
      
      <div class="footer">
        <p>${language === 'he' ? 'בברכה,' : 'Best regards,'}<br/><strong>${user.full_name}</strong><br/>${user.business_name || ''}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    setGeneratedHTML(html);
  };

  const copyHTML = () => {
    navigator.clipboard.writeText(generatedHTML);
    alert(language === 'he' ? '✅ HTML הועתק! הדבק אותו במייל שלך' : '✅ HTML copied! Paste it in your email');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    alert(language === 'he' ? '✅ קישור הועתק!' : '✅ Link copied!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          {language === 'he' ? '✉️ הזמן משתמש למסעדה' : '✉️ Invite User to Restaurant'}
        </h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{language === 'he' ? 'פרטי המוזמן' : 'Invitee Details'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{language === 'he' ? 'שם מלא' : 'Full Name'}</Label>
              <Input
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
                placeholder={language === 'he' ? 'יוסי כהן' : 'John Doe'}
              />
            </div>

            <div>
              <Label>{language === 'he' ? 'אימייל' : 'Email'}</Label>
              <Input
                type="email"
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <Label>{language === 'he' ? 'תפקיד' : 'Role'}</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">{language === 'he' ? 'מנהל' : 'Manager'}</SelectItem>
                  <SelectItem value="worker">{language === 'he' ? 'עובד' : 'Worker'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generateInvite} className="w-full bg-purple-600 hover:bg-purple-700">
              <Mail className="w-4 h-4 mr-2" />
              {language === 'he' ? 'צור הזמנה' : 'Generate Invitation'}
            </Button>
          </CardContent>
        </Card>

        {generatedHTML && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{language === 'he' ? '📧 קוד HTML למייל' : '📧 HTML Email Code'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {language === 'he' 
                    ? 'העתק את הקוד למטה והדבק אותו ב-Gmail (Ctrl+Shift+V או לחץ ימני > Paste)'
                    : 'Copy the code below and paste it in Gmail (Ctrl+Shift+V or right-click > Paste)'}
                </p>
                <div className="bg-gray-100 p-4 rounded border max-h-64 overflow-auto mb-4">
                  <code className="text-xs whitespace-pre-wrap">{generatedHTML}</code>
                </div>
                <Button onClick={copyHTML} variant="outline" className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  {language === 'he' ? 'העתק HTML' : 'Copy HTML'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{language === 'he' ? '🔗 קישור ישיר (אופציונלי)' : '🔗 Direct Link (Optional)'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {language === 'he' 
                    ? 'או העתק רק את הקישור ושלח אותו ב-WhatsApp/SMS'
                    : 'Or copy just the link and send it via WhatsApp/SMS'}
                </p>
                <div className="bg-gray-100 p-3 rounded border mb-4 break-all text-xs">
                  {inviteLink}
                </div>
                <Button onClick={copyLink} variant="outline" className="w-full">
                  <Copy className="w-4 h-4 mr-2" />
                  {language === 'he' ? 'העתק קישור' : 'Copy Link'}
                </Button>
              </CardContent>
            </Card>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">
                {language === 'he' ? '📝 הוראות שליחה ב-Gmail:' : '📝 Gmail Instructions:'}
              </h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>{language === 'he' ? 'לחץ על "העתק HTML" למעלה' : 'Click "Copy HTML" above'}</li>
                <li>{language === 'he' ? 'פתח Gmail וצור מייל חדש' : 'Open Gmail and compose a new email'}</li>
                <li>{language === 'he' ? 'הדבק את הקוד בגוף המייל (Ctrl+Shift+V)' : 'Paste the code in the email body (Ctrl+Shift+V)'}</li>
                <li>{language === 'he' ? 'שלח למוזמן!' : 'Send to invitee!'}</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}