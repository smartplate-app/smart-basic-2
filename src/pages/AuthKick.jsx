import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";

export default function AuthKick() {
  const [phase, setPhase] = useState<'logout' | 'redirect' | 'error'>('logout');
  const [err, setErr] = useState('');
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Guard: avoid endless loops in embedded previews or rapid reloads
        const inFrame = (() => { try { return window.top !== window.self; } catch { return true; } })();
        setInIframe(inFrame);
        const params = new URLSearchParams(window.location.search);
        const noAuto = params.get('stop') === '1';
        const lastTs = Number(sessionStorage.getItem('b44_authkick_once') || '0');
        const recent = Date.now() - lastTs < 5000; // 5s one-time lock

        if (inFrame || noAuto || recent) {
          setPhase('error');
          setErr(inFrame ? 'Login disabled in embedded preview.' : 'Click the button to continue to login.');
          return;
        }

        // Ensure we are fully signed out, then jump straight to the platform login screen
        try {
          sessionStorage.setItem('b44_logout_in_progress', '1');
          localStorage.removeItem('b44_user_cache');
          sessionStorage.removeItem('b44_oauth_in_progress');
          sessionStorage.removeItem('b44_oauth_finalized');
          sessionStorage.setItem('b44_login_cooldown_until', String(Date.now() + 60 * 1000));
        } catch {}

        try { await base44.auth.logout(); } catch {}

        sessionStorage.setItem('b44_authkick_once', String(Date.now()));
        setPhase('redirect');
        const next = params.get('next') || createPageUrl('Orders');
        await base44.auth.redirectToLogin(next);
      } catch (e) {
        setErr(e?.message || String(e));
        setPhase('error');
      }
    })();
  }, []);

  const openLogin = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next') || createPageUrl('Orders');
      await base44.auth.redirectToLogin(next);
    } catch (e) {
      setErr(e?.message || String(e));
      setPhase('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow border p-6 text-center">
        <div className="mb-4">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" alt="Logo" className="h-10 mx-auto" />
        </div>
        <h1 className="text-xl font-bold mb-2">Opening Google Sign-in…</h1>
        {phase === 'logout' && <p className="text-gray-600">Signing out current session…</p>}
        {phase === 'redirect' && <p className="text-gray-600">Redirecting to Google…</p>}
        {phase === 'error' && (
          <div className="space-y-3">
            <p className="text-red-600 text-sm break-all">{err}</p>
            {!inIframe && (
              <Button onClick={openLogin} className="bg-gray-900 hover:bg-gray-800 w-full">Continue to Login</Button>
            )}
          </div>
        )}
        <div className="mt-4">
          {!inIframe && (
            <Button onClick={openLogin} variant="outline" className="w-full">Open Google Login</Button>
          )}
        </div>
      </div>
    </div>
  );
}