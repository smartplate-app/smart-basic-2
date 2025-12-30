import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, ClipboardCopy } from "lucide-react";

export default function WelcomeIncognito() {
  const [user, setUser] = useState(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const origin = window.location.origin;
    const incognito = `${origin}/#/pages/Welcome?preview=1`;
    setUrl(incognito);
  }, []);

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Admins only</CardTitle>
          </CardHeader>
          <CardContent>
            Please sign in as an admin to view the incognito Welcome preview.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Welcome Incognito Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center">
              <Input value={url} readOnly className="flex-1" />
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(url)} title="Copy link">
                <ClipboardCopy className="w-4 h-4 mr-2" /> Copy
              </Button>
              <a href={url} target="_blank" rel="noreferrer">
                <Button className="bg-gray-900 hover:bg-gray-800" title="Open in new tab">
                  <ExternalLink className="w-4 h-4 mr-2" /> Open
                </Button>
              </a>
            </div>
            <div className="rounded-lg border overflow-hidden bg-white">
              <iframe
                title="Welcome Incognito"
                src={url}
                className="w-full"
                style={{ height: "78vh" }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}