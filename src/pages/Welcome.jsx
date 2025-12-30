import React from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function Welcome() {
  const handleSignIn = async () => {
    // If already authenticated, go straight in
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        window.location.href = '/pages/LaborCost';
        return;
      }
    } catch {}
    // Otherwise redirect to login and back
    await base44.auth.redirectToLogin('/pages/LaborCost');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border p-8 text-center">
        <div className="flex items-center justify-center mb-6 gap-4">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg"
            alt="Smart Plate Logo"
            className="h-12 w-auto object-contain"
          />
          <span className="text-gray-300 text-2xl">+</span>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-xl tracking-widest">B</span>
            </div>
            <div className="text-left">
              <div className="text-3xl font-extrabold tracking-tight leading-none">basic</div>
              <div className="text-sm text-gray-500 -mt-0.5">by Smart Plate</div>
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Welcome to Smart Plate basic</h1>
        <p className="text-gray-700 leading-relaxed mb-8 text-lg">
          המערכת הכי יעילה בישראל לביצוע הזמנות מספקים ויצירת סידור עבודה שבועי, הזמנות בווצאפ, סריקת חשבוניות, ומשלוח לרואה חשבון. דאשבורד חודשי שמראה לך בדיוק מה מצב עלויות כוח האדם והקניינות שלך מתחילת החודש והאם עברת 60% או לא. המערכת החכמה והיעילה בישראל.
        </p>
        <a href="mailto:admin@smartplate.org" className="block text-2xl md:text-3xl font-extrabold text-blue-600 hover:text-blue-700 hover:underline mb-8">
          admin@smartplate.org
        </a>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={handleSignIn} className="bg-gray-900 hover:bg-gray-800">
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}