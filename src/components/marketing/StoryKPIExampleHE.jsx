import React from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export default function StoryKPIExampleHE({
  kpiLabel = "עלות מזון",
  value = 28.4,
  unit = "%",
  footnote = "מטרה: ≤ 30%",
  logoUrl,
  primary = "#7c3aed",
  secondary = "#2563eb"
}) {
  return (
    <div className="rounded-2xl overflow-hidden border shadow-sm" dir="rtl">
      <AspectRatio ratio={9/16}>
        <div
          className="w-full h-full relative text-white"
          style={{
            background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
          }}
        >
          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-black/10" />

          {/* KPI Value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="text-[56px] leading-none md:text-[72px] font-extrabold drop-shadow-sm">
              {Number(value).toFixed(1)}
              <span className="text-2xl align-super ml-1">{unit}</span>
            </div>
            <div className="mt-2 text-lg md:text-xl font-semibold opacity-95">
              {kpiLabel}
            </div>
          </div>

          {/* Footnote */}
          {footnote && (
            <div className="absolute bottom-3 right-3 text-[11px] bg-white/10 px-2 py-1 rounded-full backdrop-blur-sm">
              {footnote}
            </div>
          )}

          {/* Small logo */}
          {logoUrl && (
            <img
              src={logoUrl}
              alt="logo"
              className="absolute bottom-3 left-3 h-8 w-8 object-contain rounded-md bg-white/20 p-1"
            />
          )}
        </div>
      </AspectRatio>
    </div>
  );
}