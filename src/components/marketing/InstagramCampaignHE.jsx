import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, PlayCircle, Hash, Palette } from "lucide-react";
import StoryKPIExampleHE from "./StoryKPIExampleHE";

const brand = {
  name: "SmartPlate Simple",
  colors: {
    primary: "#7c3aed", // purple-600
    secondary: "#2563eb", // blue-600
    dark: "#111827", // gray-900
    light: "#F8FAFC", // slate-50
  },
  logo: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg",
};

const defaultHashtags = [
  "#SmartPlate", "#SmartPlateSimple", "#מסעדה", "#מסעדנים", "#עלותמזון",
  "#עלותעבודה", "#ניהולמסעדה", "#מלאי", "#ניהולמשמרות", "#עסקיםקטנים",
  "#מטבח", "#בר", "#קפה", "#שליטהבעלויות", "#גסטרונומיה", "#יזמות",
  "#מסעדן", "#ישראל"
];

const reelsPlan = [
  {
    title: "מפסיקים לנחש: עלות מזון בשליטה",
    hook: "מה שלא מודדים – לא מנהלים.",
    overlays: [
      "עלות מזון בנגיעה",
      "קבלות → תובנות",
      "החלטות – לא אקסל"
    ],
    shots: [
      "צילום מסך קצר: כרטיס עלות מזון בדשבורד",
      "העלאת תמונת קבלה",
      "תרשים קטגוריות זז"
    ],
    script:
      "פותחים במטבח שוקק. מעבר לדשבורד של SmartPlate Simple עם אחוז עלות מזון. קריינות: 'מפסיקים לנחש. סורקים קבלות, רואים עלות מזון אמיתית – היום.' סיום ברקע גרדיאנט ולוגו.",
    cta: "נסו את SmartPlate Simple – תחילה בחינם.",
    caption:
      "עלות מזון לא אמורה להיות תעלומה. סריקה, מעקב ופעולה – בדקות. SmartPlate Simple נשאר פשוט כדי שאתם תישארו חדים.",
  },
  {
    title: "עלות עבודה בשליטה",
    hook: "הסידור לא צריך לקבור את הרווח.",
    overlays: [
      "יעד עלות עבודה",
      "מתכנון שבוע → תחזית חודש",
      "נשארים מתחת ליעד"
    ],
    shots: [
      "גריד של סידור שבועי",
      "מד/חוגה של עלות זזה",
      "שמירה עם וייב של הצלחה"
    ],
    script:
      "מציגים אריחי משמרות. קריינות: 'מתכננים שבוע, רואים חודש. צפו את עלות העבודה תוך כדי בניית הסידור.' סגירה עם כרטיס עלות משולבת.",
    cta: "קובעים יעד ומחזיקים בו.",
    caption:
      "מהסידור השבועי לשקיפות חודשית – SmartPlate Simple הופך את עלות העבודה לצפויה.",
  },
  {
    title: "ספירות מלאי – פשוט",
    hook: "לספור את מה שחשוב – בלי בלאגן.",
    overlays: ["ספירה מהירה", "שימוש סחורה (AFC) בשפה פשוטה", "בלי דרמה"],
    shots: [
      "מצלמת נייד עוברת על מדפים",
      "כרטיס ספירת מלאי מטפס",
      "באנר AFC% נהיה ירוק"
    ],
    script:
      "מראים מחסן. לוחצים 'ספירה חדשה', מוסיפים כמה פריטים. מעבר לכרטיס AFC. קריינות: 'לדעת מה השתמשתם – לא רק מה קניתם.'",
    cta: "הופכים את ערב הספירה לקל.",
    caption:
      "שימוש לאורך זמן מספר את הסיפור. SmartPlate Simple מדבר תוצאות.",
  },
  {
    title: "מקבלה – לתובנה",
    hook: "פחות לתייק. יותר ללמוד.",
    overlays: ["סריקת PDF/תמונה", "סכומים אוטומטיים", "השפעת קטגוריות"],
    shots: ["מצלמה → קבלה", "אנימציית העלאה", "תרשים עוגה זז"],
    script:
      "מצלמים קבלה, מיד רואים סכומים והשפעת קטגוריות. 'מדפיםור להחלטות בשניות.'",
    cta: "הופכים ניירת לרווח.",
    caption:
      "נייר נכנס, תובנה יוצאת. זה SmartPlate Simple.",
  },
  {
    title: "כלל ה‑60%",
    hook: "אחוז מזון + אחוז עבודה יחד – עד 60%.",
    overlays: ["קביעת יעדים", "מעקב חי", "לנצח את החודש"],
    shots: [
      "הזנת מכירות צפויות",
      "תצוגת בָּדְג׳ים של יעדים",
      "סרגל % משולב נהיה ירוק"
    ],
    script:
      "המחשה נקייה של כלל 60% המשולב. 'קובעים יעד פעם אחת. אנחנו עוקבים על הכל.'",
    cta: "להגיע ליעד בעקביות.",
    caption:
      "כלל פשוט. אפקט גדול. שומרים על עלות משולבת עד 60% עם SmartPlate Simple.",
  },
  {
    title: "למה 'Simple' מנצח",
    hook: "כלים מסובכים מאטים מסעדות.",
    overlays: ["מהיר", "ממוקד", "קודם כל תפעול"],
    shots: ["אנימציות Tap Done", "ממשק נקי", "לוגו"],
    script:
      "מראים זרימות קצרות. 'SmartPlate Simple נועד למטרה: הדברים הקריטיים של כל יום.'",
    cta: "חוזרים ל‑Simple – שם מבצעים מנצחים.",
    caption:
      "רזה מנצח מסובך. תמיד. #SmartPlateSimple",
  }
];

export default function InstagramCampaignHE() {
  const hashtagBlock = useMemo(() => defaultHashtags.join(" "), []);
  const copy = (text) => navigator.clipboard.writeText(text);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card className="overflow-hidden border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardTitle className="flex items-center justify-between">
            <span>קמפיין רילז לאינסטגרם · {brand.name}</span>
            <img src={brand.logo} alt="SmartPlate Logo" className="h-10 w-10 rounded-lg object-contain bg-white/10 p-1" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <p className="text-gray-700 text-sm leading-relaxed">
                מטרה: השקה לשוק הישראלי עם סדרת 6 רילז שמחנכת וממירה בעלי מסעדות. טון: ברור, תפעולי, ללא סרבול. ויזואליה: גרדיאנט מודגש (סגול→כחול), טקסט כהה, לוגו.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-purple-600">מודעות</Badge>
                <Badge className="bg-blue-600">חינוך</Badge>
                <Badge variant="outline" className="text-gray-700 border-gray-300">המרה</Badge>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-gray-50">
              <div className="flex items-center gap-2 mb-2 text-gray-700"><Palette className="w-4 h-4" /> צבעי מותג</div>
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
          <CardTitle className="flex items-center gap-2"><Hash className="w-4 h-4" /> האשטגים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
            {hashtagBlock}
          </div>
          <Button variant="outline" className="gap-2" onClick={() => copy(hashtagBlock)}>
            <Copy className="w-4 h-4" /> העתק האשטגים
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
                  <p className="text-xs uppercase tracking-wide text-gray-500">כיתובים על המסך</p>
                  <ul className="list-disc mr-5 text-gray-800 text-sm">
                    {r.overlays.map((o,i)=>(<li key={i}>{o}</li>))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">שׁוֹטִים</p>
                  <ul className="list-disc mr-5 text-gray-800 text-sm">
                    {r.shots.map((s,i)=>(<li key={i}>{s}</li>))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">תסריט</p>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded border text-gray-800">{r.script}</pre>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => copy(r.script)}><Copy className="w-4 h-4" /> העתק תסריט</Button>
                  <Button variant="outline" className="gap-2" onClick={() => copy(caption)}><Copy className="w-4 h-4" /> העתק כיתוב + האשטגים</Button>
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
          <CardTitle>לוח פרסום (שבועיים)</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>• שבוע 1: ב/ד/ו — רילז 1, 2, 3</p>
          <p>• שבוע 2: ב/ד/ו — רילז 4, 5, 6</p>
          <p>בימים שבין לבין – סטוריז עם KPI אחד (עלות מזון / עלות עבודה / משולב). רקע גרדיאנט ולוגו קטן.</p>
        </CardContent>
      </Card>

      {/* Story Example */}
      <Card>
        <CardHeader>
          <CardTitle>דוגמה לסטורי KPI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StoryKPIExampleHE
              kpiLabel="עלות מזון"
              value={28.4}
              unit="%"
              footnote="מטרה: ≤ 30%"
              logoUrl={brand.logo}
              primary={brand.colors.primary}
              secondary={brand.colors.secondary}
            />
            <StoryKPIExampleHE
              kpiLabel="עלות עבודה"
              value={25.1}
              unit="%"
              footnote="יעד: 25%"
              logoUrl={brand.logo}
              primary={brand.colors.secondary}
              secondary={brand.colors.primary}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}