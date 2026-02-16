import React from "react";

export default function PhonePreview({ url, width, height, incognito = false }) {
  // Device frame size (defaults to iPhone 14 if not provided)
  const frameW = typeof width === 'number' ? width : 390; // px
  const frameH = typeof height === 'number' ? height : 844; // px
  return (
    <div className="w-full flex justify-center">
      <div
        className="relative bg-black rounded-[36px] shadow-2xl"
        style={{ width: frameW + 24, height: frameH + 24, padding: 12 }}
      >
        {/* Top speaker/camera pill */}
        <div className="absolute left-1/2 -translate-x-1/2 top-2 bg-black/70 rounded-full" style={{ width: 120, height: 6 }} />
        {/* Buttons (decorative) */}
        <div className="absolute -left-1 top-24 h-24 w-1.5 bg-black/60 rounded-r" />
        <div className="absolute -right-1 top-32 h-16 w-1.5 bg-black/60 rounded-l" />
        <div className="absolute -right-1 top-56 h-20 w-1.5 bg-black/60 rounded-l" />

        <div className="bg-white rounded-[28px] overflow-hidden w-full h-full">
          <iframe
            key={`${incognito ? 'incog' : 'norm'}:${url}`}
            title="Phone Preview"
            src={url}
            className="w-full h-full"
            style={{ border: 0 }}
            sandbox={incognito ? "allow-scripts allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox" : undefined}
            allow="clipboard-read; clipboard-write; autoplay; fullscreen"
            referrerPolicy={incognito ? "no-referrer" : "strict-origin-when-cross-origin"}
          />
        </div>
      </div>
    </div>
  );
}