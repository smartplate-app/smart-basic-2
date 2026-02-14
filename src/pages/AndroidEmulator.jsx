import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import PhonePreview from "../components/emulator/PhonePreview";

export default function AndroidEmulator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forceLite, setForceLite] = useState(false);
  const [disableHistory, setDisableHistory] = useState(false);
  const [forceHash, setForceHash] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(typeof window !== 'undefined' ? (window.location.origin + '/pages/Welcome') : '/pages/Welcome');

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } finally {
        setLoading(false);
        setForceLite(localStorage.getItem('b44_emulate_force_lite') === '1');
        setDisableHistory(localStorage.getItem('b44_emulate_disable_history') === '1');
        setForceHash(localStorage.getItem('b44_emulate_force_hash') === '1');
      }
    })();
  }, []);

  const saveFlag = (key, val) => {
    try {
      if (val) localStorage.setItem(key, '1');
      else localStorage.removeItem(key);
    } catch {}
  };

  const applyAndReload = () => {
    window.location.reload();
  };

  const simulateOAuthReturn = () => {
    // Append demo OAuth params to current URL to trigger the app's return flow
    const url = new URL(window.location.href);
    url.searchParams.set('code', 'demo');
    url.searchParams.set('state', 'demo');
    window.location.href = url.pathname + url.search + url.hash;
  };

  if (loading) return null;
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Admins only</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Android/Low-RAM Emulator</h1>
        <p className="text-gray-600">Toggle conditions to mimic older Android WebViews (e.g., Samsung A54/low RAM) and test the OAuth return flow.</p>

        <Card>
          <CardHeader>
            <CardTitle>Emulation Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Force Lite Mode</div>
                <div className="text-sm text-gray-500">Disables animations/effects globally.</div>
              </div>
              <Switch checked={forceLite} onCheckedChange={(v) => { setForceLite(v); saveFlag('b44_emulate_force_lite', v); }} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Disable history.replaceState</div>
                <div className="text-sm text-gray-500">Simulate fragile WebView history APIs.</div>
              </div>
              <Switch checked={disableHistory} onCheckedChange={(v) => { setDisableHistory(v); saveFlag('b44_emulate_disable_history', v); }} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Force Hash Redirects</div>
                <div className="text-sm text-gray-500">Prefer #/pages/... navigation for redirects.</div>
              </div>
              <Switch checked={forceHash} onCheckedChange={(v) => { setForceHash(v); saveFlag('b44_emulate_force_hash', v); }} />
            </div>
            <div className="flex justify-end">
              <Button onClick={applyAndReload} className="bg-gray-900 hover:bg-gray-800">Apply & Reload</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OAuth Return Tester</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">Simulates returning from Google by adding ?code/state to the URL. The app should route you to OAuthCallback and then to Dashboard.</p>
            <div className="flex gap-2">
              <Button onClick={simulateOAuthReturn}>Simulate Google Return</Button>
              <Button variant="outline" onClick={() => { try { sessionStorage.removeItem('b44_oauth_in_progress'); alert('Cleared in-progress flag'); } catch {} }}>Clear In-Progress Flag</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phone Preview (Web-only)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Enable Phone Preview</div>
                <div className="text-sm text-gray-500">Shows the app inside a Samsung-like phone frame.</div>
              </div>
              <Switch checked={showPreview} onCheckedChange={(v)=>setShowPreview(v)} />
            </div>
            {showPreview && (
              <div className="space-y-3">
                <div className="flex gap-2 items-center">
                  <Input value={previewUrl} onChange={(e)=>setPreviewUrl(e.target.value)} placeholder="https://your-app/pages/Welcome" />
                  <Button variant="outline" onClick={()=>setPreviewUrl(window.location.origin + '/pages/Welcome')}>App Welcome</Button>
                  <Button variant="outline" onClick={()=>setPreviewUrl(window.location.origin + '/pages/Dashboard')}>App Dashboard</Button>
                </div>
                <div className="flex gap-2">
                  <Button onClick={()=>setPreviewUrl((u)=>{ try { const base = u.startsWith('http') ? u : (new URL(u, window.location.origin)).toString(); const url = new URL(base); url.searchParams.set('code','demo'); url.searchParams.set('state','demo'); return url.toString(); } catch { return u + (u.includes('?')?'&':'?') + 'code=demo&state=demo'; } })}>Simulate OAuth in Preview</Button>
                </div>
                <PhonePreview url={previewUrl} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-1">
            <div><span className="font-medium">User-Agent:</span> {navigator.userAgent}</div>
            <div><span className="font-medium">deviceMemory:</span> {('deviceMemory' in navigator) ? navigator.deviceMemory : 'n/a'}</div>
            <div><span className="font-medium">History replaceState:</span> {typeof history.replaceState === 'function' ? 'available' : 'unavailable'}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}