import React from "react";
import MarketingArticle from "@/components/marketing/MarketingArticle";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function ArticleFoodCost() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white flex flex-col relative overflow-hidden font-sans" dir="rtl">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[#52b788]/30 blur-3xl pointer-events-none"></div>
      
      {/* Header */}
      <div className="relative z-20 flex justify-between items-center p-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-lg">
            <img src="https://media.base44.com/images/public/699c4d19592434b7f867b2c6/0c6fcae55_smartplate_logo_insta_320x320px.png" alt="Smart Plate Logo" className="w-10 h-10 object-contain rounded-lg" />
          </div>
          <span className="text-xl md:text-2xl font-extrabold tracking-tight text-white drop-shadow-md">Smart Plate</span>
        </div>
        <Link to="/" className="text-white hover:text-green-200 flex items-center gap-1 font-medium transition-colors">
          חזרה לדף הבית
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center p-6 lg:p-12 w-full">
        <MarketingArticle lang="he" isTeaser={false} />
      </div>
      
      <div className="relative z-10 text-sm text-green-200 py-6 text-center">
        © {new Date().getFullYear()} כל הזכויות שמורות ל-Smart Plate
      </div>
    </div>
  );
}