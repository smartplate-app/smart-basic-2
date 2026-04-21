import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AccessRequestDialog from "../components/access/AccessRequestDialog";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { CheckCircle2, TrendingDown, Users, Receipt, ArrowRight, BarChart3, Clock, ShieldCheck } from "lucide-react";

// Pure public marketing page: never checks auth or redirects
export default function WelcomePublic() {
  const [openRequest, setOpenRequest] = React.useState(false);

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
    <div className={`min-h-screen bg-gray-50 font-sans text-gray-900 ${isRTL ? 'rtl text-right' : 'ltr text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
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
              <div className="w-32"><LanguageSwitcher /></div>
              <Button variant="ghost" onClick={handleSignIn} className="font-semibold hidden sm:flex">{t('wp_sign_in')}</Button>
              <Button onClick={() => setOpenRequest(true)} className="bg-[#107c41] hover:bg-[#0c5e31] text-white">{t('wp_get_started')}</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-blue-50 opacity-50" />
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
      <div className="py-20 bg-gray-50">
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
              <p className="text-lg text-gray-600 mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('wp_comparison_text').replace('Smart Plate Basic', '<strong>Smart Plate Basic</strong>') }} />
              
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