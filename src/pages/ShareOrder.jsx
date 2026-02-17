import React, { useEffect, useState } from "react";
import html2canvas from "html2canvas";

export default function ShareOrder() {
  const [status, setStatus] = useState("Preparing share...");

  useEffect(() => {
    (async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const d = urlParams.get("d");
        const text = urlParams.get("text") || "";
        const phone = urlParams.get("phone") || "";
        if (!d) {
          setStatus("Missing order data");
          return;
        }
        let parsed;
        try { parsed = JSON.parse(decodeURIComponent(d)); } catch { parsed = null; }
        if (!parsed) { setStatus("Invalid order data"); return; }

        // Build a lightweight visual and capture to image
        const temp = document.createElement('div');
        temp.style.position='fixed'; temp.style.left='-9999px'; temp.style.top='0';
        temp.style.width='1024px'; temp.style.background='#fff'; temp.style.padding='24px';
        temp.style.fontFamily='system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        const items = (parsed.i||[]).slice(0,12).map((it,i)=>`<tr><td style="padding:6px;border-bottom:1px solid #e5e7eb">${i+1}</td><td style="padding:6px;border-bottom:1px solid #e5e7eb">${it.n||''}</td><td style="padding:6px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#059669">${it.q||''}</td><td style="padding:6px;border-bottom:1px solid #e5e7eb">${it.u||''}</td></tr>`).join('');
        temp.innerHTML = `<div style="font-weight:800;margin-bottom:8px">Order #${parsed.n||''}</div><div>Supplier: ${parsed.s||''}</div><div style="margin-top:8px;border:1px solid #e5e7eb;border-radius:10px;padding:10px"><table style="width:100%;border-collapse:collapse;font-size:13px"><tbody>${items}</tbody></table></div>`;
        document.body.appendChild(temp);
        const canvas = await html2canvas(temp,{scale:2,backgroundColor:'#ffffff',logging:false,useCORS:true});
        const blob = await new Promise(res=>canvas.toBlob(res,'image/png',0.95));
        document.body.removeChild(temp);
        if (!blob) { throw new Error('Failed to render image'); }
        const file = new File([blob], `order-${parsed.n||Date.now()}.png`, { type: 'image/png' });

        // Prefer native share with file (matches published app behavior)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], text });
            window.close();
            return;
          } catch (e) {
            // fall through to deep link
          }
        }

        // Fallback: open WhatsApp with text (image cannot be attached via URL scheme)
        const waWebApi = phone
          ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        const deepLink = phone
          ? `whatsapp://send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}`
          : `whatsapp://send?text=${encodeURIComponent(text)}`;
        try { window.location.href = deepLink; } catch {}
        setTimeout(() => { window.location.replace(waWebApi); }, 700);
        setStatus("Opening WhatsApp...");
        setTimeout(() => { try { window.close(); } catch {} }, 2500);
      } catch (e) {
        console.error("ShareOrder error:", e);
        setStatus("Could not share. You can close this tab.");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-gray-800 p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-lg font-medium">{status}</p>
      </div>
    </div>
  );
}