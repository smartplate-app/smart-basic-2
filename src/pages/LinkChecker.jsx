import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { Link as LinkIcon, ClipboardCopy, ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";

export default function LinkChecker() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [urlIn, setUrlIn] = useState("");
  const [fixedUrl, setFixedUrl] = useState("");
  const [status, setStatus] = useState(null); // {ok:boolean, msg:string}

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const parseAnyUrl = (val) => {
    try {
      return new URL(val, window.location.origin);
    } catch {
      // treat as path
      try { return new URL(val.startsWith("/") ? val : "/" + val, window.location.origin); } catch { return null; }
    }
  };

  const ensureIncognito = (val) => {
    const u = parseAnyUrl(val);
    if (!u) return "";

    // If already hash-based /#/pages/...
    if (u.hash && u.hash.startsWith("#/pages/")) {
      // Keep hash path + search part inside hash
      return `${u.origin}/${u.hash}`;
    }

    // If regular /pages/... turn into /#/pages/...
    if (u.pathname.startsWith("/pages/")) {
      return `${u.origin}/#${u.pathname}${u.search}`;
    }

    // Heuristics: if it contains invite or token param but no page, default to Register
    const search = u.search || "";
    if ((search.includes("invite=") || search.includes("token=")) && !u.pathname.includes("/pages/")) {
      const qs = search.startsWith("?") ? search : `?${search}`;
      // Prefer invite= when present; otherwise pass token through
      return `${u.origin}/#/pages/${search.includes("token=") && !search.includes("invite=") ? "RestaurantInvite" : "Register"}${qs}`;
    }

    // Welcome preview helper
    if (u.pathname.endsWith("/Welcome") || u.hash.includes("/Welcome")) {
      const hasPreview = (u.search || u.hash).includes("preview=1");
      const qp = hasPreview ? "?preview=1" : "";
      return `${u.origin}/#/pages/Welcome${qp}`;
    }

    // Fallback: keep path, just prefix with /# if it looks like an app page
    return `${u.origin}/#${u.pathname}${u.search}`;
  };

  const handleFix = () => {
    const out = ensureIncognito(urlIn.trim());
    setFixedUrl(out);
    setStatus(null);
  };

  const extractToken = (val) => {
    const u = parseAnyUrl(val);
    if (!u) return null;
    const fromSearch = new URLSearchParams(u.search || "");
    let token = fromSearch.get("invite") || fromSearch.get("token");
    if (token) return token;
    // Check hash query: #/pages/...?...=...
    if (u.hash && u.hash.includes("?")) {
      const q = u.hash.split("?")[1] || "";
      const hp = new URLSearchParams(q);
      token = hp.get("invite") || hp.get("token");
      if (token) return token;
    }
    return null;
  };

  const handleValidateInvite = async () => {
    setStatus({ ok: false, msg: "Validating..." });
    const token = extractToken(fixedUrl || urlIn);
    if (!token) {
      setStatus({ ok: false, msg: "No invite/token parameter found in URL" });
      return;
    }
    try {
      const { data } = await base44.functions.invoke("verifyInviteToken", { token });
      if (data?.success) {
        setStatus({ ok: true, msg: `Valid invite for ${data.invite?.email || "user"}` });
      } else {
        setStatus({ ok: false, msg: data?.error || "Invite invalid" });
      }
    } catch (e) {
      setStatus({ ok: false, msg: e?.message || "Validation failed" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-700">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Admins only</CardTitle>
          </CardHeader>
          <CardContent>
            Please sign in as an admin to use Link Checker.
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminWelcomePreview = `${window.location.origin}/#/pages/Welcome?preview=1`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <LinkIcon className="w-5 h-5 text-gray-700" />
            <CardTitle>Link Checker (Incognito-safe)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Paste any app link</label>
              <Input value={urlIn} onChange={(e) => setUrlIn(e.target.value)} placeholder={`${window.location.origin}/pages/Register?invite=...`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleFix} className="bg-gray-900 hover:bg-gray-800">Make incognito-safe</Button>
              <Button variant="outline" onClick={() => { setUrlIn(adminWelcomePreview); setFixedUrl(adminWelcomePreview); }}>Admin Welcome Preview</Button>
              <Button variant="outline" onClick={handleValidateInvite}>Validate invite/token</Button>
            </div>

            {fixedUrl && (
              <div className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="text-sm break-all">{fixedUrl}</div>
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(fixedUrl); }} title="Copy">
                    <ClipboardCopy className="w-4 h-4" />
                  </Button>
                  <a href={fixedUrl} target="_blank" rel="noreferrer">
                    <Button size="icon" variant="ghost" title="Open">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {status && (
              <div className={`flex items-center gap-2 text-sm ${status.ok ? "text-green-700" : "text-orange-700"}`}>
                {status.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                <span>{status.msg}</span>
              </div>
            )}

            <div className="text-xs text-gray-500 pt-2">
              Tips:
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>Incognito-safe links use /#/pages/... format.</li>
                <li>Admin Welcome preview uses ?preview=1 so you won’t be redirected.</li>
                <li>Invite/Register links should include invite= or token= in the query string.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}