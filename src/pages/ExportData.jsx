import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function ExportData() {
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("json") || params.get("data") || "";

    const tryDecode = (s) => {
      try { return decodeURIComponent(s); } catch { return s; }
    };

    const tryPretty = (s) => {
      try {
        const obj = JSON.parse(s);
        return JSON.stringify(obj, null, 2);
      } catch {
        return s;
      }
    };

    if (!raw) {
      setText("// No JSON provided. Pass ?json=... or ?data=... in the URL.");
      return;
    }

    const decoded = tryDecode(raw);
    setText(tryPretty(decoded));
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const fileName = useMemo(() => {
    try {
      const maybe = JSON.parse(text);
      return (maybe && maybe.fileName) ? String(maybe.fileName) : "export.json";
    } catch { return "export.json"; }
  }, [text]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Exported JSON</h1>
          <div className="flex gap-2">
            <Button onClick={onCopy} variant="outline" className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-600">{fileName}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-white border rounded-lg p-4 overflow-auto text-sm leading-relaxed whitespace-pre-wrap break-words min-h-[300px] max-h-[70vh]">
{text}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}