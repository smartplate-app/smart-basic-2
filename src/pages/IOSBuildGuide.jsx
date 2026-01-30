import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../components/LanguageProvider";

export default function IOSBuildGuide() {
  const { language } = useLanguage();
  const isRTL = language === "he" || language === "ar";
  const appUrl = useMemo(() => {
    try { return window.location.origin; } catch { return "https://your-app-url"; }
  }, []);

  const t = (key) => {
    const he = {
      title: "מדריך יצירת קובץ IPA (iOS)",
      intro: "לא ניתן להפיק קובץ .ipa מתוך Base44. להלן מדריך קצר לעטיפת האפליקציה עם Capacitor ובניית .ipa ב‑Xcode.",
      prereq: "דרישות מקדימות",
      prereq_list: [
        "macOS עם Xcode עדכני ו‑Apple ID בחשבון מפתחים",
        "Node.js‏ (גרסה 18+) ו‑npm מותקן",
        "דומיין https פעיל של האפליקציה: "
      ],
      steps: "שלבים",
      s1: "צור פרויקט עטיפה והתקן Capacitor",
      s2: "אתחל את Capacitor והגדר טעינת אתר מרוחק",
      s3: "הוסף יעד iOS ופתח ב‑Xcode",
      s4: "הגדר חתימה (Signing) ובנה ארכיון",
      s5: "הפצה ל‑TestFlight / App Store",
      notes: "הערות חשובות",
      notes_list: [
        "מומלץ להשתמש ב‑HTTPS בלבד (ATS של iOS עלול לחסום HTTP)",
        "עטיפת WebView עלולה להידחות בחנות אם אין פונקציונליות Native מספקת",
        "לשימוש פנימי/פיילוט, TestFlight הוא המסלול המהיר"
      ],
      copy: "העתקה",
    };
    const en = {
      title: "iOS IPA Build Guide",
      intro: "You can’t export an .ipa directly from Base44. Use this quick guide to wrap the app with Capacitor and build an .ipa in Xcode.",
      prereq: "Prerequisites",
      prereq_list: [
        "macOS with latest Xcode and an Apple Developer account",
        "Node.js (v18+) and npm installed",
        "A live HTTPS URL for your app: "
      ],
      steps: "Steps",
      s1: "Create wrapper project and install Capacitor",
      s2: "Init Capacitor and point to remote URL",
      s3: "Add iOS platform and open in Xcode",
      s4: "Configure Signing and create Archive",
      s5: "Distribute via TestFlight / App Store",
      notes: "Important notes",
      notes_list: [
        "Use HTTPS only (iOS ATS may block HTTP)",
        "Pure WebView wrappers may be rejected by App Review without native value",
        "For pilots/internal testing, TestFlight is fastest"
      ],
      copy: "Copy",
    };
    const ar = {
      title: "دليل إنشاء ملف IPA لـ iOS",
      intro: "لا يمكن إنشاء ملف .ipa مباشرة من Base44. استخدم هذا الدليل السريع لتغليف التطبيق بـ Capacitor والبناء عبر Xcode.",
      prereq: "المتطلبات",
      prereq_list: [
        "macOS مع Xcode وحساب مطوّر Apple",
        "Node.js (الإصدار 18+) و npm",
        "رابط HTTPS مباشر للتطبيق: "
      ],
      steps: "الخطوات",
      s1: "إنشاء مشروع تغليف وتثبيت Capacitor",
      s2: "تهيئة Capacitor وتوجيهه إلى الرابط البعيد",
      s3: "إضافة منصة iOS وفتح المشروع في Xcode",
      s4: "إعداد التوقيع وإنشاء أرشيف",
      s5: "النشر عبر TestFlight / App Store",
      notes: "ملاحظات مهمة",
      notes_list: [
        "يفضل استخدام HTTPS فقط",
        "قد تُرفض تطبيقات WebView الخالصة من متجر التطبيقات",
        "للاختبار الداخلي، TestFlight هو الأسرع"
      ],
      copy: "نسخ",
    };
    const dict = language === "he" ? he : language === "ar" ? ar : en;
    return dict[key];
  };

  const codeBlock = (lines) => (
    <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-auto">
      <code>{lines.join("\n")}</code>
    </pre>
  );

  return (
    <div className={`min-h-screen bg-gray-50 p-4 md:p-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">{t("intro")}</p>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t("prereq")}</h3>
              <ul className="list-disc ml-6 rtl:mr-6 rtl:ml-0 text-gray-700 space-y-1">
                <li>{t("prereq_list")[0]}</li>
                <li>{t("prereq_list")[1]}</li>
                <li>{t("prereq_list")[2]} <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{appUrl}</span></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">{t("steps")}</h3>

              <div className="space-y-2">
                <div className="font-medium">1) {t("s1")}</div>
                {codeBlock([
                  "mkdir ios-wrapper && cd ios-wrapper",
                  "npm init -y",
                  "npm i @capacitor/core @capacitor/cli @capacitor/ios"
                ])}
              </div>

              <div className="space-y-2">
                <div className="font-medium">2) {t("s2")}</div>
                {codeBlock([
                  "npx cap init \"Smart Plate\" com.yourcompany.smartplate --web-dir=dist",
                  "# שימוש בכתובת מרוחקת (Remote URL) במקום קבצי web מקומיים:",
                  "# Use remote URL instead of bundling local web assets:",
                  "# capacitor.config.ts / capacitor.config.json",
                  "",
                  "export default {",
                  "  appId: 'com.yourcompany.smartplate',",
                  "  appName: 'Smart Plate',",
                  "  webDir: 'dist',",
                  "  server: {",
                  `    url: '${appUrl}', // your live app URL`,
                  "    cleartext: false",
                  "  }",
                  "}",
                ])}
              </div>

              <div className="space-y-2">
                <div className="font-medium">3) {t("s3")}</div>
                {codeBlock([
                  "npx cap add ios",
                  "npx cap open ios"
                ])}
              </div>

              <div className="space-y-2">
                <div className="font-medium">4) {t("s4")}</div>
                <ul className="list-decimal ml-6 rtl:mr-6 rtl:ml-0 text-gray-700 space-y-1">
                  <li>Set Team & Bundle Identifier (Signing & Capabilities)</li>
                  <li>Product → Archive</li>
                  <li>Validate & Distribute</li>
                </ul>
              </div>

              <div className="space-y-2">
                <div className="font-medium">5) {t("s5")}</div>
                <p className="text-gray-700">Upload to App Store Connect, then add testers in TestFlight or submit for review.</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">{t("notes")}</h3>
              <ul className="list-disc ml-6 rtl:mr-6 rtl:ml-0 text-gray-700 space-y-1">
                <li>{t("notes_list")[0]}</li>
                <li>{t("notes_list")[1]}</li>
                <li>{t("notes_list")[2]}</li>
              </ul>
            </div>

            <div className={`mt-4 ${isRTL ? 'text-left' : 'text-right'}`}>
              <a href={appUrl} target="_blank" rel="noreferrer">
                <Button variant="outline">{appUrl}</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}