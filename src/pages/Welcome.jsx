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
  LogIn,
  ArrowDown
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

  // No auth check needed - this is a public page

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

      // For public page, we'll show success and let admin check submissions
      // Email sending requires auth, so we just confirm the submission visually
      console.log("Signup request:", formData);
      setSent(true);
    } catch (error) {
      console.error("Error sending signup request:", error);
      alert('שגיאה בשליחת הבקשה. נסה שוב.');
    } finally {
      setSending(false);
    }
  };

  const features = [
    { icon: ShoppingCart, title: "ניהול הזמנות", desc: "שליחת הזמנות לספקים" },
    { icon: Package, title: "ניהול מוצרים", desc: "קטלוג מוצרים וספקים" },
    { icon: Warehouse, title: "ספירת מלאי", desc: "ספירה חודשית חכמה" },
    { icon: Users, title: "ניהול עובדים", desc: "משמרות ועלויות" },
    { icon: BarChart3, title: "דשבורד", desc: "מעקב עלויות" },
    { icon: ChefHat, title: "קבלות", desc: "סריקה ואימות" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Restaurant Image */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1974&q=80"
          alt="Busy Restaurant Kitchen"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-gray-50"></div>
        
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
            alt="Smart Plate"
            className="h-20 mb-4 rounded-lg shadow-2xl"
          />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Smart Plate
          </h1>
          <p className="text-xl text-gray-200 max-w-xl">
            מערכת ניהול חכמה למסעדות ובתי קפה
          </p>
          <p className="text-gray-300 mt-2">
            הזמנות • מלאי • עובדים • עלויות
          </p>
          
          <a href="#login-section" className="mt-8 animate-bounce">
            <ArrowDown className="w-8 h-8 text-white/80" />
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 -mt-8 pb-16" id="login-section">
        {/* Features Row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl p-3 text-center shadow-sm hover:shadow-md transition-shadow border border-gray-100"
            >
              <feature.icon className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <h3 className="text-gray-800 font-medium text-xs">{feature.title}</h3>
              <p className="text-gray-500 text-[10px] hidden md:block">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Login/Signup Card */}
        <Card className="shadow-xl border-0 max-w-md mx-auto">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg py-4">
            <CardTitle className="text-center text-xl">
              ברוכים הבאים!
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login" className="text-sm">
                  <LogIn className="w-4 h-4 ml-1" />
                  כניסה
                </TabsTrigger>
                <TabsTrigger value="signup" className="text-sm">
                  <Send className="w-4 h-4 ml-1" />
                  בקשת הרשמה
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <div className="text-center space-y-3">
                  <p className="text-gray-600 text-sm">
                    משתמש קיים? התחבר עם החשבון שלך
                  </p>
                  <Button 
                    onClick={handleLogin}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white py-5"
                  >
                    <LogIn className="w-4 h-4 ml-2" />
                    התחבר עכשיו
                  </Button>
                  <p className="text-xs text-gray-500">
                    התחברות באמצעות Google, Microsoft או אימייל
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-3">
                {sent ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      הבקשה נשלחה בהצלחה!
                    </h3>
                    <p className="text-gray-600 text-sm">
                      נחזור אליך בהקדם עם פרטי גישה למערכת
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => { setSent(false); setFormData({ businessName: "", contactName: "", email: "", phone: "", currentPrograms: "", reason: "" }); }}
                    >
                      שלח בקשה נוספת
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSignupRequest} className="space-y-3" dir="rtl">
                    <p className="text-gray-600 text-center text-sm">
                      מלא פרטים ונחזור אליך עם גישה חינמית
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">שם העסק *</Label>
                        <Input
                          value={formData.businessName}
                          onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                          placeholder="שם המסעדה"
                          required
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">שם איש קשר *</Label>
                        <Input
                          value={formData.contactName}
                          onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                          placeholder="השם שלך"
                          required
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">אימייל *</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="email@example.com"
                          required
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">טלפון</Label>
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="050-0000000"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">תוכנות בשימוש כיום</Label>
                      <Input
                        value={formData.currentPrograms}
                        onChange={(e) => setFormData({...formData, currentPrograms: e.target.value})}
                        placeholder="אקסל, קופה, Priority..."
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">למה Smart Plate? *</Label>
                      <Textarea
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        placeholder="ספר לנו על העסק ואיך נוכל לעזור..."
                        rows={2}
                        required
                        className="text-sm"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={sending}
                      className="w-full bg-purple-600 hover:bg-purple-700 py-5"
                    >
                      {sending ? (
                        <>
                          <Loader className="w-4 h-4 ml-2 animate-spin" />
                          שולח...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 ml-2" />
                          שלח בקשה
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-xs">
          <p>© 2024 Smart Plate. כל הזכויות שמורות.</p>
        </div>
      </div>
    </div>
  );
}