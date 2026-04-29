import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AccessRequestDialog from "../components/access/AccessRequestDialog";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { CheckCircle2, TrendingDown, Users, Receipt, ArrowRight, BarChart3, Clock, ShieldCheck } from "lucide-react";
import { useLanguage } from "../components/LanguageProvider";

const WELCOME_LANGS = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
];

function WelcomeLangSwitcher() {
  const { language, setLanguage } = useLanguage();
  const current = WELCOME_LANGS.find(l => l.code === language) || WELCOME_LANGS[0];
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-md bg-white text-sm hover:bg-gray-50">
        <span>{current.flag}</span><span>{current.name}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border rounded-md shadow-lg z-50 min-w-[140px]">
          {WELCOME_LANGS.map(l => (
            <button key={l.code} onClick={() => { setLanguage(l.code); setOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50 text-left">
              <span>{l.flag}</span><span>{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const welcomeTranslations = {
  en: {
    "wp_sign_in": "Sign In",
    "wp_get_started": "Get Started",
    "wp_hero_title": "The Ultimate Food Cost App for Restaurants & the Hospitality Industry",
    "wp_hero_title_highlight": "Food Cost App",
    "wp_hero_subtitle": "Take control of your restaurant's profitability. Keep it below 60% food cost and labor cost combined together.",
    "wp_request_access": "Request Access",
    "wp_login_dashboard": "Login to Dashboard",
    "wp_no_credit_card": "No credit card required",
    "wp_setup_minutes": "Setup in minutes",
    "wp_features_title": "Everything you need to run a profitable restaurant",
    "wp_features_subtitle": "Stop guessing. Start tracking your food and labor costs in real-time.",
    "wp_feature1_title": "Food Cost Management",
    "wp_feature1_desc": "Send supplier orders directly via WhatsApp. Scan invoices instantly. Track inventory counts and calculate your exact Actual Food Cost (AFC) percentage without the headache of complex spreadsheets.",
    "wp_feature2_title": "Labor Cost App",
    "wp_feature2_desc": "Build weekly schedules in minutes. Track employee hours, manage tip pools, and forecast your labor cost percentage against your projected sales before the week even begins.",
    "wp_feature3_title": "Real-Time Dashboard",
    "wp_feature3_desc": "Your monthly performance at a glance. Monitor the golden rule of hospitality: keeping your combined Food Cost + Labor Cost strictly under 60%. Get alerts when you're trending over budget.",
    "wp_comparison_text": "While legacy systems like MarketMan focus heavily on exhaustive recipe costing, and Zest focuses on basic scheduling, Smart Plate Basic combines the best of both worlds into a single, lightning-fast app designed for modern operators.",
    "wp_comp1": "Faster Ordering: Order via WhatsApp directly from the app. No supplier portal logins required.",
    "wp_comp2": "Unified Dashboard: See your Labor Cost and Food Cost side-by-side.",
    "wp_comp3": "Simpler Inventory: Count what matters, scan invoices, and get your AFC instantly.",
    "wp_try_button": "Try Smart Plate Basic",
    "wp_why_choose_us": "Why Restaurants Choose Us",
    "wp_why1_title": "Save 10+ Hours a Week",
    "wp_why1_desc": "Automated invoice scanning and quick scheduling.",
    "wp_why2_title": "Stop Profit Leaks",
    "wp_why2_desc": "Catch supplier price changes and overtime instantly.",
    "wp_why3_title": "Accountant Ready",
    "wp_why3_desc": "Export all invoices and payroll data with one click.",
    "wp_guide_title": "The Ultimate Guide to Food Cost Management",
    "wp_guide_q1_title": "What is Food Cost Management?",
    "wp_guide_q1_desc": "Food cost management is the process of tracking, analyzing, and optimizing the cost of ingredients used in a restaurant or bar. Effective food cost management ensures that a business remains profitable by keeping the cost of goods sold (COGS) at an optimal level, typically between 28% and 32% of total food sales.",
    "wp_guide_q2_title": "5 Proven Strategies to Manage Your Food Cost",
    "wp_guide_q2_l1": "Track Inventory Regularly: Conduct weekly or monthly inventory counts to understand your actual food cost (AFC) versus your theoretical food cost.",
    "wp_guide_q2_l2": "Monitor Supplier Prices: Keep a close eye on invoice prices. Smart Plate Basic automatically highlights price changes when you scan supply receipts.",
    "wp_guide_q2_l3": "Optimize Portion Control: Standardize recipes and train staff to ensure consistent portion sizes, reducing waste and over-serving.",
    "wp_guide_q2_l4": "Reduce Food Waste: Track waste reports to identify which items are being thrown away and adjust your prep levels accordingly.",
    "wp_guide_q2_l5": "Use a Food Cost App: Replace manual spreadsheets with a dedicated food cost management app to automate calculations and get real-time profitability dashboards.",
    "wp_guide_q3_title": "Why Labor Cost Management Matters",
    "wp_guide_q3_desc": "While food cost is critical, labor cost is the second massive expense for any restaurant. The golden rule of hospitality is keeping your combined prime costs (Food Cost + Labor Cost) under 60%. A dedicated labor cost management app helps you forecast weekly schedules, track employee hours, and manage tip pools efficiently.",
    "wp_cta_title": "Ready to optimize your restaurant's costs?",
    "wp_cta_desc": "Join the smartest operators managing their food and labor costs in one place.",
    "wp_cta_button": "Request Access Now",
    "wp_footer_desc": "The premier food cost and labor cost management app for restaurants and bars.",
    "wp_footer_contact": "Contact us:",
    "wp_footer_rights": "Smart Plate. All rights reserved."
  },
  he: {
    "wp_sign_in": "התחברות",
    "wp_get_started": "התחל עכשיו",
    "wp_hero_title": "אפליקציית ניהול עלות המזון האולטימטיבית למסעדות ותעשיית האירוח",
    "wp_hero_title_highlight": "אפליקציית ניהול עלות המזון",
    "wp_hero_subtitle": "קח שליטה על הרווחיות של המסעדה שלך. שמור על עלות מזון ועלות עבודה משולבים יחד מתחת ל-60%.",
    "wp_request_access": "בקש גישה",
    "wp_login_dashboard": "התחבר לדשבורד",
    "wp_no_credit_card": "ללא כרטיס אשראי",
    "wp_setup_minutes": "הגדרה בדקות",
    "wp_features_title": "כל מה שאתה צריך כדי לנהל מסעדה רווחית",
    "wp_features_subtitle": "תפסיק לנחש. התחל לעקוב אחר עלויות המזון והעבודה שלך בזמן אמת.",
    "wp_feature1_title": "ניהול עלויות מזון",
    "wp_feature1_desc": "שלח הזמנות לספקים ישירות בוואטסאפ. סרוק חשבוניות באופן מיידי. עקוב אחר ספירות מלאי וחשב את אחוז עלות המזון בפועל (AFC) המדויק שלך ללא הכאב ראש של גיליונות אקסל מורכבים.",
    "wp_feature2_title": "אפליקציית עלות עבודה",
    "wp_feature2_desc": "בנה סידורי עבודה שבועיים בדקות. עקוב אחר שעות עובדים, נהל טיפים וחזה את אחוז עלות העבודה שלך מול המכירות הצפויות עוד לפני שהשבוע מתחיל.",
    "wp_feature3_title": "דשבורד זמן אמת",
    "wp_feature3_desc": "הביצועים החודשיים שלך במבט חטוף. עקוב אחר כלל הזהב של תעשיית האירוח: שמירה על עלות מזון + עלות עבודה משולבת מתחת ל-60% בקפדנות. קבל התראות כשאתה חורג מהתקציב.",
    "wp_comparison_text": "בעוד מערכות מיושנות כמו MarketMan מתמקדות בכבדות בתמחור מתכונים מתיש, ו-Zest מתמקדת בסידור עבודה בסיסי, Smart Plate Basic משלבת את הטוב משני העולמות לתוך אפליקציה אחת ומהירה שעוצבה עבור מנהלים מודרניים.",
    "wp_comp1": "הזמנות מהירות יותר: הזמן בוואטסאפ ישירות מהאפליקציה. ללא צורך בהתחברות לפורטל ספקים.",
    "wp_comp2": "דשבורד מאוחד: ראה את עלות העבודה ועלות המזון שלך זה לצד זה.",
    "wp_comp3": "מלאי פשוט יותר: ספור את מה שחשוב, סרוק חשבוניות וקבל את ה-AFC שלך באופן מיידי.",
    "wp_try_button": "נסה את Smart Plate Basic",
    "wp_why_choose_us": "למה מסעדות בוחרות בנו",
    "wp_why1_title": "חסוך 10+ שעות בשבוע",
    "wp_why1_desc": "סריקת חשבוניות אוטומטית וסידור עבודה מהיר.",
    "wp_why2_title": "עצור דליפות רווח",
    "wp_why2_desc": "תפוס שינויי מחירי ספקים ושעות נוספות באופן מיידי.",
    "wp_why3_title": "מוכן לרואה חשבון",
    "wp_why3_desc": "ייצא את כל החשבוניות ונתוני השכר בלחיצה אחת.",
    "wp_guide_title": "המדריך המלא לניהול עלות מזון",
    "wp_guide_q1_title": "מהו ניהול עלות מזון?",
    "wp_guide_q1_desc": "ניהול עלות מזון הוא תהליך של מעקב, ניתוח ואופטימיזציה של עלות חומרי הגלם בהם נעשה שימוש במסעדה או בבר. ניהול עלות מזון יעיל מבטיח שהעסק יישאר רווחי על ידי שמירה על עלות הסחורה הנמכרת (COGS) ברמה אופטימלית, בדרך כלל בין 28% ל-32% מסך מכירות המזון.",
    "wp_guide_q2_title": "5 אסטרטגיות מוכחות לניהול עלות המזון שלך",
    "wp_guide_q2_l1": "עקוב אחר המלאי באופן קבוע: בצע ספירות מלאי שבועיות או חודשיות כדי להבין את עלות המזון בפועל (AFC) מול עלות המזון התיאורטית שלך.",
    "wp_guide_q2_l2": "עקוב אחר מחירי ספקים: פקח עין על מחירי חשבוניות. Smart Plate Basic מדגישה אוטומטית שינויי מחירים כשאתה סורק קבלות אספקה.",
    "wp_guide_q2_l3": "אופטימיזציה של בקרת מנות: עשה סטנדרטיזציה למתכונים והדרכת צוות כדי להבטיח גדלי מנות עקביים, הפחתת בזבוז והגשה עודפת.",
    "wp_guide_q2_l4": "הפחתת בזבוז מזון: עקוב אחר דוחות פחת כדי לזהות אילו פריטים נזרקים והתאם את רמות ההכנה שלך בהתאם.",
    "wp_guide_q2_l5": "השתמש באפליקציית עלות מזון: החלף גיליונות אקסל ידניים באפליקציית ניהול עלות מזון ייעודית כדי להפוך חישובים לאוטומטיים ולקבל דשבורדים של רווחיות בזמן אמת.",
    "wp_guide_q3_title": "למה ניהול עלות עבודה חשוב",
    "wp_guide_q3_desc": "בעוד שעלות המזון קריטית, עלות עבודה היא ההוצאה הגדולה השנייה של כל מסעדה. כלל הזהב של תעשיית האירוח הוא שמירה על עלויות הפריים המשולבות שלך (עלות מזון + עלות עבודה) מתחת ל-60%. אפליקציית ניהול עלות עבודה ייעודית עוזרת לחזות סידורי עבודה שבועיים, לעקוב אחר שעות עובדים ולנהל מאגרי טיפים ביעילות.",
    "wp_cta_title": "מוכן לייעל את העלויות של המסעדה שלך?",
    "wp_cta_desc": "הצטרף למנהלים החכמים ביותר שמנהלים את עלויות המזון והעבודה שלהם במקום אחד.",
    "wp_cta_button": "בקש גישה עכשיו",
    "wp_footer_desc": "אפליקציית ניהול עלות המזון והעבודה המובילה למסעדות וברים.",
    "wp_footer_contact": "צור קשר:",
    "wp_footer_rights": "Smart Plate. כל הזכויות שמורות."
  },
  de: {
    "wp_sign_in": "Anmelden",
    "wp_get_started": "Loslegen",
    "wp_hero_title": "Die ultimative Food-Cost-App für Restaurants und die Gastronomie",
    "wp_hero_title_highlight": "Food-Cost-App",
    "wp_hero_subtitle": "Übernehmen Sie die Kontrolle über die Rentabilität Ihres Restaurants. Halten Sie Lebensmittelkosten und Arbeitskosten zusammen unter 60%.",
    "wp_request_access": "Zugang anfordern",
    "wp_login_dashboard": "Zum Dashboard anmelden",
    "wp_no_credit_card": "Keine Kreditkarte erforderlich",
    "wp_setup_minutes": "Einrichtung in Minuten",
    "wp_features_title": "Alles, was Sie für ein profitables Restaurant brauchen",
    "wp_features_subtitle": "Hören Sie auf zu raten. Beginnen Sie mit der Verfolgung Ihrer Lebensmittel- und Arbeitskosten in Echtzeit.",
    "wp_feature1_title": "Lebensmittelkosten-Management",
    "wp_feature1_desc": "Senden Sie Lieferantenbestellungen direkt per WhatsApp. Scannen Sie Rechnungen sofort. Verfolgen Sie Inventarzählungen und berechnen Sie Ihre genauen Actual Food Cost (AFC) Prozentsätze ohne Kopfschmerzen durch komplexe Tabellen.",
    "wp_feature2_title": "Arbeitskosten-App",
    "wp_feature2_desc": "Erstellen Sie wöchentliche Zeitpläne in Minuten. Verfolgen Sie Mitarbeiterstunden, verwalten Sie Trinkgeld-Pools und prognostizieren Sie Ihre Arbeitskosten-Prozentsätze gegen Ihre prognostizierten Verkäufe, noch bevor die Woche beginnt.",
    "wp_feature3_title": "Echtzeit-Dashboard",
    "wp_feature3_desc": "Ihre monatliche Leistung auf einen Blick. Überwachen Sie die goldene Regel der Gastronomie: Halten Sie Ihre kombinierten Food-Cost + Arbeitskosten strikt unter 60%. Erhalten Sie Benachrichtigungen, wenn Sie über dem Budget liegen.",
    "wp_comparison_text": "Während veraltete Systeme wie MarketMan sich stark auf erschöpfende Rezeptkalkulation konzentrieren und Zest sich auf grundlegende Planung konzentriert, kombiniert Smart Plate Basic das Beste aus beiden Welten in einer einzigen, blitzschnellen App für moderne Betreiber.",
    "wp_comp1": "Schnelleres Bestellen: Bestellen Sie per WhatsApp direkt aus der App. Keine Anmeldungen bei Lieferantenportalen erforderlich.",
    "wp_comp2": "Einheitliches Dashboard: Sehen Sie Ihre Arbeitskosten und Lebensmittelkosten nebeneinander.",
    "wp_comp3": "Einfacheres Inventar: Zählen Sie, was zählt, scannen Sie Rechnungen und erhalten Sie Ihren AFC sofort.",
    "wp_try_button": "Probieren Sie Smart Plate Basic aus",
    "wp_why_choose_us": "Warum Restaurants uns wählen",
    "wp_why1_title": "Sparen Sie 10+ Stunden pro Woche",
    "wp_why1_desc": "Automatisches Scannen von Rechnungen und schnelle Planung.",
    "wp_why2_title": "Stoppen Sie Gewinnlecks",
    "wp_why2_desc": "Erfassen Sie Preisänderungen von Lieferanten und Überstunden sofort.",
    "wp_why3_title": "Bereit für den Buchhalter",
    "wp_why3_desc": "Exportieren Sie alle Rechnungen und Lohndaten mit einem Klick.",
    "wp_guide_title": "Der ultimative Leitfaden zum Lebensmittelkosten-Management",
    "wp_guide_q1_title": "Was ist Lebensmittelkosten-Management?",
    "wp_guide_q1_desc": "Lebensmittelkosten-Management ist der Prozess der Verfolgung, Analyse und Optimierung der Kosten der in einem Restaurant oder einer Bar verwendeten Zutaten. Effektives Lebensmittelkosten-Management stellt sicher, dass ein Unternehmen profitabel bleibt, indem die Cost of Goods Sold (COGS) auf einem optimalen Niveau, typischerweise zwischen 28% und 32% des gesamten Lebensmittelumsatzes, gehalten werden.",
    "wp_guide_q2_title": "5 bewährte Strategien zur Verwaltung Ihrer Lebensmittelkosten",
    "wp_guide_q2_l1": "Inventar regelmäßig verfolgen: Führen Sie wöchentliche oder monatliche Inventarzählungen durch, um Ihre tatsächlichen Lebensmittelkosten (AFC) im Vergleich zu Ihren theoretischen Lebensmittelkosten zu verstehen.",
    "wp_guide_q2_l2": "Lieferantenpreise überwachen: Behalten Sie die Rechnungspreise genau im Auge. Smart Plate Basic hebt Preisänderungen automatisch hervor, wenn Sie Lieferbelege scannen.",
    "wp_guide_q2_l3": "Portionskontrolle optimieren: Standardisieren Sie Rezepte und schulen Sie das Personal, um konsistente Portionsgrößen sicherzustellen und Abfall sowie Überportionierung zu reduzieren.",
    "wp_guide_q2_l4": "Lebensmittelabfälle reduzieren: Verfolgen Sie Abfallberichte, um festzustellen, welche Artikel weggeworfen werden, und passen Sie Ihre Vorbereitungsniveaus entsprechend an.",
    "wp_guide_q2_l5": "Verwenden Sie eine Food-Cost-App: Ersetzen Sie manuelle Tabellenkalkulationen durch eine dedizierte Lebensmittelkosten-Management-App, um Berechnungen zu automatisieren und Echtzeit-Rentabilitäts-Dashboards zu erhalten.",
    "wp_guide_q3_title": "Warum Arbeitskosten-Management wichtig ist",
    "wp_guide_q3_desc": "Während die Lebensmittelkosten entscheidend sind, sind die Arbeitskosten die zweite massive Ausgabe für jedes Restaurant. Die goldene Regel der Gastronomie besteht darin, Ihre kombinierten Hauptkosten (Lebensmittelkosten + Arbeitskosten) unter 60% zu halten. Eine dedizierte Arbeitskosten-Management-App hilft Ihnen, wöchentliche Pläne zu prognostizieren, Mitarbeiterstunden zu verfolgen und Trinkgeld-Pools effizient zu verwalten.",
    "wp_cta_title": "Bereit, die Kosten Ihres Restaurants zu optimieren?",
    "wp_cta_desc": "Schließen Sie sich den klügsten Betreibern an, die ihre Lebensmittel- und Arbeitskosten an einem Ort verwalten.",
    "wp_cta_button": "Zugang jetzt anfordern",
    "wp_footer_desc": "Die führende Food-Cost- und Arbeitskosten-Management-App für Restaurants und Bars.",
    "wp_footer_contact": "Kontaktiere uns:",
    "wp_footer_rights": "Smart Plate. Alle Rechte vorbehalten."
  },
  el: {
    "wp_sign_in": "Σύνδεση",
    "wp_get_started": "Ξεκινήστε",
    "wp_hero_title": "Η απόλυτη εφαρμογή κόστους τροφίμων για εστιατόρια και τον κλάδο της φιλοξενίας",
    "wp_hero_title_highlight": "εφαρμογή κόστους τροφίμων",
    "wp_hero_subtitle": "Αναλάβετε τον έλεγχο της κερδοφορίας του εστιατορίου σας. Κρατήστε το κόστος τροφίμων και το κόστος εργασίας σε συνδυασμό κάτω από 60%.",
    "wp_request_access": "Ζητήστε Πρόσβαση",
    "wp_login_dashboard": "Είσοδος στον Πίνακα Ελέγχου",
    "wp_no_credit_card": "Δεν απαιτείται πιστωτική κάρτα",
    "wp_setup_minutes": "Ρύθμιση σε λίγα λεπτά",
    "wp_features_title": "Όλα όσα χρειάζεστε για να διαχειριστείτε ένα κερδοφόρο εστιατόριο",
    "wp_features_subtitle": "Σταματήστε να μαντεύετε. Ξεκινήστε να παρακολουθείτε το κόστος τροφίμων και εργασίας σας σε πραγματικό χρόνο.",
    "wp_feature1_title": "Διαχείριση Κόστους Τροφίμων",
    "wp_feature1_desc": "Στείλτε παραγγελίες στους προμηθευτές απευθείας μέσω WhatsApp. Σαρώστε τα τιμολόγια άμεσα. Παρακολουθήστε τις απογραφές και υπολογίστε το ακριβές ποσοστό Πραγματικού Κόστους Τροφίμων (AFC) χωρίς τον πονοκέφαλο των πολύπλοκων υπολογιστικών φύλλων.",
    "wp_feature2_title": "Εφαρμογή Κόστους Εργασίας",
    "wp_feature2_desc": "Δημιουργήστε εβδομαδιαία προγράμματα σε λίγα λεπτά. Παρακολουθήστε τις ώρες των εργαζομένων, διαχειριστείτε τα φιλοδωρήματα και προβλέψτε το ποσοστό κόστους εργασίας έναντι των αναμενόμενων πωλήσεών σας προτού καν ξεκινήσει η εβδομάδα.",
    "wp_feature3_title": "Πίνακας Ελέγχου Πραγματικού Χρόνου",
    "wp_feature3_desc": "Η μηνιαία σας απόδοση με μια ματιά. Παρακολουθήστε τον χρυσό κανόνα της φιλοξενίας: κρατήστε το συνδυασμένο Κόστος Τροφίμων + Κόστος Εργασίας αυστηρά κάτω από το 60%. Λάβετε ειδοποιήσεις όταν ξεπερνάτε τον προϋπολογισμό.",
    "wp_comparison_text": "Ενώ παλαιότερα συστήματα όπως το MarketMan επικεντρώνονται σε μεγάλο βαθμό στην εξαντλητική κοστολόγηση συνταγών, και το Zest επικεντρώνεται στο βασικό προγραμματισμό, το Smart Plate Basic συνδυάζει τα καλύτερα και από τους δύο κόσμους σε μια ενιαία, αστραπιαία εφαρμογή σχεδιασμένη για σύγχρονους χειριστές.",
    "wp_comp1": "Γρηγορότερη Παραγγελία: Παραγγείλετε μέσω WhatsApp απευθείας από την εφαρμογή. Δεν απαιτούνται συνδέσεις σε πύλες προμηθευτών.",
    "wp_comp2": "Ενοποιημένος Πίνακας Ελέγχου: Δείτε το Κόστος Εργασίας και το Κόστος Τροφίμων δίπλα-δίπλα.",
    "wp_comp3": "Απλούστερη Απογραφή: Μετρήστε ό,τι έχει σημασία, σαρώστε τιμολόγια και λάβετε το AFC σας άμεσα.",
    "wp_try_button": "Δοκιμάστε το Smart Plate Basic",
    "wp_why_choose_us": "Γιατί μας Επιλέγουν τα Εστιατόρια",
    "wp_why1_title": "Εξοικονομήστε 10+ Ώρες την Εβδομάδα",
    "wp_why1_desc": "Αυτοματοποιημένη σάρωση τιμολογίων και γρήγορος προγραμματισμός.",
    "wp_why2_title": "Σταματήστε τις Απώλειες Κερδών",
    "wp_why2_desc": "Εντοπίστε τις αλλαγές τιμών των προμηθευτών και τις υπερωρίες άμεσα.",
    "wp_why3_title": "Έτοιμο για Λογιστή",
    "wp_why3_desc": "Εξάγετε όλα τα τιμολόγια και τα δεδομένα μισθοδοσίας με ένα κλικ.",
    "wp_guide_title": "Ο Απόλυτος Οδηγός Διαχείρισης Κόστους Τροφίμων",
    "wp_guide_q1_title": "Τι είναι η Διαχείριση Κόστους Τροφίμων;",
    "wp_guide_q1_desc": "Η διαχείριση κόστους τροφίμων είναι η διαδικασία παρακολούθησης, ανάλυσης και βελτιστοποίησης του κόστους των συστατικών που χρησιμοποιούνται σε ένα εστιατόριο ή μπαρ. Η αποτελεσματική διαχείριση του κόστους τροφίμων διασφαλίζει ότι μια επιχείρηση παραμένει κερδοφόρα διατηρώντας το κόστος των πωληθέντων αγαθών (COGS) σε ένα βέλτιστο επίπεδο, συνήθως μεταξύ 28% και 32% των συνολικών πωλήσεων τροφίμων.",
    "wp_guide_q2_title": "5 Αποδεδειγμένες Στρατηγικές για να Διαχειριστείτε το Κόστος Τροφίμων",
    "wp_guide_q2_l1": "Παρακολουθήστε τακτικά την Απογραφή: Πραγματοποιήστε εβδομαδιαίες ή μηνιαίες καταμετρήσεις αποθέματος για να κατανοήσετε το πραγματικό κόστος τροφίμων (AFC) έναντι του θεωρητικού σας κόστους.",
    "wp_guide_q2_l2": "Παρακολουθήστε τις Τιμές Προμηθευτών: Παρακολουθήστε στενά τις τιμές των τιμολογίων. Το Smart Plate Basic επισημαίνει αυτόματα τις αλλαγές τιμών όταν σαρώνετε τις αποδείξεις παράδοσης.",
    "wp_guide_q2_l3": "Βελτιστοποιήστε τον Έλεγχο Μερίδων: Τυποποιήστε τις συνταγές και εκπαιδεύστε το προσωπικό ώστε να διασφαλίσετε σταθερά μεγέθη μερίδων, μειώνοντας τη σπατάλη και την υπερβολική παροχή.",
    "wp_guide_q2_l4": "Μειώστε τη Σπατάλη Τροφίμων: Παρακολουθήστε τις αναφορές σπατάλης για να εντοπίσετε ποια είδη πετιούνται και προσαρμόστε τα επίπεδα προετοιμασίας σας ανάλογα.",
    "wp_guide_q2_l5": "Χρησιμοποιήστε μια Εφαρμογή Κόστους Τροφίμων: Αντικαταστήστε τα χειροκίνητα υπολογιστικά φύλλα με μια αποκλειστική εφαρμογή διαχείρισης κόστους τροφίμων για να αυτοματοποιήσετε τους υπολογισμούς και να λάβετε πίνακες ελέγχου κερδοφορίας σε πραγματικό χρόνο.",
    "wp_guide_q3_title": "Γιατί Έχει Σημασία η Διαχείριση Κόστους Εργασίας",
    "wp_guide_q3_desc": "Ενώ το κόστος των τροφίμων είναι κρίσιμο, το κόστος εργασίας είναι η δεύτερη τεράστια δαπάνη για κάθε εστιατόριο. Ο χρυσός κανόνας της φιλοξενίας είναι να διατηρείτε τα συνδυασμένα βασικά σας κόστη (Κόστος Τροφίμων + Κόστος Εργασίας) κάτω από το 60%. Μια αποκλειστική εφαρμογή διαχείρισης κόστους εργασίας σας βοηθά να προβλέψετε εβδομαδιαία προγράμματα, να παρακολουθείτε τις ώρες των εργαζομένων και να διαχειρίζεστε τα φιλοδωρήματα αποτελεσματικά.",
    "wp_cta_title": "Είστε έτοιμοι να βελτιστοποιήσετε τα έξοδα του εστιατορίου σας;",
    "wp_cta_desc": "Συνδεθείτε με τους πιο έξυπνους επαγγελματίες που διαχειρίζονται τα έξοδα τροφίμων και εργασίας τους σε ένα μέρος.",
    "wp_cta_button": "Ζητήστε Πρόσβαση Τώρα",
    "wp_footer_desc": "Η κορυφαία εφαρμογή διαχείρισης κόστους τροφίμων και εργασίας για εστιατόρια και μπαρ.",
    "wp_footer_contact": "Επικοινωνήστε μαζί μας:",
    "wp_footer_rights": "Smart Plate. Με την επιφύλαξη παντός δικαιώματος."
  }
};

// Pure public marketing page: never checks auth or redirects
export default function WelcomePublic() {
  const { language } = useLanguage();
  const [openRequest, setOpenRequest] = React.useState(false);

  const t = (key) => welcomeTranslations[language]?.[key] || welcomeTranslations['en'][key] || key;
  const isRTL = language === 'he' || language === 'ar';

  useEffect(() => {
    document.title = "Food Cost App | Smart Plate Basic for Restaurants";
    
    const setMetaTag = (name, content, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Standard SEO
    setMetaTag("description", "The ultimate food cost app and labor cost management app for restaurants and bars. A smarter alternative to MarketMan and Zest. Track inventory, schedule staff, and keep costs under 60%.");
    setMetaTag("keywords", "food cost app, restaurant management software, labor cost app, restaurant profit, Smart Plate, MarketMan alternative");
    
    // Open Graph / Facebook
    setMetaTag("og:type", "website", true);
    setMetaTag("og:title", "Smart Plate | The Ultimate Food Cost App", true);
    setMetaTag("og:description", "Stop guessing, start profiting. Track inventory, calculate food costs, and manage suppliers with the ultimate app for restaurants.", true);
    setMetaTag("og:image", "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg", true);
    
    // Twitter
    setMetaTag("twitter:card", "summary_large_image", false);
    setMetaTag("twitter:title", "Smart Plate | The Ultimate Food Cost App", false);
    setMetaTag("twitter:description", "Stop guessing, start profiting. Track inventory, calculate food costs, and manage suppliers with the ultimate app for restaurants.", false);
    setMetaTag("twitter:image", "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg", false);
  }, []);

  const handleSignIn = async () => {
    await base44.auth.redirectToLogin(createPageUrl('Orders'));
  };

  return (
    <div className={`min-h-screen bg-white font-sans text-gray-900 ${isRTL ? 'rtl text-right' : 'ltr text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg"
                alt="Smart Plate Logo"
                className="h-8 w-auto object-contain" />

              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 flex items-center justify-center shadow-sm">
                  <span className="text-white font-black text-sm tracking-widest">B</span>
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-lg font-extrabold tracking-tight leading-none">basic</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <WelcomeLangSwitcher />
              <Button variant="ghost" onClick={handleSignIn} className="font-semibold hidden sm:flex">{t('wp_sign_in')}</Button>
              <Button onClick={() => setOpenRequest(true)} className="bg-[#107c41] hover:bg-[#0c5e31] text-white">{t('wp_get_started')}</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 mb-6">
              {t('wp_hero_title').split(t('wp_hero_title_highlight'))[0]}
              <span className="text-[#107c41]">{t('wp_hero_title_highlight')}</span>
              {t('wp_hero_title').split(t('wp_hero_title_highlight'))[1] || ''}
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed">
              {t('wp_hero_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => setOpenRequest(true)} className="w-full sm:w-auto text-lg h-14 px-8 bg-[#107c41] hover:bg-[#0c5e31]">
                {t('wp_request_access')} <ArrowRight className={`w-5 h-5 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
              </Button>
              <Button size="lg" variant="outline" onClick={handleSignIn} className="w-full sm:w-auto text-lg h-14 px-8">
                {t('wp_login_dashboard')}
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500 font-medium">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> {t('wp_no_credit_card')}</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> {t('wp_setup_minutes')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">{t('wp_features_title')}</h2>
            <p className="mt-4 text-lg text-gray-600">{t('wp_features_subtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('wp_feature1_title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('wp_feature1_desc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('wp_feature2_title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('wp_feature2_desc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('wp_feature3_title')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('wp_feature3_desc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Section (SEO Optimized) */}
      <div className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: t('wp_comp1').replace(/^([^:]+:)/, '<strong>$1</strong>') }} />
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: t('wp_comp2').replace(/^([^:]+:)/, '<strong>$1</strong>') }} />
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700" dangerouslySetInnerHTML={{ __html: t('wp_comp3').replace(/^([^:]+:)/, '<strong>$1</strong>') }} />
                </li>
              </ul>
              <Button onClick={() => setOpenRequest(true)} className="bg-gray-900 hover:bg-gray-800 text-white px-8">
                {t('wp_try_button')}
              </Button>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">{t('wp_why_choose_us')}</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('wp_why1_title')}</h4>
                      <p className="text-sm text-gray-500">{t('wp_why1_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('wp_why2_title')}</h4>
                      <p className="text-sm text-gray-500">{t('wp_why2_desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{t('wp_why3_title')}</h4>
                      <p className="text-sm text-gray-500">{t('wp_why3_desc')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Content Section */}
      <div className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{t('wp_guide_title')}</h2>
          
          <div className="space-y-8 text-lg text-gray-600 leading-relaxed">
            <section>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t('wp_guide_q1_title')}</h3>
              <p>{t('wp_guide_q1_desc')}</p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t('wp_guide_q2_title')}</h3>
              <ul className={`list-disc space-y-3 ${isRTL ? 'pr-6' : 'pl-6'}`}>
                <li><span dangerouslySetInnerHTML={{ __html: t('wp_guide_q2_l1').replace(/^([^:]+:)/, '<strong class="text-gray-900">$1</strong>') }} /></li>
                <li><span dangerouslySetInnerHTML={{ __html: t('wp_guide_q2_l2').replace(/^([^:]+:)/, '<strong class="text-gray-900">$1</strong>') }} /></li>
                <li><span dangerouslySetInnerHTML={{ __html: t('wp_guide_q2_l3').replace(/^([^:]+:)/, '<strong class="text-gray-900">$1</strong>') }} /></li>
                <li><span dangerouslySetInnerHTML={{ __html: t('wp_guide_q2_l4').replace(/^([^:]+:)/, '<strong class="text-gray-900">$1</strong>') }} /></li>
                <li><span dangerouslySetInnerHTML={{ __html: t('wp_guide_q2_l5').replace(/^([^:]+:)/, '<strong class="text-gray-900">$1</strong>') }} /></li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">{t('wp_guide_q3_title')}</h3>
              <p>{t('wp_guide_q3_desc')}</p>
            </section>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#107c41] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">{t('wp_cta_title')}</h2>
          <p className="text-green-100 text-lg mb-8">{t('wp_cta_desc')}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" onClick={() => setOpenRequest(true)} className="bg-white text-[#107c41] hover:bg-gray-100 text-lg px-8">
              {t('wp_cta_button')}
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center gap-2 mb-6">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg"
              alt="Smart Plate Logo"
              className="h-8 w-auto opacity-50 grayscale" />

            <span className="text-xl font-bold text-gray-500">Smart Plate</span>
          </div>
          <p className="mb-4">{t('wp_footer_desc')}</p>
          <p className="mb-8">
            {t('wp_footer_contact')} <a href="mailto:admin@smartplate.org" className="text-white hover:underline">admin@smartplate.org</a>
          </p>
          <p className="text-sm">&copy; {new Date().getFullYear()} {t('wp_footer_rights')}</p>
        </div>
      </footer>

      <AccessRequestDialog open={openRequest} onOpenChange={setOpenRequest} />
    </div>);

}