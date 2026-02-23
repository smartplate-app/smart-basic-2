import React from "react";
import { base44 } from "@/api/base44Client";
import AccessRequestDialog from "../components/access/AccessRequestDialog";
import { Button } from "@/components/ui/button";

// Pure public marketing page: never checks auth or redirects
export default function WelcomePublic() {
  const [openRequest, setOpenRequest] = React.useState(false);

  const handleSignIn = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPreview = urlParams.get('preview') === '1';
    
    if (isPreview) {
      alert('Sign in is not available in preview mode');
      return;
    }
    
    base44.auth.redirectToLogin('/pages/Orders');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border p-4 sm:p-6 md:p-8 text-center">
        <div className="flex items-center justify-center mb-4 sm:mb-6 gap-2 sm:gap-4 flex-wrap">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg"
            alt="Smart Plate Logo"
            className="h-10 sm:h-12 w-auto object-contain"
          />
          <span className="text-gray-300 text-xl sm:text-2xl">+</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg sm:text-xl tracking-widest">B</span>
            </div>
            <div className="text-left">
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none">basic</div>
              <div className="text-xs sm:text-sm text-gray-500 -mt-0.5">by Smart Plate</div>
            </div>
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">Smart Plate basic</h1>
        <p className="text-gray-700 leading-relaxed mb-6 sm:mb-8 text-base sm:text-lg px-2">
          המערכת הכי יעילה בישראל לביצוע הזמנות מספקים ויצירת סידור עבודה שבועי, הזמנות בווצאפ, סריקת חשבוניות, ומשלוח לרואה חשבון. דאשבורד חודשי שמראה לך בדיוק מה מצב עלויות כוח האדם והקניינות שלך מתחילת החודש והאם עברת 60% או לא. המערכת החכמה והיעילה בישראל.
        </p>
        <a href="mailto:admin@smartplate.org" className="block text-xl sm:text-2xl md:text-3xl font-extrabold text-blue-600 hover:text-blue-700 hover:underline mb-6 sm:mb-8 break-all px-2">
          admin@smartplate.org
        </a>
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-2">
          <div className="text-xs sm:text-sm text-gray-500 text-center">If you already have access, click Sign in. Otherwise, request access and we'll enable your account.</div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button onClick={handleSignIn} className="bg-gray-900 hover:bg-gray-800 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2.5">Sign in</Button>
            <Button variant="outline" onClick={() => setOpenRequest(true)} className="w-full sm:w-auto text-sm sm:text-base py-2 sm:py-2.5">Request access</Button>
          </div>
        </div>
      </div>
      <AccessRequestDialog open={openRequest} onOpenChange={setOpenRequest} />
    </div>
  );
}