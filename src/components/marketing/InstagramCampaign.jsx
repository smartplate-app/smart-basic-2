import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, PlayCircle, Hash, Palette } from "lucide-react";

const brand = {
  name: "SmartPlate Simple",
  colors: {
    primary: "#059669", // emerald-600
    secondary: "#0ea5a4", // teal-500
    dark: "#0f172a", // slate-900
    light: "#F6FAF7", // soft light
  },
  logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg",
};

const defaultHashtags = [
  "#SmartPlate", "#SmartPlateSimple", "#RestaurantManagement", "#FoodCost",
  "#LaborCost", "#InventoryCount", "#Hospitality", "#SmallBusiness",
  "#RestaurantOwner", "#KitchenOps", "#FandB", "#POS", "#MenuEngineering",
  "#CostControl", "#ShiftScheduling", "#CafeOwner", "#BarOwner"
];

const reelsPlan = [
  {
    title: "Stop Guessing Your Food Cost",
    hook: "You can’t manage what you can’t measure.",
    overlays: [
      "Food Cost in one tap",
      "Receipts → Insights",
      "Decisions, not spreadsheets"
    ],
    shots: [
      "Quick screen recording: Dashboard food cost card",
      "Tap-to-upload receipt image",
      "Pie chart of categories animating"
    ],
    script:
      "Open with a busy kitchen. Cut to SmartPlate Simple dashboard showing food cost%. \nVoiceover: ‘Stop guessing. Scan receipts, see real food cost, today.’\nEnd on brand gradient with logo.",
    cta: "Try SmartPlate Simple — free to start.",
    caption:
      "Food cost shouldn’t be a mystery. Scan, track, and act — in minutes. \nSmartPlate Simple keeps it simple so you can keep cooking.\n",
  },
  {
    title: "Labor Cost Under Control",
    hook: "Your staff schedule shouldn’t sink your margins.",
    overlays: [
      "Labor cost goal",
      "Weekly schedule → monthly forecast",
      "Stay under target"
    ],
    shots: [
      "Weekly schedule grid",
      "Cost gauge animating",
      "Save button + confetti vibe"
    ],
    script:
      "Show schedule tiles. Voiceover: ‘Plan your week, see your month. Forecast labor cost as you build the schedule.’\nClose with combined-cost card.",
    cta: "Set your target and stick to it.",
    caption:
      "From weekly schedules to monthly clarity — SmartPlate Simple keeps labor predictable and lean.",
  },
  {
    title: "Inventory, Simplified",
    hook: "Count what matters — without the chaos.",
    overlays: ["Fast counts", "Usage (AFC) in plain English", "Zero drama"],
    shots: [
      "Phone camera scanning shelf",
      "Inventory count card increases",
      "AFC% banner flips green"
    ],
    script:
      "Open storeroom. Tap ‘New Count’. Add a few items. Cut to AFC card. Voiceover: ‘Know what you used — not just what you bought.’",
    cta: "Make inventory night painless.",
    caption:
      "Usage over time tells the story. SmartPlate Simple speaks your language — results.",
  },
  {
    title: "From Receipt to Insight",
    hook: "Stop filing. Start learning.",
    overlays: ["Scan PDF/Image", "Auto totals", "Category impact"],
    shots: ["Camera → receipt", "Upload spinner", "Category pie animate"],
    script:
      "Film the phone scanning a receipt. Instantly show totals and category impact on the chart. ‘From paper to decisions in seconds.’",
    cta: "Turn paperwork into profit.",
    caption:
      "Paper in, insight out. That’s SmartPlate Simple.",
  },
  {
    title: "The 60% Rule",
    hook: "Food% + Labor% should live under 60%.",
    overlays: ["Set targets", "Track live", "Win the month"],
    shots: [
      "Enter predicted sales",
      "Show target badges",
      "Combined % bar turns green"
    ],
    script:
      "Explain the 60% combined rule with clean graphics. ‘Set your goals once. We track the rest.’",
    cta: "Hit your target consistently.",
    caption:
      "Simple rule. Serious impact. Keep combined cost under 60% with SmartPlate Simple.",
  },
  {
    title: "Why ‘Simple’ Wins",
    hook: "Complex tools slow restaurants down.",
    overlays: ["Fast", "Focused", "Operator-first"],
    shots: ["Tap, done animations", "No clutter UI", "Logo lockup"],
    script:
      "Show quick tap flows. ‘SmartPlate Simple is purpose-built: the essentials you need every single day.’",
    cta: "Back to simple — where execution wins.",
    caption:
      "Lean beats complex. Every time. #SmartPlateSimple",
  }
];

export default function InstagramCampaign() {
  const hashtagBlock = useMemo(() => defaultHashtags.join(" "), []);

  const copy = (text) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-2 border-emerald-200">
        <CardHeader className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <CardTitle className="flex items-center justify-between">
            <span>Instagram Reels Campaign · {brand.name}</span>
            <img src={brand.logo} alt="SmartPlate Logo" className="h-10 w-10 rounded-lg object-contain bg-white/10 p-1" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <p className="text-gray-700 text-sm leading-relaxed">
                Objective: Launch the English SmartPlate Simple with a 6‑reel series that educates and converts restaurant owners. Tone: clear, operator‑centric, no fluff. Visuals: bold gradient (emerald→teal), dark text, logo lock‑ups.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-emerald-600">Awareness</Badge>
                <Badge className="bg-teal-600">Education</Badge>
                <Badge variant="outline" className="text-gray-700 border-gray-300">Conversion</Badge>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-2 text-gray-700"><Palette className="w-4 h-4" /> Brand Colors</div>
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
            <Copy className="w-4 h-4" /> Copy Hashtags
          </Button>
        </CardContent>
      </Card>

      {/* Reels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reelsPlan.map((r, idx) => {
          const caption = `${r.hook}\n\n${r.caption}\n\n${hashtagBlock}`;
          return (
            <Card key={idx} className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-600/80 to-teal-600/80 text-white">
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
                  <p className="text-xs uppercase tracking-wide text-gray-500">On-screen overlays</p>
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
                  <p className="text-xs uppercase tracking-wide text-gray-500">Script</p>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border text-gray-800">{r.script}</pre>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => copy(r.script)}><Copy className="w-4 h-4" /> Copy Script</Button>
                  <Button variant="outline" className="gap-2" onClick={() => copy(caption)}><Copy className="w-4 h-4" /> Copy Caption + Hashtags</Button>
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
          <CardTitle>Posting Schedule (2 weeks)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>• Week 1: Mon/Wed/Fri — Reels 1, 2, 3</p>
          <p>• Week 2: Mon/Wed/Fri — Reels 4, 5, 6</p>
          <p>Post Stories on off days with a single KPI card (Food% / Labor% / Combined%). Keep the gradient background and small logo watermark.</p>
        </CardContent>
      </Card>
    </div>
  );
}