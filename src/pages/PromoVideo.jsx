import React, { useState, useRef } from "react";
import OrderDemoAnimation from "@/components/onboarding/OrderDemoAnimation";
import { Button } from "@/components/ui/button";
import { Video, StopCircle, Download, ShoppingCart, Users, FileSpreadsheet, Image as ImageIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { base44 } from "@/api/base44Client";
import { CloudUpload } from "lucide-react";


export default function PromoVideo({ autoUpload = false, onClose }) {
  const [isZipping, setIsZipping] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);

  useEffect(() => {
    if (autoUpload && !isUploadingToDrive) {
      // Small delay to ensure rendering
      const timer = setTimeout(() => {
        uploadAllImagesToDrive();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [autoUpload]);
  // State for video recording removed

  // Recording logic removed as per user request to replace video with static images

  const downloadImage = async (id, filename) => {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download image:", err);
      alert("Failed to download image. Try using a different browser.");
    }
  };

  const downloadAllImagesAsZip = async () => {
    if (isZipping) return;
    setIsZipping(true);
    const zip = new JSZip();
    const folder = zip.folder("promo-slides");

    try {
      // 1. Generate intro slides
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const el = document.getElementById(slide.id);
        if (el) {
          try {
            const canvas = await html2canvas(el, { 
              scale: 2, // Reduced scale slightly for stability
              useCORS: true, 
              backgroundColor: '#ffffff',
              logging: false
            });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            folder.file(`slide_${i + 1}.png`, blob);
          } catch (e) {
            console.error(`Failed to render slide ${i+1}`, e);
          }
        }
      }

      // 2. Generate WhatsApp flow images
      for (let p = 0; p < 5; p++) {
        const el = document.getElementById(`wa-phase-${p}`);
        if (el) {
          try {
            // Need to handle the scale transform properly for html2canvas
            const canvas = await html2canvas(el, { 
              scale: 2, 
              useCORS: true, 
              backgroundColor: '#ffffff',
              logging: false,
              onclone: (clonedDoc) => {
                // Ensure the cloned element is fully visible and not transformed oddly
                const clonedEl = clonedDoc.getElementById(`wa-phase-${p}`);
                if (clonedEl) {
                  clonedEl.style.transform = 'none';
                }
              }
            });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            folder.file(`slide_${p + 4}.png`, blob);
          } catch (e) {
            console.error(`Failed to render wa-phase-${p}`, e);
          }
        }
      }

      // 3. Generate and download zip
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = "smart_basic_promo_kit.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error("Failed to generate zip:", err);
      alert("Failed to generate ZIP file. Please try downloading images individually.");
    } finally {
      setIsZipping(false);
    }
  };

  const uploadAllImagesToDrive = async () => {
    if (isUploadingToDrive) return;
    setIsUploadingToDrive(true);
    
    try {
      const filesToUpload = [];

      // 1. Generate intro slides
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const el = document.getElementById(slide.id);
        if (el) {
          try {
            const canvas = await html2canvas(el, { 
              scale: 2, 
              useCORS: true, 
              backgroundColor: '#ffffff',
              logging: false
            });
            const dataUrl = canvas.toDataURL('image/png');
            filesToUpload.push({
                name: `slide_${i + 1}.png`,
                data: dataUrl,
                mimeType: 'image/png'
            });
          } catch (e) {
            console.error(`Failed to render slide ${i+1}`, e);
          }
        }
      }

      // 2. Generate WhatsApp flow images
      for (let p = 0; p < 5; p++) {
        const el = document.getElementById(`wa-phase-${p}`);
        if (el) {
          try {
            const canvas = await html2canvas(el, { 
              scale: 2, 
              useCORS: true, 
              backgroundColor: '#ffffff',
              logging: false,
              onclone: (clonedDoc) => {
                const clonedEl = clonedDoc.getElementById(`wa-phase-${p}`);
                if (clonedEl) {
                  clonedEl.style.transform = 'none';
                }
              }
            });
            const dataUrl = canvas.toDataURL('image/png');
            filesToUpload.push({
                name: `slide_${p + 4}.png`,
                data: dataUrl,
                mimeType: 'image/png'
            });
          } catch (e) {
            console.error(`Failed to render wa-phase-${p}`, e);
          }
        }
      }

      // 3. Upload to Drive
      const { data } = await base44.functions.invoke('uploadPromoFolderToDrive', {
          folderName: `Promo Kit - ${new Date().toISOString().split('T')[0]}`,
          files: filesToUpload
      });

      if (data?.success) {
          if (autoUpload && onClose) {
            onClose({ success: true, sharedTo: data.sharedTo });
          } else {
            alert(`Successfully uploaded to Google Drive!${data.sharedTo ? ` Shared folder to: ${data.sharedTo}` : ''}`);
          }
      } else {
          if (autoUpload && onClose) {
             onClose({ success: false, error: data?.error });
          } else {
             alert('Upload failed: ' + (data?.error || 'Unknown error'));
          }
      }
      
    } catch (err) {
      console.error("Failed to upload to Drive:", err);
      if (autoUpload && onClose) {
         onClose({ success: false, error: err.message });
      } else {
         alert("Failed to upload to Google Drive. Please try again.");
      }
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const slides = [
    {
      id: 'slide-1',
      icon: <ShoppingCart className="w-24 h-24 text-blue-500" />,
      title: 'ברוכים הבאים ל-Smart Basic!',
      desc: 'רוצים לבצע הזמנה חדשה מספק? בואו נראה איך עושים את זה בכמה שלבים פשוטים.'
    },
    {
      id: 'slide-2',
      icon: <Users className="w-24 h-24 text-indigo-500" />,
      title: '1. הוספת ספק',
      desc: 'תחילה עליכם להוסיף ספק למערכת. זה הספק שממנו תרצו להזמין.'
    },
    {
      id: 'slide-3',
      icon: <FileSpreadsheet className="w-24 h-24 text-green-500" />,
      title: '2. הוספת פריטים בקלות',
      desc: 'בחרו אם להוסיף את הפריט הראשון ידנית, או לייצר גיליון גוגל (Google Sheet) ולהקליד שם את כל הפריטים, המחירים והיחידות. המערכת תמשוך אותם אוטומטית לכרטיס הספק!'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-8 font-sans pb-32">
      <Card className="p-6 mb-8 w-full max-w-2xl text-center shadow-lg border-none bg-white/80 backdrop-blur sticky top-4 z-50">
        <h1 className="text-2xl font-bold mb-2 text-pink-600 flex items-center justify-center gap-2">
           Instagram Carousel Generator
        </h1>
        <p className="text-gray-600 mb-2 text-sm">
          Download all 8 slides (3 intro slides + 5 WhatsApp flow slides) to create a perfect step-by-step carousel post on Instagram!
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4">
            <Button 
              onClick={uploadAllImagesToDrive} 
              disabled={isUploadingToDrive || isZipping}
              className="bg-green-600 hover:bg-green-700 gap-2 min-w-[220px]"
            >
                {isUploadingToDrive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading to Drive...
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-4 h-4" />
                    Save to Google Drive
                  </>
                )}
            </Button>
            <Button 
              onClick={downloadAllImagesAsZip} 
              disabled={isZipping || isUploadingToDrive}
              variant="outline"
              className="gap-2 min-w-[220px] border-pink-200 text-pink-700 hover:bg-pink-50"
            >
                {isZipping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating ZIP...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download as ZIP
                  </>
                )}
            </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-16 items-center w-full">
        {slides.map((slide, idx) => (
          <div key={slide.id} className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold text-gray-700">Slide {idx + 1} (Image)</h2>
            
            <div 
              id={slide.id}
              className="w-[400px] h-[500px] bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-12 text-center shadow-md relative"
              dir="rtl"
            >
              <div className="mb-8 bg-white p-6 rounded-[2rem] shadow-xl border border-blue-100">
                {slide.icon}
              </div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-6 leading-tight">
                {slide.title}
              </h1>
              <p className="text-gray-700 text-xl leading-relaxed font-medium">
                {slide.desc}
              </p>
            </div>

            <Button 
              onClick={() => downloadImage(slide.id, `slide_${idx + 1}.png`)}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Download Slide {idx + 1} Image
            </Button>
          </div>
        ))}

        <div className="flex flex-col items-center gap-4 mt-8 pt-8 border-t-2 border-gray-200 w-full max-w-6xl">
          <h2 className="text-xl font-bold text-gray-700">Slides 4-8 (WhatsApp Flow)</h2>
          <p className="text-sm text-gray-500 text-center max-w-md mb-4">
            These slides show the WhatsApp ordering process step-by-step, including the pasting menu and the image preview. They are included in the ZIP download.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {[0, 1, 2, 3, 4].map(p => (
              <div key={`wa-phase-${p}`} className="flex flex-col items-center gap-4">
                <div 
                  id={`wa-phase-${p}`}
                  className="w-[200px] h-[250px] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-2 text-center shadow-md relative overflow-hidden"
                >
                  <div className="transform scale-[0.7] origin-center">
                    <OrderDemoAnimation isHe={true} staticPhase={p} />
                  </div>
                </div>
                <Button 
                  onClick={() => downloadImage(`wa-phase-${p}`, `slide_${p + 4}.png`)}
                  variant="outline"
                  className="gap-2 text-xs w-full max-w-[150px]"
                >
                  <Download className="w-3 h-3" />
                  Slide {p + 4}
                </Button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}