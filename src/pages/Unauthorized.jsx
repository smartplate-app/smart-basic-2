import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, Mail } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function UnauthorizedPage() {
  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="bg-red-50 border-b text-center">
          <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-red-700 text-xl">
            Access Denied / הגישה נדחתה
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4 text-center">
          <p className="text-gray-700">
            You are not authorized to access this application.
          </p>
          <p className="text-gray-700" dir="rtl">
            אין לך הרשאה לגשת לאפליקציה זו.
          </p>
          
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm">
            <div className="flex items-center justify-center gap-2 text-yellow-800 mb-2">
              <Mail className="w-4 h-4" />
              <span className="font-semibold">Need Access? / צריך גישה?</span>
            </div>
            <p className="text-yellow-700">
              Contact the restaurant administrator to receive an invitation.
            </p>
            <p className="text-yellow-700" dir="rtl">
              פנה למנהל המסעדה כדי לקבל הזמנה.
            </p>
          </div>

          <Button onClick={handleLogout} className="w-full bg-gray-900 hover:bg-gray-800">
            Try Different Account / נסה חשבון אחר
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}