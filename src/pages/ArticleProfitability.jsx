import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import MarketingArticleProfitability from '@/components/marketing/MarketingArticleProfitability';

export default function ArticleProfitability() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white flex flex-col relative font-sans" dir="rtl">
      {/* Background decorations */}
      <div className="fixed top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#52b788]/20 blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="relative z-20 flex justify-between items-center p-6 lg:px-12 border-b border-white/10 bg-black/10 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0c6fcae55_smartplate_logo_insta_320x320px.png" alt="Smart Plate Logo" className="w-10 h-10 object-contain rounded-xl" />
          <span className="text-xl font-bold">Smart Plate</span>
        </Link>
        <Link to="/" className="flex items-center gap-2 text-green-100 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-xl">
          <ChevronRight className="w-5 h-5" />
          חזרה לעמוד הראשי
        </Link>
      </div>

      {/* Article Content */}
      <div className="relative z-10 flex-1 flex justify-center w-full px-4 sm:px-6 md:px-8 py-8">
        <MarketingArticleProfitability lang="he" isTeaser={false} />
      </div>

      {/* Footer */}
      <div className="relative z-10 text-sm text-green-200 py-6 text-center bg-black/20 backdrop-blur-md">
        © {new Date().getFullYear()} כל הזכויות שמורות ל-Smart Plate
      </div>
    </div>
  );
}