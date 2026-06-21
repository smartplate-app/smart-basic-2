import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { CheckCircle2, TrendingDown, Users, Receipt, ArrowRight, BarChart3, Clock, ShieldCheck } from "lucide-react";

const welcomeTranslations = {
  en: {
    "wp_sign_in": "Sign In",
    "wp_get_started": "Get Started",
    "wp_hero_title": "The Ultimate Food Cost App for Restaurants & the Hospitality Industry",
    "wp_hero_title_highlight": "Food Cost App",
    "wp_hero_subtitle": "Take control of your restaurant's profitability. Keep it below 60% food cost and labor cost combined together.",
    "wp_request_access": "Get Started",
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
    "wp_cta_button": "Get Started Now",
    "wp_footer_desc": "The premier food cost and labor cost management app for restaurants and bars.",
    "wp_footer_contact": "Contact us:",
    "wp_footer_rights": "Smart Plate. All rights reserved."
  },
};

// Pure public marketing page: never checks auth or redirects

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("PromoPreview Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-10 text-red-500"><h1>PromoPreview Error</h1><pre>{this.state.error.toString()}</pre></div>;
    }
    return this.props.children;
  }
}

export default function WelcomePublic() {
  const language = 'en';

  const t = (key) => welcomeTranslations[language]?.[key] || key;
  const isRTL = false;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('preview') === '1') return;
        
        if (sessionStorage.getItem('b44_logout_in_progress')) return;
        const hasCache = !!localStorage.getItem('b44_user_cache');
        if (hasCache) {
          window.location.replace(createPageUrl('Orders'));
          return;
        }
        const isAuthed = await base44.auth.isAuthenticated();
        if (isAuthed) {
          window.location.replace(createPageUrl('Orders'));
        }
      } catch (e) {}
    };
    checkAuth();
  }, []);

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
    <ErrorBoundary>
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
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" onClick={handleSignIn} className="font-semibold px-2 sm:px-4">{t('wp_sign_in')}</Button>
              <Button onClick={() => window.location.href = createPageUrl('Register')} className="bg-[#107c41] hover:bg-[#0c5e31] text-white px-3 sm:px-4">{t('wp_get_started')}</Button>
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
              <Button size="lg" onClick={() => window.location.href = createPageUrl('Register')} className="w-full sm:w-auto text-lg h-14 px-8 bg-[#107c41] hover:bg-[#0c5e31]">
                {t('wp_request_access')} <ArrowRight className={`w-5 h-5 ml-2`} />
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
              <Button onClick={() => window.location.href = createPageUrl('Register')} className="bg-gray-900 hover:bg-gray-800 text-white px-8">
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
            <Button size="lg" onClick={() => window.location.href = createPageUrl('Register')} className="bg-white text-[#107c41] hover:bg-gray-100 text-lg px-8">
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
    </div>
    </ErrorBoundary>);

}