import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

export default function OAuthCallback() {
  const [message, setMessage] = useState("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Mark flow in progress (avoids layout redirects)
        try { sessionStorage.setItem('b44_oauth_in_progress', '1'); } catch {}

        // Strip code/state from URL to avoid re-triggering on reload
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has('code') || url.searchParams.has('state')) {
            url.searchParams.delete('code');
            url.searchParams.delete('state');
            window.history.replaceState({}, '', url.pathname + url.search + url.hash);
          }
        } catch {}

        // Poll auth (slow WebViews/old Chrome may need extra time)
        for (let i = 0; i < 8 && !cancelled; i++) {
          try {
            const authed = await base44.auth.isAuthenticated();
            if (authed) {
              try { await base44.auth.me(); } catch {}
              const target = createPageUrl('Orders');
              try { window.history.replaceState({}, '', target); } catch {}
              window.location.replace(target);
              return;
            }
          } catch {}
          const delay = Math.min(400 * Math.pow(1.6, i), 1800);
          await new Promise(r => setTimeout(r, delay));
          setMessage(i > 3 ? "Still working… almost there" : "Finishing sign-in…");
        }

        // If we got here, session didn't attach. Offer a clean retry to Google login
        setMessage("Couldn’t complete sign-in. Please try again.");
      } finally {
        // Clear flag after a short grace period
        setTimeout(() => { try { sessionStorage.removeItem('b44_oauth_in_progress'); } catch {} }, 3000);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-gray-900 mb-2">{message}</h1>
        <p className="text-sm text-gray-500 mb-4">If this takes more than 10 seconds, tap Retry.</p>
        <button
          onClick={() => {
            try { sessionStorage.setItem('b44_oauth_in_progress', '1'); } catch {}
            base44.auth.redirectToLogin(createPageUrl('Orders'));
          }}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800"
        >
          Retry Google Sign‑in
        </button>
      </div>
    </div>
  );
}