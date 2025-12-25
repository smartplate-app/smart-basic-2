import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function Welcome() {
  const handleSignIn = async () => {
    // Redirect to the standard login screen; after login go to Orders
    await base44.auth.redirectToLogin('/pages/Orders');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border p-8 text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-2xl tracking-widest">B</span>
          </div>
          <div className="ml-4 text-left">
            <div className="text-3xl font-extrabold tracking-tight leading-none">basic</div>
            <div className="text-sm text-gray-500 -mt-0.5">by Smart Plate</div>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Smart Plate basic</h1>
        <p className="text-gray-700 leading-relaxed mb-8 text-lg">
          welcome to smart Plate basic המערכת הכי יעילה בישראל לביצוע הזמנות מספקים ויצירת סידור עבודה שבועי, הזמנות בווצאפ, סריקת חשבוניות , ומשלוח לרואה חשבון. דאשבורד חודשי שמראה לך בדיוק מה מצב עלויות כוח האדם והקניינות שלך מתחילת החודש והאם עברת 60% ביחד או לא, חיבור ישיר ל דוגל דרייב שלך, הרשאות יוזרים שונות, המערכת החכמה והיעילה בישראל, ב 200 שקלים בחודש בלבד, לקבלת יוזר לחודש ניסיון חינם, שלחו מייל ל admin@smartplate.org או התקשרו ל 0584584867
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={handleSignIn} className="bg-gray-900 hover:bg-gray-800">
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}