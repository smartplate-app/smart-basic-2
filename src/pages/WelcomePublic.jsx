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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
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
              <Button variant="ghost" onClick={handleSignIn} className="font-semibold">Sign In</Button>
              <Button onClick={() => setOpenRequest(true)} className="bg-[#107c41] hover:bg-[#0c5e31] text-white">Get Started</Button>
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
              The Ultimate <span className="text-[#107c41]">Food Cost App</span> & <span className="text-blue-600">Labor Cost App</span> for Restaurants
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed">
              Take control of your restaurant's profitability. Keep your combined costs under the magic 60% mark.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => setOpenRequest(true)} className="w-full sm:w-auto text-lg h-14 px-8 bg-[#107c41] hover:bg-[#0c5e31]">
                Request Access <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleSignIn} className="w-full sm:w-auto text-lg h-14 px-8">
                Login to Dashboard
              </Button>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500 font-medium">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> Setup in minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need to run a profitable restaurant</h2>
            <p className="mt-4 text-lg text-gray-600">Stop guessing. Start tracking your food and labor costs in real-time.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-6">
                <TrendingDown className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Food Cost Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Send supplier orders directly via WhatsApp. Scan invoices instantly. Track inventory counts and calculate your exact Actual Food Cost (AFC) percentage without the headache of complex spreadsheets.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Labor Cost App</h3>
              <p className="text-gray-600 leading-relaxed">
                Build weekly schedules in minutes. Track employee hours, manage tip pools, and forecast your labor cost percentage against your projected sales before the week even begins.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Dashboard</h3>
              <p className="text-gray-600 leading-relaxed">
                Your monthly performance at a glance. Monitor the golden rule of hospitality: keeping your combined Food Cost + Labor Cost strictly under 60%. Get alerts when you're trending over budget.
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
              


              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                While legacy systems like MarketMan focus heavily on exhaustive recipe costing, and Zest focuses on basic scheduling, <strong>Smart Plate Basic</strong> combines the best of both worlds into a single, lightning-fast app designed for modern operators.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700"><strong>Faster Ordering:</strong> Order via WhatsApp directly from the app. No supplier portal logins required.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700"><strong>Unified Dashboard:</strong> See your Labor Cost and Food Cost side-by-side.</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700"><strong>Simpler Inventory:</strong> Count what matters, scan invoices, and get your AFC instantly.</span>
                </li>
              </ul>
              <Button onClick={() => setOpenRequest(true)} className="bg-gray-900 hover:bg-gray-800 text-white px-8">
                Try Smart Plate Basic
              </Button>
            </div>
            <div className="mt-12 lg:mt-0">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Why Restaurants Choose Us</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Save 10+ Hours a Week</h4>
                      <p className="text-sm text-gray-500">Automated invoice scanning and quick scheduling.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Stop Profit Leaks</h4>
                      <p className="text-sm text-gray-500">Catch supplier price changes and overtime instantly.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Accountant Ready</h4>
                      <p className="text-sm text-gray-500">Export all invoices and payroll data with one click.</p>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">The Ultimate Guide to Food Cost Management</h2>
          
          <div className="space-y-8 text-lg text-gray-600 leading-relaxed">
            <section>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">What is Food Cost Management?</h3>
              <p>
                Food cost management is the process of tracking, analyzing, and optimizing the cost of ingredients used in a restaurant or bar. Effective food cost management ensures that a business remains profitable by keeping the cost of goods sold (COGS) at an optimal level, typically between 28% and 32% of total food sales.
              </p>
            </section>

            <section>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">5 Proven Strategies to Manage Your Food Cost</h3>
              <ul className="list-disc pl-6 space-y-3">
                <li><strong className="text-gray-900">Track Inventory Regularly:</strong> Conduct weekly or monthly inventory counts to understand your actual food cost (AFC) versus your theoretical food cost.</li>
                <li><strong className="text-gray-900">Monitor Supplier Prices:</strong> Keep a close eye on invoice prices. Smart Plate Basic automatically highlights price changes when you scan supply receipts.</li>
                <li><strong className="text-gray-900">Optimize Portion Control:</strong> Standardize recipes and train staff to ensure consistent portion sizes, reducing waste and over-serving.</li>
                <li><strong className="text-gray-900">Reduce Food Waste:</strong> Track waste reports to identify which items are being thrown away and adjust your prep levels accordingly.</li>
                <li><strong className="text-gray-900">Use a Food Cost App:</strong> Replace manual spreadsheets with a dedicated food cost management app to automate calculations and get real-time profitability dashboards.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Why Labor Cost Management Matters</h3>
              <p>
                While food cost is critical, labor cost is the second massive expense for any restaurant. The golden rule of hospitality is keeping your combined prime costs (Food Cost + Labor Cost) under 60%. A dedicated labor cost management app helps you forecast weekly schedules, track employee hours, and manage tip pools efficiently.
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[#107c41] py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Ready to optimize your restaurant's costs?</h2>
          <p className="text-green-100 text-lg mb-8">Join the smartest operators managing their food and labor costs in one place.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" onClick={() => setOpenRequest(true)} className="bg-white text-[#107c41] hover:bg-gray-100 text-lg px-8">
              Request Access Now
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
          <p className="mb-4">The premier food cost and labor cost management app for restaurants and bars.</p>
          <p className="mb-8">
            Contact us: <a href="mailto:admin@smartplate.org" className="text-white hover:underline">admin@smartplate.org</a>
          </p>
          <p className="text-sm">&copy; {new Date().getFullYear()} Smart Plate. All rights reserved.</p>
        </div>
      </footer>

      <AccessRequestDialog open={openRequest} onOpenChange={setOpenRequest} />
    </div>);

}