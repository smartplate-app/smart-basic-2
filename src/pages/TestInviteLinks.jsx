import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Loader, ExternalLink, AlertCircle } from "lucide-react";

export default function TestInviteLinksPage() {
  const [inviteLink, setInviteLink] = useState("");
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      if (currentUser.role !== 'admin') {
        window.location.href = '/#/pages/Orders';
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const extractToken = (link) => {
    try {
      const url = new URL(link);
      return url.searchParams.get('invite') || url.searchParams.get('token');
    } catch (error) {
      // If not a valid URL, assume it's just the token
      return link.trim();
    }
  };

  const handleTest = async () => {
    if (!inviteLink.trim()) {
      alert('נא להזין לינק הזמנה');
      return;
    }

    try {
      setTesting(true);
      setResult(null);

      const token = extractToken(inviteLink);
      
      if (!token) {
        setResult({
          success: false,
          error: 'לא נמצא טוקן בלינק',
          details: null
        });
        setTesting(false);
        return;
      }

      // Verify the invite token
      const response = await base44.functions.invoke('verifyInviteToken', { token });

      if (response.data.success && response.data.invite) {
        setResult({
          success: true,
          invite: response.data.invite,
          token: token
        });
      } else {
        setResult({
          success: false,
          error: response.data.error || 'טוקן לא תקף',
          details: null
        });
      }
    } catch (error) {
      console.error('Error testing invite:', error);
      setResult({
        success: false,
        error: error.message || 'שגיאה בבדיקת הטוקן',
        details: null
      });
    } finally {
      setTesting(false);
    }
  };

  const openInIncognito = () => {
    const token = extractToken(inviteLink);
    const registerUrl = `${window.location.origin}/#/pages/Register?invite=${token}`;
    
    alert('פתח את הלינק הזה בחלון אינקוגניטו חדש:\n\n' + registerUrl);
    
    // Copy to clipboard
    navigator.clipboard.writeText(registerUrl);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">בדיקת לינקי הזמנה</h1>
          <p className="text-gray-600">בדוק אם לינק הזמנה תקף וראה את הפרטים שלו</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-right">הזן לינק הזמנה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-right block mb-2">לינק או טוקן הזמנה</Label>
              <Input
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="הדבק כאן את לינק ההזמנה המלא או רק את הטוקן..."
                className="text-right"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button
                onClick={handleTest}
                disabled={testing || !inviteLink.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {testing ? (
                  <>
                    <Loader className="w-4 h-4 ml-2 animate-spin" />
                    בודק...
                  </>
                ) : (
                  'בדוק לינק'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardHeader>
              <CardTitle className="flex items-center justify-end gap-2">
                {result.success ? (
                  <>
                    <span>לינק תקף ✓</span>
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </>
                ) : (
                  <>
                    <span>לינק לא תקף ✗</span>
                    <XCircle className="w-6 h-6 text-red-600" />
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.success ? (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h3 className="font-bold text-gray-900 mb-3 text-right">פרטי ההזמנה</h3>
                    <div className="space-y-2 text-right">
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-700">{result.invite.full_name}</span>
                        <span className="text-gray-500">שם:</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-700">{result.invite.email}</span>
                        <span className="text-gray-500">אימייל:</span>
                      </div>
                      {result.invite.phone && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">{result.invite.phone}</span>
                          <span className="text-gray-500">טלפון:</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-700">
                          {result.invite.invite_type === 'chain_store' ? 'מנהל סניף ברשת' : 'משתמש במסעדה'}
                        </span>
                        <span className="text-gray-500">סוג הזמנה:</span>
                      </div>
                      {result.invite.role && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">
                            {result.invite.role === 'manager' ? 'מנהל' : 'עובד'}
                          </span>
                          <span className="text-gray-500">תפקיד:</span>
                        </div>
                      )}
                      {result.invite.store_name && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">{result.invite.store_name}</span>
                          <span className="text-gray-500">מסעדה:</span>
                        </div>
                      )}
                      {result.invite.restaurant_name && (
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-700">{result.invite.restaurant_name}</span>
                          <span className="text-gray-500">שם מסעדה:</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-700">{result.invite.inviter_name}</span>
                        <span className="text-gray-500">מוזמן על ידי:</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={`font-semibold ${result.invite.used ? 'text-red-600' : 'text-green-600'}`}>
                          {result.invite.used ? 'כן ✓' : 'לא'}
                        </span>
                        <span className="text-gray-500">נעשה שימוש:</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">
                          {new Date(result.invite.expires_at).toLocaleDateString('he-IL')}
                        </span>
                        <span className="text-gray-500">תוקף עד:</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 text-right">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-800 mb-2">לבדיקת הלינק באינקוגניטו:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                          <li>פתח חלון אינקוגניטו/פרטי חדש (Ctrl+Shift+N / Cmd+Shift+N)</li>
                          <li>לחץ על "פתח באינקוגניטו" למטה</li>
                          <li>הדבק את הלינק בחלון האינקוגניטו</li>
                          <li>בדוק שהתהליך עובד נכון</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={openInIncognito}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    <ExternalLink className="w-4 h-4 ml-2" />
                    פתח באינקוגניטו (הועתק ללוח)
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 border border-red-200 text-right">
                  <p className="text-red-700 font-semibold mb-2">שגיאה:</p>
                  <p className="text-red-600">{result.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-right text-blue-900">💡 טיפים לבדיקה</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-blue-800 text-right">
              <li>כל לינק הזמנה הוא חד פעמי - ברגע שמשתמשים בו הוא נסגר</li>
              <li>תמיד תבדוק בחלון אינקוגניטו כדי לוודא שהמטמון לא משפיע</li>
              <li>אפשר לבדוק לינק כמה פעמים באינקוגניטו עד שמישהו ממש משלים הרשמה</li>
              <li>אם הלינק נעשה שימוש בו, תצטרך ליצור לינק חדש לאותו אדם</li>
              <li>לינקים תקפים ל-7 ימים מרגע היצירה</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}