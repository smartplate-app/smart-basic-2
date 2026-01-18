import React from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export default function Reel2FirstScreenHE({ logoUrl, primary = "#7c3aed", secondary = "#2563eb" }) {
  return (
    <div dir="rtl">
      <AspectRatio ratio={9 / 16}>
        <div
          className="relative h-full w-full overflow-hidden rounded-xl shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
          }}
        >
          {/* Soft vignette for readability */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Logo */}
          {logoUrl && (
            <img
              src={logoUrl}
              alt="SmartPlate"
              className="absolute top-3 left-3 h-8 w-8 rounded-lg object-contain bg-white/10 p-1 backdrop-blur-sm"
            />
          )}

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-center items-center px-5 text-white">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-extrabold leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                הסידור לא צריך לקבור את הרווח
              </h1>

              <div className="flex flex-col gap-2 items-center text-sm font-semibold">
                <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm shadow-sm">
                  יעד עלות עבודה
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm shadow-sm">
                  מתכנון שבוע → תחזית חודש
                </span>
                <span className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm shadow-sm">
                  נשארים מתחת ליעד
                </span>
              </div>
            </div>

            {/* Footer stripe */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        </div>
      </AspectRatio>
    </div>
  );
}