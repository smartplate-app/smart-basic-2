import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function SignIn() {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm bg-white rounded-xl shadow border p-8 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-gray-600 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Redirecting to login…</h1>
        <p className="text-sm text-gray-600 mb-6">If nothing happens, click the button below.</p>
        <Button onClick={handleClick} className="bg-gray-900 hover:bg-gray-800 w-full">Continue to Sign in</Button>
      </div>
    </div>
  );
}