import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, Globe, BarChart3, ChefHat, 
  Smartphone, ShoppingCart, Trash2, ArrowRight,
  ChevronDown, ChevronUp, Star
} from 'lucide-react';

const t = {
  en: {
    nav: { login: "Sign In", start: "Get Started" },
    hero: {
      h1: "Food Cost App for Restaurants",
      subtitle: "The ultimate restaurant food cost management and recipe costing software. Increase profitability and ditch the spreadsheets.",
      cta1: "Start for Free",
      cta2: "See How It Works"
    },
    features: {
      title: "Food Cost Management Features",
      cards: [
        { title: "Food Cost Percentage Calculator", desc: "Instantly track your food cost percentages in real-time with our automated tools." },
        { title: "Recipe Costing Software", desc: "Build recipes and see exact margins per plate down to the individual gram." },
        { title: "Restaurant Inventory Management App", desc: "Count inventory on your phone seamlessly and sync to the cloud." },
        { title: "Smart Purchasing", desc: "Order directly from suppliers based on low stock alerts and predictive analytics." },
        { title: "Waste Tracking", desc: "Log waste to ensure every ingredient is accounted for in your food cost app." },
        { title: "MarketMan Alternative", desc: "Get all the enterprise features without the enterprise price tag." }
      ]
    },
    howItWorks: {
      title: "How FoodCostApp Works",
      steps: [
        { title: "Add Your Ingredients", desc: "Import your vendor price lists and existing ingredients smoothly." },
        { title: "Build Your Recipes", desc: "Use the food cost calculator restaurant tool to price your menu accurately." },
        { title: "Maximize Profit", desc: "Track live inventory and optimize your restaurant food cost management daily." }
      ]
    },
    comparison: {
      title: "FoodCostApp vs MarketMan",
      rows: [
        { feature: "Live Food Cost Calculator", us: true, them: true },
        { feature: "Recipe Costing Software", us: true, them: true },
        { feature: "Clean, Modern Interface", us: true, them: false },
        { feature: "Affordable Pricing", us: true, them: false },
        { feature: "Mobile-First Inventory", us: true, them: true }
      ]
    },
    testimonials: {
      title: "Trusted by Top Restaurants",
      reviews: [
        { name: "Sarah J.", role: "Restaurant Owner", text: "\"This food cost app completely changed how we run our kitchen. The recipe costing software is brilliant.\"" },
        { name: "Michael R.", role: "Head Chef", text: "\"Finally, a restaurant inventory management app that doesn't feel like it was built in 1999. Best MarketMan alternative out there.\"" },
        { name: "David L.", role: "F&B Director", text: "\"Our food cost percentage dropped by 4% in the first month using this food cost calculator restaurant tool.\"" }
      ]
    },
    faq: {
      title: "Food Cost App FAQ",
      qas: [
        { q: "What is a food cost app?", a: "A food cost app helps restaurants track ingredient prices, recipe margins, and inventory to maintain profitability." },
        { q: "How do you calculate food cost percentage?", a: "Our food cost percentage calculator automates it: (Beginning Inventory + Purchases - Ending Inventory) / Food Sales." },
        { q: "Is this a good MarketMan alternative?", a: "Yes! We offer a cleaner, faster interface for restaurant food cost management at a fraction of the price." },
        { q: "Does it include recipe costing software?", a: "Absolutely. You can build out every menu item down to the gram to see exact margins." },
        { q: "Can I use it for restaurant inventory management?", a: "Yes, our restaurant inventory management app works on any mobile device for easy counting." },
        { q: "Do you integrate with POS systems?", a: "We support integrations with major POS providers to pull live sales data." },
        { q: "How long does setup take?", a: "Most restaurants are up and running within a few hours, easily importing their existing spreadsheets." },
        { q: "Is it suitable for multi-location chains?", a: "Yes, our restaurant food cost management platform scales from single locations to large chains." }
      ]
    },
    cta: {
      title: "Ready to take control of your kitchen?",
      btn: "Get Started Now"
    }
  },
  he: {
    nav: { login: "התחברות", start: "התחל עכשיו" },
    hero: {
      h1: "אפליקציה לניהול עלויות מזון",
      subtitle: "התוכנה המובילה לניהול עלויות מסעדה וחישוב עלות מזון. שפר את הרווחיות והיפטר מטבלאות אקסל מסורבלות.",
      cta1: "התחל בחינם",
      cta2: "איך זה עובד"
    },
    features: {
      title: "פיצ'רים לניהול עלויות מסעדה",
      cards: [
        { title: "חישוב עלות מזון בזמן אמת", desc: "מחשבון עלות מזון חכם למעקב אחר אחוזי הרווח ועדכון מחירים בלייב." },
        { title: "ניהול מתכונים (Recipe Costing)", desc: "תמחור מנות מדויק ברמת הגרם הבודד לשליטה מקסימלית." },
        { title: "ניהול מלאי מסעדה", desc: "ספירות מלאי מהירות ישירות מהטלפון הנייד בממשק ידידותי למשתמש." },
        { title: "הזמנות חכמות מספקים", desc: "ביצוע הזמנות סחורה בצורה חכמה ואוטומטית לפי התראות חוסר במלאי." },
        { title: "מעקב פחת ובלאי", desc: "תיעוד זריקות ובלאי כדי למנוע בזבוז ולשמור על רווחיות המסעדה." },
        { title: "תוכנה לניהול מסעדה מתקדמת", desc: "חלופה משתלמת ומתקדמת למערכות המיושנות הקיימות כיום בשוק." }
      ]
    },
    howItWorks: {
      title: "איך התוכנה עובדת",
      steps: [
        { title: "ייבוא ספקים ומוצרים", desc: "הכנס את מחירוני הספקים והמוצרים שלך למערכת בלחיצת כפתור." },
        { title: "בניית עצי מוצר", desc: "השתמש במערכת בניית מתכונים לביצוע חישוב עלות מזון (Food Cost)." },
        { title: "שליטה ברווחיות", desc: "נהל מלאי מסעדה, עקוב אחר חריגות וייעל את ניהול עלויות מסעדה באופן שוטף." }
      ]
    },
    comparison: {
      title: "אנחנו לעומת המתחרים",
      rows: [
        { feature: "חישוב עלות מזון מדויק", us: true, them: true },
        { feature: "תמחור מנות (Food Cost)", us: true, them: true },
        { feature: "ממשק מודרני ונקי", us: true, them: false },
        { feature: "מחיר הוגן למסעדנים", us: true, them: false },
        { feature: "אפליקציה למובייל", us: true, them: true }
      ]
    },
    testimonials: {
      title: "הבחירה של המסעדנים המובילים",
      reviews: [
        { name: "שרון י.", role: "בעלת מסעדה", text: "\"אפליקציה לניהול עלויות מזון ששינתה לנו את החיים. חישוב עלות מזון מעולם לא היה קל כל כך.\"" },
        { name: "מיכאל ר.", role: "שף ראשי", text: "\"סוף סוף ניהול מלאי מסעדה שלא מרגיש כמו עונש. מערכת מדהימה, נוחה ומהירה.\"" },
        { name: "דוד ל.", role: "מנהל תפעול", text: "\"הורדנו את אחוז הפוד קוסט ב-4% בחודש הראשון. תוכנה לניהול מסעדה שהיא פשוט חובה לכל עסק.\"" }
      ]
    },
    faq: {
      title: "שאלות ותשובות נפוצות",
      qas: [
        { q: "למה אני צריך אפליקציה לניהול עלויות מזון?", a: "כדי לחסוך כסף. מעקב דיגיטלי חוסך טעויות של כלי הקלדה, מונע בזבוז ומגדיל ישירות את שורת הרווח." },
        { q: "איך מתבצע חישוב עלות מזון במערכת?", a: "המערכת מחשבת באופן אוטומטי ובזמן אמת את נוסחת הפוד קוסט: (מלאי פתיחה + קניות - מלאי סגירה) / מכירות." },
        { q: "האם זו תוכנה לניהול מסעדה מלאה?", a: "אנחנו מתמקדים בליבת הכספים: ניהול מלאי מסעדה, פוד קוסט (Food Cost) והזמנות מספקים." },
        { q: "האם קיים פתרון לניהול מתכונים ועצי מוצר?", a: "כן, תוכלו לתמחר כל מנה באופן פרטני, לראות שולי רווח ולהתאים מחירים בהתאם להתייקרויות חומרי גלם." },
        { q: "איך מתבצעות ספירות מלאי?", a: "הצוות מבצע ספירה ישירות דרך אפליקציה למובייל, עם שמירה אוטומטית בענן וסנכרון מיידי." },
        { q: "האם המערכת מתממשקת לקופה?", a: "המערכת תומכת במשיכת נתוני מכירות מהקופות המובילות בישראל לקבלת פוד-קוסט חי ואמיתי." },
        { q: "כמה זמן לוקח להטמיע את המערכת?", a: "תהליך האונבורדינג מהיר מאוד. ברוב המקרים תוך מספר שעות ניתן לייבא את הנתונים מאקסל ולהתחיל לעבוד." },
        { q: "האם זה מתאים לרשתות של מספר סניפים?", a: "בהחלט. המערכת תומכת בניהול ריבוי סניפים, השוואת ביצועים ומרכז הזמנות אזורי." }
      ]
    },
    cta: {
      title: "מוכנים לקחת שליטה על המסעדה שלכם?",
      btn: "התחילו עכשיו"
    }
  }
};

const featureIcons = [BarChart3, ChefHat, Smartphone, ShoppingCart, Trash2, Globe];

export default function WelcomePublic() {
  const [lang, setLang] = useState('he');
  const [openFaq, setOpenFaq] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          window.location.replace("https://smartplate-app.github.io/foodcostapp-landing/");
        } else {
          setIsCheckingAuth(false);
        }
      } catch (err) {
        window.location.replace("https://smartplate-app.github.io/foodcostapp-landing/");
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    document.title = lang === 'en' 
      ? 'Food Cost App for Restaurants | Restaurant Inventory Management'
      : 'אפליקציה לניהול עלויות מזון | ניהול מלאי מסעדה';
      
    const updateMeta = (name, content, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMeta('description', lang === 'en' 
      ? 'The best food cost app and restaurant food cost management software. Calculate food cost percentage, manage inventory, and recipe costing. The #1 MarketMan alternative.'
      : 'אפליקציה לניהול עלויות מזון הטובה ביותר למסעדות. חישוב עלות מזון, ניהול מלאי מסעדה ותוכנה לניהול מסעדה. ניהול עלויות מסעדה בצורה חכמה.', false);

    updateMeta('keywords', lang === 'en'
      ? 'food cost app, restaurant food cost management, food cost calculator restaurant, MarketMan alternative, restaurant inventory management app, food cost percentage calculator, recipe costing software'
      : 'אפליקציה לניהול עלויות מזון, ניהול עלויות מסעדה, חישוב עלות מזון, ניהול מלאי מסעדה, תוכנה לניהול מסעדה', false);

    updateMeta('og:title', lang === 'en' ? 'Food Cost App for Restaurants' : 'אפליקציה לניהול עלויות מזון', true);
    updateMeta('og:description', lang === 'en' ? 'Top restaurant food cost management software.' : 'התוכנה המובילה לניהול עלויות מסעדה.', true);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.origin);

    let script = document.querySelector('#json-ld');
    if (!script) {
      script = document.createElement('script');
      script.id = 'json-ld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.innerHTML = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "FoodCostApp",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "All",
      "description": lang === 'en' ? "Restaurant food cost management and inventory software." : "תוכנה לניהול מסעדה וחישוב עלות מזון.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      }
    });
  }, [lang]);

  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  const d = t[lang];
  const isRtl = lang === 'he';

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center"></div>;
  }

  return (
    <div className={`min-h-screen font-sans ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-green-500" />
            <span className="text-xl font-bold text-white tracking-tight">SmartPlate</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLang(lang === 'en' ? 'he' : 'en')}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{lang === 'en' ? 'עברית' : 'English'}</span>
            </button>
            <Button variant="ghost" className="text-white hover:bg-slate-800" onClick={handleLogin}>
              {d.nav.login}
            </Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleLogin}>
              {d.nav.start}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-40 pb-24 px-4 bg-slate-900 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            {d.hero.h1}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            {d.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="w-full sm:w-auto h-14 px-8 text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/20" onClick={handleLogin}>
              {d.hero.cta1}
            </Button>
            <Button variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white bg-transparent" onClick={() => document.getElementById('how-it-works').scrollIntoView({behavior: 'smooth'})}>
              {d.hero.cta2}
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-16">
            {d.features.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {d.features.cards.map((card, idx) => {
              const Icon = featureIcons[idx] || CheckCircle2;
              return (
                <div key={idx} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center md:text-start">
                  <div className={`w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mb-6 mx-auto ${isRtl ? 'md:mr-0' : 'md:ml-0'}`}>
                    <Icon className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-16">
            {d.howItWorks.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {d.howItWorks.steps.map((step, idx) => (
              <div key={idx} className="relative text-center">
                <div className="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-6 relative z-10 shadow-xl shadow-slate-900/10">
                  {idx + 1}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-12">
            {d.comparison.title}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={`p-6 border-b border-slate-200 text-slate-600 font-medium ${isRtl?'text-right':'text-left'}`}>Feature</th>
                  <th className="p-6 border-b-2 border-green-500 text-center font-bold text-slate-900 bg-green-50/80">SmartPlate</th>
                  <th className="p-6 border-b border-slate-200 text-center font-medium text-slate-500">MarketMan</th>
                </tr>
              </thead>
              <tbody>
                {d.comparison.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className={`p-6 font-medium text-slate-800 ${isRtl?'text-right':'text-left'}`}>{row.feature}</td>
                    <td className="p-6 text-center bg-green-50/30">
                      {row.us ? <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-6 text-center">
                      {row.them ? <CheckCircle2 className="w-6 h-6 text-slate-300 mx-auto" /> : <span className="text-slate-300">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-16">
            {d.testimonials.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {d.testimonials.reviews.map((review, idx) => (
              <div key={idx} className="bg-slate-800 p-8 rounded-2xl border border-slate-700">
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-green-500 text-green-500" />
                  ))}
                </div>
                <p className="text-slate-300 text-lg mb-8 leading-relaxed">{review.text}</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold">{review.name}</h4>
                    <p className="text-slate-400 text-sm">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-900 mb-12">
            {d.faq.title}
          </h2>
          <div className="space-y-4">
            {d.faq.qas.map((qa, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <button 
                  className={`w-full p-6 flex items-center justify-between font-bold text-lg text-slate-900 hover:bg-slate-50 transition ${isRtl ? 'text-right' : 'text-left'}`}
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span>{qa.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-6 h-6 text-slate-400 shrink-0" /> : <ChevronDown className="w-6 h-6 text-slate-400 shrink-0" />}
                </button>
                {openFaq === idx && (
                  <div className={`px-6 pb-6 pt-2 text-slate-600 text-lg leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
                    {qa.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-green-600 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-8 leading-tight">
            {d.cta.title}
          </h2>
          <Button className="h-16 px-10 text-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl" onClick={handleLogin}>
            {d.cta.btn}
            <ArrowRight className={`w-6 h-6 ${isRtl ? 'mr-3 rotate-180' : 'ml-3'}`} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 text-center border-t border-slate-900">
        <div className="flex items-center justify-center gap-2 mb-6">
          <ChefHat className="w-6 h-6 text-green-500" />
          <span className="text-lg font-bold text-slate-300">SmartPlate</span>
        </div>
        <p className="text-slate-500">
          © {new Date().getFullYear()} SmartPlate Food Cost App. All rights reserved.
        </p>
      </footer>
    </div>
  );
}