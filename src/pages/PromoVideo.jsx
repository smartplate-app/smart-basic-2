import React, { useState, useRef } from "react";
import OrderDemoAnimation from "@/components/onboarding/OrderDemoAnimation";
import { Button } from "@/components/ui/button";
import { Video, StopCircle, Download } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PromoVideo() {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const chunks = useRef([]);

  const startRecording = async () => {
    try {
      // Prompt user to select display surface - recommend "This Tab"
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
            displaySurface: 'browser',
            frameRate: 60
        },
        audio: false,
        preferCurrentTab: true // Experimental hint
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
        a.download = 'smart-basic-promo.webm';
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
      alert("Could not start recording. Please ensure you are on a desktop browser or use your system's screen recorder.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 font-sans">
      <Card className="p-6 mb-8 w-full max-w-xl text-center shadow-lg border-none bg-white/80 backdrop-blur">
        <h1 className="text-2xl font-bold mb-2">Instagram Promo Generator</h1>
        <p className="text-gray-500 mb-6 text-sm">
          1. Click "Record" below <br/>
          2. Select <strong>"This Tab"</strong> in the browser popup <br/>
          3. Let the animation play for a full loop <br/>
          4. Click "Stop" to download the video
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
      </Card>

      {/* Animation Container - Scaled up for high quality */}
      <div className="relative p-10 bg-white rounded-3xl shadow-2xl border border-gray-100 flex items-center justify-center">
          <div className="transform scale-[2.0] origin-center">
            <OrderDemoAnimation isHe={true} />
          </div>
      </div>
      
      <p className="mt-8 text-xs text-gray-400">
        Tip: Convert the downloaded .webm file to .mp4 for Instagram if needed.
      </p>
    </div>
  );
}