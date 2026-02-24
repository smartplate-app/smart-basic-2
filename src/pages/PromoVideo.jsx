import React, { useState, useRef } from "react";
import OrderDemoAnimation from "@/components/onboarding/OrderDemoAnimation";
import { Button } from "@/components/ui/button";
import { Video, StopCircle, Download, ShoppingCart, Users, FileSpreadsheet, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import html2canvas from "html2canvas";

export default function PromoVideo() {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
            displaySurface: 'browser',
            frameRate: 60
        },
        audio: false,
        preferCurrentTab: true 
      });
      
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        chunks.current = [];
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'slide_4_video.webm';
        a.click();
        URL.revokeObjectURL(url);
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
      };

      recorder.start();
      setRecording(true);
      setMediaRecorder(recorder);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Could not start recording. Please ensure you are on a desktop browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  const downloadImage = async (id, filename) => {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
    } catch (err) {
      console.error("Failed to download image:", err);
      alert("Failed to download image");
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
      desc: 'בחרו אם להוסיף את הפריט הראשון ידנית, או לייצר גיליון גוגל (Google Sheet) ולהקליד שם את כל הפריטים. המערכת תמשוך אותם אוטומטית לכרטיס הספק!'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-8 font-sans pb-32">
      <Card className="p-6 mb-8 w-full max-w-2xl text-center shadow-lg border-none bg-white/80 backdrop-blur sticky top-4 z-50">
        <h1 className="text-2xl font-bold mb-2 text-pink-600 flex items-center justify-center gap-2">
           Instagram Carousel Generator
        </h1>
        <p className="text-gray-600 mb-2 text-sm">
          Download the 3 image slides below, and record the 4th video slide to create a perfect step-by-step carousel post on Instagram!
        </p>
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

        <div className="flex flex-col items-center gap-4 mt-8 pt-8 border-t-2 border-gray-200 w-full max-w-4xl">
          <h2 className="text-xl font-bold text-gray-700">Slide 4 (Video Animation)</h2>
          <p className="text-sm text-gray-500 text-center max-w-md">
            1. Click "Record" <br/>
            2. Select <strong>"This Tab"</strong> in the browser popup <br/>
            3. Let the animation play for one loop <br/>
            4. Click "Stop & Download"
          </p>

          <div className="flex justify-center gap-4">
            {!recording ? (
              <Button 
                  onClick={startRecording} 
                  className="gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 transition-opacity border-0 shadow-md"
              >
                <Video className="w-4 h-4" />
                Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} variant="destructive" className="gap-2 animate-pulse shadow-md">
                <StopCircle className="w-4 h-4" />
                Stop & Download
              </Button>
            )}
          </div>

          <div className="w-[400px] h-[500px] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8 text-center shadow-md relative overflow-hidden mt-4">
            <div className="transform scale-[1.2] origin-center translate-y-12">
              <OrderDemoAnimation isHe={true} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}