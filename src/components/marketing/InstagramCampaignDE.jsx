import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, PlayCircle, Hash, Palette } from "lucide-react";

const brand = {
  name: "SmartPlate Basic",
  colors: {
    primary: "#7c3aed", // purple-600
    secondary: "#2563eb", // blue-600
    dark: "#111827", // gray-900
    light: "#F8FAFC", // slate-50
  },
  logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg",
};

const defaultHashtags = [
  "#SmartPlate", "#SmartPlateBasic", "#Gastronomie", "#RestaurantManagement",
  "#Lebensmittelkosten", "#Personalkosten", "#Inventur", "#Schichtplan",
  "#Kostenkontrolle", "#Gastgewerbe", "#Gastro", "#Café", "#Bar",
  "#Betriebsführung", "#Mittelstand", "#Unternehmer", "#DEGastro"
];

const reelsPlan = [
  {
    title: "Hör auf zu raten: Wareneinsatz im Blick",
    hook: "Was du nicht misst, kannst du nicht steuern.",
    overlays: [
      "Wareneinsatz auf einen Blick",
      "Belege → Erkenntnisse",
      "Entscheiden statt Excel"
    ],
    shots: [
      "Kurzer Screenrecord: Dashboard Wareneinsatz%",
      "Beleg per Foto hochladen",
      "Tortendiagramm (Kategorien) animiert"
    ],
    script:
      "Start im hektischen Küchenalltag. Schnitt aufs SmartPlate‑Dashboard mit Wareneinsatz%. Voiceover: ‚Hör auf zu raten. Belege scannen, echten Wareneinsatz sehen – heute.‘ Abschluss mit Farbverlauf + Logo.",
    cta: "Jetzt SmartPlate Basic testen – kostenlos starten.",
    caption:
      "Wareneinsatz darf kein Rätsel sein. Scannen, verfolgen, handeln – in Minuten. SmartPlate Basic hält es schlank, damit du liefern kannst.",
  },
  {
    title: "Personalkosten im Griff",
    hook: "Dein Dienstplan darf die Marge nicht auffressen.",
    overlays: [
      "Ziel für Personalkosten",
      "Wochenplan → Monatsprognose",
      "Unter Ziel bleiben"
    ],
    shots: [
      "Wochenplan‑Raster",
      "Kostenanzeige/Gauge animiert",
      "Speichern‑Moment"
    ],
    script:
      "Zeige Dienstplankacheln. Voiceover: ‚Plane die Woche, sieh den Monat. Personalkosten beim Erstellen prognostizieren.‘ Close mit Kombi‑Kosten‑Karte.",
    cta: "Ziel setzen und einhalten.",
    caption:
      "Vom Wochenplan zur Monatsklarheit – SmartPlate Basic macht Personalkosten planbar und schlank.",
  },
  {
    title: "Inventur, aber einfach",
    hook: "Zähle, was zählt – ohne Chaos.",
    overlays: ["Schnelle Zählung", "AFC‑Nutzung in Klartext", "Null Drama"],
    shots: [
      "Handy filmt Regal",
      "Inventur‑Karte steigt",
      "AFC%‑Banner wird grün"
    ],
    script:
      "Lagerraum. ‚Neue Zählung‘ tippen, ein paar Artikel hinzufügen. Schnitt zur AFC‑Karte. Voiceover: ‚Wissen, was verbraucht wurde – nicht nur, was gekauft wurde.‘",
    cta: "Mach den Inventurabend schmerzfrei.",
    caption:
      "Verbrauch über Zeit erzählt die wahre Geschichte. SmartPlate Basic spricht Ergebnisse.",
  },
  {
    title: "Vom Beleg zur Erkenntnis",
    hook: "Ablegen war gestern. Lernen ist heute.",
    overlays: ["PDF/Bild scannen", "Summen automatisch", "Kategorie‑Impact"],
    shots: ["Kamera → Beleg", "Upload‑Spinner", "Kategorie‑Torte animiert"],
    script:
      "Beleg scannen, sofort Summen und Kategorie‑Einfluss zeigen. ‚Von Papier zu Entscheidungen in Sekunden.‘",
    cta: "Papierkram in Profit verwandeln.",
    caption:
      "Papier rein, Insight raus. Das ist SmartPlate Basic.",
  },
  {
    title: "Die 60%‑Regel",
    hook: "Food% + Personal% zusammen unter 60%.",
    overlays: ["Ziele setzen", "Live tracken", "Monat gewinnen"],
    shots: [
      "Prognostizierten Umsatz eintragen",
      "Ziel‑Badges zeigen",
      "Kombinierte %‑Leiste wird grün"
    ],
    script:
      "Einfache Grafik zur 60%‑Kombiregel. ‚Einmal Ziele setzen. Wir tracken den Rest.‘",
    cta: "Dein Ziel konstant erreichen.",
    caption:
      "Einfache Regel. Große Wirkung. Halte die Kombikosten unter 60% mit SmartPlate Basic.",
  },
  {
    title: "Warum ‚Basic‘ gewinnt",
    hook: "Komplexe Tools bremsen Gastronomie aus.",
    overlays: ["Schnell", "Fokussiert", "Operator‑first"],
    shots: ["Tap‑Flows", "Aufgeräumtes UI", "Logo‑Lockup"],
    script:
      "Zeige schnelle Tap‑Flows. ‚SmartPlate Basic ist zweckmäßig: genau das, was du jeden Tag brauchst.‘",
    cta: "Zurück zum Wesentlichen – da gewinnt Ausführung.",
    caption:
      "Schlank schlägt komplex. Jedes Mal. #SmartPlateBasic",
  }
];

export default function InstagramCampaignDE() {
  const hashtagBlock = useMemo(() => defaultHashtags.join(" "), []);
  const copy = (text) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardTitle className="flex items-center justify-between">
            <span>Instagram Reels Kampagne · {brand.name}</span>
            <img src={brand.logo} alt="SmartPlate Logo" className="h-10 w-10 rounded-lg object-contain bg-white/10 p-1" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <p className="text-gray-700 text-sm leading-relaxed">
                Ziel: Deutschsprachige Markteinführung mit einer 6‑Reels‑Serie, die Gastronomen informiert und konvertiert. Ton: klar, praxisnah, ohne Schnickschnack. Visuals: kräftiger Verlauf (lila→blau), dunkler Text, Logo‑Lockups.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-purple-600">Awareness</Badge>
                <Badge className="bg-blue-600">Education</Badge>
                <Badge variant="outline" className="text-gray-700 border-gray-300">Conversion</Badge>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-2 text-gray-700"><Palette className="w-4 h-4" /> Markenfarben</div>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded" style={{background:brand.colors.primary}} />
                <span className="h-6 w-6 rounded" style={{background:brand.colors.secondary}} />
                <span className="h-6 w-6 rounded ring-1 ring-gray-300" style={{background:brand.colors.dark}} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hashtags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Hash className="w-4 h-4" /> Hashtags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
            {hashtagBlock}
          </div>
          <Button variant="outline" className="gap-2" onClick={() => copy(hashtagBlock)}>
            <Copy className="w-4 h-4" /> Hashtags kopieren
          </Button>
        </CardContent>
      </Card>

      {/* Reels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reelsPlan.map((r, idx) => {
          const caption = `${r.hook}\n\n${r.caption}\n\n${hashtagBlock}`;
          return (
            <Card key={idx} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-600/80 to-blue-600/80 text-white">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><PlayCircle className="w-4 h-4" /> {idx+1}. {r.title}</span>
                  <Badge variant="secondary" className="bg-white/20">Reel</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Hook</p>
                  <p className="font-semibold text-gray-900">{r.hook}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Texteinblendungen</p>
                  <ul className="list-disc ml-5 text-gray-800 text-sm">
                    {r.overlays.map((o,i)=>(<li key={i}>{o}</li>))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Shots</p>
                  <ul className="list-disc ml-5 text-gray-800 text-sm">
                    {r.shots.map((s,i)=>(<li key={i}>{s}</li>))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">Skript</p>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border text-gray-800">{r.script}</pre>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => copy(r.script)}><Copy className="w-4 h-4" /> Skript kopieren</Button>
                  <Button variant="outline" className="gap-2" onClick={() => copy(caption)}><Copy className="w-4 h-4" /> Caption + Hashtags kopieren</Button>
                </div>
                <div className="border-t pt-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">CTA</p>
                  <p className="font-medium text-gray-900">{r.cta}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Posting‑Plan (2 Wochen)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>• Woche 1: Mo/Mi/Fr — Reels 1, 2, 3</p>
          <p>• Woche 2: Mo/Mi/Fr — Reels 4, 5, 6</p>
          <p>Zwischendurch Stories mit einzelnen KPI‑Karten (Food% / Personal% / Kombiniert%). Verlauf‑Hintergrund + kleines Logo‑Wasserzeichen.</p>
        </CardContent>
      </Card>
    </div>
  );
}