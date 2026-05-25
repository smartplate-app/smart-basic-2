import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm text-center">
        <Loader2 className="h-10 w-10 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    </div>
  );
}