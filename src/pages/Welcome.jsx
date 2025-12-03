import React from "react";

export default function WelcomePage() {
  React.useEffect(() => {
    window.location.href = '/login';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" 
          alt="Smart Plate"
          className="h-20 mx-auto mb-4 animate-pulse"
        />
        <p className="text-gray-600">מעביר לדף התחברות...</p>
      </div>
    </div>
  );
}