import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StoreLoginPage() {
  useEffect(() => {
    (async () => {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        window.location.replace(createPageUrl("Orders"));
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next") || params.get("nextUrl") || createPageUrl("Orders");
      await base44.auth.redirectToLogin(next);
    })();
  }, []);

  const handleClick = async () => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || params.get("nextUrl") || createPageUrl("Orders");
    await base44.auth.redirectToLogin(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
            alt="Smart Plate"
            className="h-16 mx-auto mb-4"
          />
          <CardTitle className="text-2xl text-gray-900">התחברות למערכת</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">מעביר לעמוד ההתחברות...</h1>
          <p className="text-sm text-gray-600 mb-6">אם לא הועברת אוטומטית, לחץ על הכפתור למטה.</p>
          <Button onClick={handleClick} className="w-full bg-gray-900 hover:bg-gray-800">
            המשך להתחברות
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}