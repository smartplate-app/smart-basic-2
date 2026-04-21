import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { CheckCircle2, Download, Instagram } from "lucide-react";

export default function InstagramStoryGreek() {
  const storyRef = useRef(null);

  const handleDownload = async () => {
    if (!storyRef.current) return;
    try {
      const canvas = await html2canvas(storyRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#111827", // match bg-gray-900
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "smart-plate-greek-story.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating story image:", err);
      alert("Σφάλμα κατά τη δημιουργία της εικόνας.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
      <div className="max-w-md w-full mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Instagram className="w-6 h-6 text-pink-600" />
            Greek Instagram Story
          </h1>
          <p className="text-gray-500">Download this image for your Instagram stories.</p>
        </div>
        <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Download className="w-4 h-4 mr-2" /> Download
        </Button>
      </div>

      {/* Instagram Story Aspect Ratio (9:16) -> 1080x1920 scaled down */}
      <div 
        ref={storyRef}
        className="relative bg-gray-900 overflow-hidden shadow-2xl"
        style={{ width: "405px", height: "720px" }} // 9:16 aspect ratio
        dir="ltr"
      >
        {/* Background Gradients */}
        <div className="absolute top-0 -left-1/4 w-[150%] h-1/2 bg-gradient-to-b from-[#107c41]/40 to-transparent blur-3xl rounded-full" />
        <div className="absolute bottom-0 -right-1/4 w-[150%] h-1/2 bg-gradient-to-t from-blue-600/30 to-transparent blur-3xl rounded-full" />

        <div className="absolute inset-0 flex flex-col items-center justify-between px-8 py-16 z-10 text-center">
          
          {/* Logo / Top */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center shadow-xl p-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg"
                alt="Smart Plate Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-white text-2xl font-black tracking-wider uppercase">Smart Plate Basic</h2>
          </div>

          {/* Main Content */}
          <div className="flex flex-col items-center gap-6 w-full">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 w-full shadow-2xl">
              <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
                Ελέγξτε το <br/><span className="text-green-400">Κόστος</span> σας!
              </h1>
              <p className="text-gray-200 text-lg leading-snug">
                Η απόλυτη εφαρμογή διαχείρισης κόστους τροφίμων & εργασίας για εστιατόρια.
              </p>
            </div>

            <div className="w-full space-y-4 text-left px-2">
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                <span className="text-white font-medium text-lg">Σάρωση Τιμολογίων</span>
              </div>
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                <span className="text-white font-medium text-lg">Παραγγελίες μέσω WhatsApp</span>
              </div>
              <div className="flex items-center gap-3 bg-black/40 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
                <span className="text-white font-medium text-lg">Διαχείριση Προσωπικού</span>
              </div>
            </div>
          </div>

          {/* Bottom Call to Action */}
          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="bg-gradient-to-r from-green-400 to-[#107c41] text-white text-xl font-bold py-4 px-10 rounded-full shadow-lg animate-pulse w-full max-w-[300px]">
              Εγγραφείτε Τώρα
            </div>
            <p className="text-gray-400 font-medium tracking-wide uppercase text-sm flex items-center gap-2">
              Link in Bio 🔗
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}