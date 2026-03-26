import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../LanguageProvider";
import { UploadCloud, Loader2, X } from "lucide-react";

export default function MenuImageUploadModal({ isOpen, onClose, onUpload, scanningMenu }) {
  const { language } = useLanguage();
  const isRTL = language === 'he' || language === 'ar';
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imageFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      setFiles(prev => [...prev, ...imageFiles]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      const imageFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      setFiles(prev => [...prev, ...imageFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadClick = () => {
    if (files.length > 0) {
      onUpload(files);
    }
  };

  // Reset files when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setFiles([]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !scanningMenu && onClose()}>
      <DialogContent className={isRTL ? 'text-right' : 'text-left'}>
        <DialogHeader>
          <DialogTitle>{language === 'he' ? 'סריקת תפריט (תמונות בלבד)' : 'Scan Menu (Images Only)'}</DialogTitle>
          <DialogDescription>
            {language === 'he' 
              ? 'גרור ושחרר תמונות של התפריט שלך לכאן, או לחץ לבחירת קבצים.'
              : 'Drag and drop images of your menu here, or click to select files.'}
          </DialogDescription>
        </DialogHeader>

        <div 
          className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragActive ? 'border-[#107c41] bg-green-50' : 'border-gray-300 hover:border-[#107c41]'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleChange}
          />
          <UploadCloud className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {language === 'he' ? 'לחץ או גרור תמונות לכאן' : 'Click or drag images here'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {language === 'he' ? 'תומך ב-PNG, JPG' : 'Supports PNG, JPG'}
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                <span className="text-sm truncate max-w-[200px]" dir="ltr">{file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={(e) => { e.stopPropagation(); removeFile(idx); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={scanningMenu}>
            {language === 'he' ? 'ביטול' : 'Cancel'}
          </Button>
          <Button 
            onClick={handleUploadClick} 
            disabled={files.length === 0 || scanningMenu}
            className="bg-[#107c41] hover:bg-[#0c5e31]"
          >
            {scanningMenu ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {language === 'he' ? 'סרוק תמונות' : 'Scan Images'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}