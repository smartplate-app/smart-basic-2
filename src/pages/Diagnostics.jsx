import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Diagnostics() {
  const [envInfo, setEnvInfo] = useState({});
  const [authStatus, setAuthStatus] = useState({ checked: false, authed: false, me: null, error: null, ms: 0 });
  const [flags, setFlags] = useState({ forceHash: false, disableHistory: false, forceLite: false });
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState("");
  const [note, setNote] = useState("");

  // Gather environment and platform signals
  useEffect(() => {
    const info = {};
    try { info.userAgent = navigator.userAgent; } catch {}
    try { info.language = navigator.language; } catch {}
    try { info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
    try { info.deviceMemory = ("deviceMemory" in navigator) ? navigator.deviceMemory : "n/a"; } catch {}
    try { info.onLine = navigator.onLine; } catch {}
    try { info.historyReplaceAvailable = typeof history.replaceState === 'function'; } catch {}
    try { info.hasHash = !!window.location.hash; info.hash = window.location.hash; } catch {}
    try { info.path = window.location.pathname; info.search = window.location.search; info.href = window.location.href; } catch {}
    try {
      const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      // @ts-ignore iOS Safari only
      const iosStandalone = 'standalone' in navigator && navigator.standalone;
      info.pwaInstalled = Boolean(standalone || iosStandalone);
    } catch {}
    try {
      info.localStorageWritable = false;
      const k = '__diag_test__';
      localStorage.setItem(k, '1');
      localStorage.removeItem(k);
      info.localStorageWritable = true;
    } catch {}
    try {
      info.sessionStorageWritable = false;
      const k = '__diag_sess__';
      sessionStorage.setItem(k, '1');
      sessionStorage.removeItem(k);
      info.sessionStorageWritable = true;
    } catch {}
    try {
      info.estimate = {};
      if ('storage' in navigator && navigator.storage?.estimate) {
        // Quota often very small in incognito WebViews
        info.estimate = navigator.storage.estimate();
      }
    } catch {}

    setEnvInfo(info);

    // Load existing flags
    try {
      setFlags({
        forceHash: localStorage.getItem('b44_emulate_force_hash') === '1',
        disableHistory: localStorage.getItem('b44_emulate_disable_history') === '1',
        forceLite: localStorage.getItem('b44_emulate_force_lite') === '1',
      });
    } catch {}
  }, []);

  // Probe auth reliably without causing loops
  useEffect(() => {
    let did = false;
    (async () => {
      const t0 = performance.now();
      try {
        const authed = await base44.auth.isAuthenticated();
        let me = null;
        if (authed) {
          try { me = await base44.auth.me(); } catch {}
        }
        if (!did) setAuthStatus({ checked: true, authed, me, error: null, ms: Math.round(performance.now() - t0) });
      } catch (e) {
        if (!did) setAuthStatus({ checked: true, authed: false, me: null, error: e?.message || String(e), ms: Math.round(performance.now() - t0) });
      }
    })();
    return () => { did = true; };
  }, []);

  const report = useMemo(() => {
    const now = new Date().toISOString();
    const flagsSnapshot = {
      force_hash: flags.forceHash,
      disable_history: flags.disableHistory,
      force_lite: flags.forceLite,
      oauth_in_progress: (()=>{ try { return sessionStorage.getItem('b44_oauth_in_progress') === '1'; } catch { return false; } })(),
      oauth_finalized: (()=>{ try { return sessionStorage.getItem('b44_oauth_finalized') === '1'; } catch { return false; } })(),
    };
    return {
      ts: now,
      note: note || undefined,
      env: envInfo,
      flags: flagsSnapshot,
      auth: {
        checked: authStatus.checked,
        authed: authStatus.authed,
        me_email: authStatus.me?.email || null,
        me_role: authStatus.me?.role || null,
        ms: authStatus.ms,
        error: authStatus.error || null,
      },
    };
  }, [envInfo, authStatus, flags, note]);

  const saveFlag = (key, val) => {
    try { if (val) localStorage.setItem(key, '1'); else localStorage.removeItem(key); } catch {}
  };

  const toggleFlag = (k) => {
    const next = { ...flags };
    next[k] = !next[k];
    setFlags(next);
    if (k === 'forceHash') saveFlag('b44_emulate_force_hash', next[k]);
    if (k === 'disableHistory') saveFlag('b44_emulate_disable_history', next[k]);
    if (k === 'forceLite') saveFlag('b44_emulate_force_lite', next[k]);
  };

  const clearOAuthFlags = () => {
    try { sessionStorage.removeItem('b44_oauth_in_progress'); } catch {}
    try { sessionStorage.removeItem('b44_oauth_finalized'); } catch {}
    alert('Cleared OAuth flags');
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      alert('Report copied');
    } catch {
      alert('Copy failed');
    }
  };

  const uploadReport = async () => {
    try {
      setUploading(true);
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const file = new File([blob], `diagnostics-${Date.now()}.json`, { type: 'application/json' });
      const { data: up } = await base44.integrations.Core.UploadPrivateFile({ file });
      const file_uri = up?.file_uri;
      if (!file_uri) throw new Error('Upload failed');
      const { data: link } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 600 });
      if (!link?.signed_url) throw new Error('Signed URL failed');
      setSignedUrl(link.signed_url);
    } catch (e) {
      alert(`Upload failed: ${e?.message || e}`);
    } finally {
      setUploading(false);
    }
  };

  const restartToWelcome = () => {
    // Ensure we land on public, hash-based welcome
    window.location.replace('/#/pages/WelcomePublic');
  };

  const applyHashOnCurrent = () => {
    try {
      const current = new URL(window.location.href);
      const pageName = (current.pathname.split('/').pop() || '').trim();
      if (pageName) {
        window.location.replace(`/#/pages/${pageName}${current.search}`);
      } else {
        window.location.replace('/#/pages/WelcomePublic');
      }
    } catch {
      window.location.replace('/#/pages/WelcomePublic');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Device Diagnostics</h1>
          <p className="text-gray-600 text-sm">Use this to stabilize fragile WebViews/APKs. This page is hidden—open via /#/pages/Diagnostics.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button onClick={() => toggleFlag('forceHash')} className={flags.forceHash ? 'bg-green-600 hover:bg-green-700' : ''}>
                {flags.forceHash ? 'Hash Mode: ON' : 'Force Hash Mode' }
              </Button>
              <Button onClick={() => toggleFlag('disableHistory')} className={flags.disableHistory ? 'bg-green-600 hover:bg-green-700' : ''}>
                {flags.disableHistory ? 'History Safe: ON' : 'Disable history.replaceState'}
              </Button>
              <Button onClick={() => toggleFlag('forceLite')} className={flags.forceLite ? 'bg-green-600 hover:bg-green-700' : ''}>
                {flags.forceLite ? 'Lite Mode: ON' : 'Enable Lite Mode'}
              </Button>
              <Button variant="outline" onClick={clearOAuthFlags}>Clear OAuth Flags</Button>
              <Button variant="outline" onClick={applyHashOnCurrent}>Re-open current via #/pages/...</Button>
              <Button variant="outline" onClick={restartToWelcome}>Restart to WelcomePublic</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Auth probe</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div>Status: {authStatus.checked ? (authStatus.authed ? 'Authenticated' : 'Not authenticated') : 'Checking...'}</div>
            {authStatus.me?.email && <div>Email: <span className="font-mono">{authStatus.me.email}</span></div>}
            {authStatus.me?.role && <div>Role: <span className="font-mono">{authStatus.me.role}</span></div>}
            <div>Latency: {authStatus.ms} ms</div>
            {authStatus.error && (
              <div className="text-red-600 break-all">Error: {authStatus.error}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <pre className="bg-white rounded-md p-3 border overflow-auto max-h-64">{JSON.stringify(envInfo, null, 2)}</pre>
            <div className="space-y-1">
              <div className="text-sm font-medium">Add a short note</div>
              <Input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="e.g., Samsung A54 APK build, stuck after Google login" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <pre className="bg-white rounded-md p-3 border overflow-auto max-h-72">{JSON.stringify(report, null, 2)}</pre>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyReport}>Copy to Clipboard</Button>
              <Button variant="outline" onClick={uploadReport} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload (private)'}</Button>
              {signedUrl && (
                <a href={signedUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">Open uploaded log (temporary)</a>
              )}
            </div>
            <div className="text-[11px] text-gray-500">Private upload link expires after ~10 minutes.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}