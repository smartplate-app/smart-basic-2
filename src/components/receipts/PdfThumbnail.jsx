import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function PdfThumbnail({ url, size = 48, className = '' }) {
  const [thumb, setThumb] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setThumb(null); setError(null);
    (async () => {
      try {
        const { data } = await base44.functions.invoke('generatePdfThumbnail', { pdf_url: url, size: Math.max(48, Math.min(size * 2, 512)) });
        if (!mounted) return;
        if (data?.data_url) setThumb(data.data_url);
        else setError('no_thumb');
      } catch (e) {
        if (mounted) setError(e?.message || 'error');
      }
    })();
    return () => { mounted = false; };
  }, [url, size]);

  return (
    <div
      className={`relative rounded-md overflow-hidden border bg-white dark:bg-[#0b1530] flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      title={error ? (navigator?.language?.startsWith('he') ? 'תצוגה לא זמינה' : 'Preview unavailable') : (navigator?.language?.startsWith('he') ? 'תצוגת PDF' : 'PDF preview')}
    >
      {thumb ? (
        <img src={thumb} alt="pdf thumb" className="w-full h-full object-cover" />
      ) : error ? (
        <div className="text-[10px] text-gray-400">PDF</div>
      ) : (
        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
      )}
    </div>
  );
}