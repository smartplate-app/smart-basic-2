import React from "react";

export default function SimpleLogo({
  logoUrl,
  primary = "#059669", // emerald-600
  secondary = "#0ea5a4", // teal-500
  background = "#ffffff"
}) {
  return (
    <div
      className="inline-flex items-center gap-3 rounded-xl border shadow-sm px-4 py-3"
      style={{ background }}
    >
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Smart Plate"
          className="h-10 w-10 rounded-lg object-contain bg-black/5 p-1"
        />
      )}
      <span
        className="text-2xl md:text-3xl font-extrabold tracking-wide uppercase"
        style={{
          background: `linear-gradient(90deg, ${primary}, ${secondary})`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent"
        }}
      >
        SIMPLE
      </span>
    </div>
  );
}