import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

export default function PreviewLogin() {
  const [msg, setMsg] = useState("Ready for incognito login");
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    const inFrame = (() => { try { return window.top !== window.self; } catch { return true; } })();
    setInIframe(inFrame);
    // Ensure no cached session is used in this context
    try {
      sessionStorage.setItem('b44_logout_in_progress', '1');
      localStorage.removeItem('b44_user_cache');
      sessionStorage.removeItem('b44_oauth_in_progress');
      sessionStorage.removeItem('b44_oauth_finalized');
    } catch {}
  }, []);

  const handleLogin = async () => {
    try {
      setMsg('Opening login…');
      await base44.auth.redirectToLogin('/pages/Orders');
    } catch (e) {
      setMsg(e?.message || String(e));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow border p-6 text-center">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" alt="Logo" className="h-10 mx-auto mb-3" />
        <h1 className="text-xl font-bold mb-2">Incognito Login Preview</h1>
        <p className="text-gray-600 text-sm mb-4">This preview runs in a sandboxed iframe without your admin cookies.</p>
        <p className="text-xs text-gray-500 mb-4">{msg}</p>
        <Button onClick={handleLogin} className="bg-gray-900 hover:bg-gray-800 w-full">Open Google Login</Button>
        {!inIframe && (
          <p className="text-[11px] text-gray-500 mt-3">Tip: This page is designed for the Emulator iframe.</p>
        )}
      </div>
    </div>
  );
}