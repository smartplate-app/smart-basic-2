import React from "react";

export default function PhonePreview({ url, width, height, incognito = false }) {
  // Device frame size (defaults to iPhone 14 if not provided)
  const frameW = typeof width === 'number' ? width : 390; // px
  const frameH = typeof height === 'number' ? height : 844; // px
  const [loading, setLoading] = React.useState(Boolean(url));
  const [error, setError] = React.useState("");
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

        <div className="bg-white rounded-[28px] overflow-hidden w-full h-full relative">
          <iframe
            key={`${incognito ? 'incog' : 'norm'}:${url}`}
            title="Phone Preview"
            src={url}
            className="w-full h-full"
            style={{ border: 0 }}
            sandbox={incognito ? "allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" : undefined}
            allow="clipboard-read; clipboard-write; autoplay; fullscreen"
            referrerPolicy={incognito ? "strict-origin-when-cross-origin" : "strict-origin-when-cross-origin"}
            credentialless={incognito ? "true" : undefined}
            onLoad={() => { setLoading(false); setError(""); }}
            onError={() => { setLoading(false); setError('Failed to load preview'); }}
          />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90">
              <div className="text-center text-sm text-gray-700">
                <div className="font-semibold mb-1">Couldn’t load preview</div>
                <div className="text-xs">Try tapping Incognito Login again.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}