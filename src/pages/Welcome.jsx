import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChefHat, 
  BarChart3, 
  Users, 
  Package, 
  ShoppingCart, 
  Warehouse,
  CheckCircle,
  Send,
  Loader,
  LogIn
} from "lucide-react";

export default function WelcomePage() {
  const [activeTab, setActiveTab] = useState("login");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    currentPrograms: "",
    reason: ""
  });

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated();
        if (isAuthenticated) {
          window.location.href = '/pages/Orders';
        }
      } catch (e) {
        // Not authenticated, stay on welcome page
      }
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    base44.auth.redirectToLogin('/pages/Orders');
  };

  const handleSignupRequest = async (e) => {
    e.preventDefault();
    
    if (!formData.businessName || !formData.contactName || !formData.email || !formData.reason) {
      alert('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      setSending(true);
      
      const emailBody = `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #1f2937;">בקשת הרשמה חדשה ל-Smart Plate</h2>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
          
          <p><strong>שם העסק:</strong> ${formData.businessName}</p>
          <p><strong>שם איש קשר:</strong> ${formData.contactName}</p>
          <p><strong>אימייל:</strong> ${formData.email}</p>
          <p><strong>טלפון:</strong> ${formData.phone || 'לא צוין'}</p>
          
          <h3 style="color: #6b7280; margin-top: 20px;">תוכנות בשימוש כיום:</h3>
          <p style="background: #f3f4f6; padding: 10px; border-radius: 8px;">
            ${formData.currentPrograms || 'לא צוין'}
          </p>
          
          <h3 style="color: #6b7280; margin-top: 20px;">סיבת ההרשמה:</h3>
          <p style="background: #f3f4f6; padding: 10px; border-radius: 8px;">
            ${formData.reason}
          </p>
        </div>
      `;

      await base44.integrations.Core.SendEmail({
        to: "admin@smartplate.org",
        subject: `בקשת הרשמה חדשה - ${formData.businessName}`,
        body: emailBody
      });

      setSent(true);
    } catch (error) {
      console.error("Error sending signup request:", error);
      alert('שגיאה בשליחת הבקשה. נסה שוב.');
    } finally {
      setSending(false);
    }
  };

  const features = [
    { icon: ShoppingCart, title: "ניהול הזמנות", desc: "שליחת הזמנות לספקים בוואטסאפ" },
    { icon: Package, title: "ניהול מוצרים", desc: "קטלוג מוצרים וספקים" },
    { icon: Warehouse, title: "ספירת מלאי", desc: "ספירת מלאי חודשית חכמה" },
    { icon: Users, title: "ניהול עובדים", desc: "משמרות ועלויות עבודה" },
    { icon: BarChart3, title: "דשבורד", desc: "מעקב אחר עלויות והוצאות" },
    { icon: ChefHat, title: "קבלות אספקה", desc: "סריקה ואימות קבלות" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
            alt="Smart Plate"
            className="h-24 md:h-32 mx-auto mb-6"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Smart Plate
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto">
            מערכת ניהול חכמה למסעדות ובתי קפה
          </p>
          <p className="text-lg text-purple-300 mt-2">
            הזמנות, מלאי, עובדים ועלויות - הכל במקום אחד
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center hover:bg-white/20 transition-all"
            >
              <feature.icon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-gray-400 text-xs">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Login/Signup Card */}
        <div className="max-w-lg mx-auto">
          <Card className="shadow-2xl border-0">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="text-center text-2xl">
                ברוכים הבאים!
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="text-base">
                    <LogIn className="w-4 h-4 ml-2" />
                    כניסה
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-base">
                    <Send className="w-4 h-4 ml-2" />
                    בקשת הרשמה
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <div className="text-center space-y-4">
                    <p className="text-gray-600">
                      משתמש קיים? התחבר עם החשבון שלך
                    </p>
                    <Button 
                      onClick={handleLogin}
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white py-6 text-lg"
                    >
                      <LogIn className="w-5 h-5 ml-2" />
                      התחבר עכשיו
                    </Button>
                    <p className="text-sm text-gray-500">
                      התחברות באמצעות Google, Microsoft או אימייל
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  {sent ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">
                        הבקשה נשלחה בהצלחה!
                      </h3>
                      <p className="text-gray-600">
                        נחזור אליך בהקדם האפשרי עם פרטי גישה למערכת
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => { setSent(false); setFormData({ businessName: "", contactName: "", email: "", phone: "", currentPrograms: "", reason: "" }); }}
                      >
                        שלח בקשה נוספת
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSignupRequest} className="space-y-4" dir="rtl">
                      <p className="text-gray-600 text-center mb-4">
                        מלא את הפרטים ונחזור אליך עם גישה חינמית למערכת
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>שם העסק *</Label>
                          <Input
                            value={formData.businessName}
                            onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                            placeholder="שם המסעדה/בית הקפה"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>שם איש קשר *</Label>
                          <Input
                            value={formData.contactName}
                            onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                            placeholder="השם שלך"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>אימייל *</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="your@email.com"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>טלפון</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="050-0000000"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>אילו תוכנות אתה משתמש כיום?</Label>
                        <Textarea
                          value={formData.currentPrograms}
                          onChange={(e) => setFormData({...formData, currentPrograms: e.target.value})}
                          placeholder="לדוגמה: אקסל, תוכנת קופה, Prioiry, וכו'..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>למה אתה רוצה להשתמש ב-Smart Plate? *</Label>
                        <Textarea
                          value={formData.reason}
                          onChange={(e) => setFormData({...formData, reason: e.target.value})}
                          placeholder="ספר לנו על העסק שלך ואיך נוכל לעזור..."
                          rows={3}
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={sending}
                        className="w-full bg-purple-600 hover:bg-purple-700 py-6 text-lg"
                      >
                        {sending ? (
                          <>
                            <Loader className="w-5 h-5 ml-2 animate-spin" />
                            שולח...
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5 ml-2" />
                            שלח בקשת הרשמה
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-gray-500 text-center">
                        * שדות חובה. הנתונים ישמשו רק ליצירת קשר
                      </p>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-400 text-sm">
            <p>© 2024 Smart Plate. כל הזכויות שמורות.</p>
            <p className="mt-1">מערכת ניהול מסעדות חכמה</p>
          </div>
        </div>
      </div>
    </div>
  );
}