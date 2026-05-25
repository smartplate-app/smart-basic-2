import React from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ChefHat, ArrowRight, Utensils, BarChart3, Users } from "lucide-react";

export default function SignIn() {
  const handleLogin = async () => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || params.get("nextUrl") || createPageUrl("Orders");
    await base44.auth.redirectToLogin(next);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-orange-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-300/30 rounded-full blur-3xl" />
      
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-10 text-center border border-white/50 z-10">
        <div className="mx-auto w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <ChefHat className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">Smart Plate</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          The complete food cost and restaurant management system. Track inventory, analyze profitability, and manage your team in one place.
        </p>
        
        <div className="space-y-4 mb-8 text-left">
          <div className="flex items-center gap-3 text-slate-600 bg-white/60 p-3 rounded-lg border border-slate-100">
            <Utensils className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium">Recipe Costing & Menu Engineering</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 bg-white/60 p-3 rounded-lg border border-slate-100">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium">Real-time Dashboard & Analytics</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 bg-white/60 p-3 rounded-lg border border-slate-100">
            <Users className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-medium">Labor Cost & Schedule Management</span>
          </div>
        </div>

        <Button 
          onClick={handleLogin} 
          className="w-full bg-orange-500 hover:bg-orange-600 text-white h-12 text-lg rounded-xl shadow-md transition-all group"
        >
          Sign In to Continue <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </div>
  );
}