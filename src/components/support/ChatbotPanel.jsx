import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { Loader2, Send } from 'lucide-react';

export default function ChatbotPanel() {
  const [kb, setKb] = useState([]);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'שלום! איך אפשר לעזור? אפשר לשאול על הזמנות, סריקת חשבוניות, סידור עבודה ועוד.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const articles = await base44.entities.KBArticle.filter ?
          await base44.entities.KBArticle.filter({ published: true }) :
          await base44.entities.KBArticle.list();
        setKb((articles || []).filter(a => a.published !== false));
      } catch (_) {}
    })();
  }, []);

  const ask = async () => {
    const q = input.trim();
    if (!q) return;
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);
    try {
      const kbContext = kb.slice(0, 10).map(a => `# ${a.title}\n${(a.excerpt || '').slice(0,200)}\n`).join('\n');
      const prompt = `You are a helpful support assistant for Smart Plate BASIC. Answer in the user's language (Hebrew or English) concisely. Use the following knowledge if relevant. If unsure, say you'll escalate to human support.\n\nKnowledge Base:\n${kbContext}\n\nUser question: ${q}`;
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      const content = typeof result === 'string' ? result : (typeof result?.output === 'string' ? result.output : JSON.stringify(result));
      setMessages(prev => [...prev, { role: 'assistant', content: content || 'לא נמצאה תשובה כרגע, נסו לנסח אחרת.' }]);

      // Instead of generic mockups, try to fetch a relevant app screenshot from KB media
      try {
        setImgLoading(true);
        const lang = (navigator.language || 'he').startsWith('he') ? 'he' : 'en';
        const norm = (s) => (s || '').toString().toLowerCase();
        const ql = norm(q);
        const keywords = ql.split(/[^a-zA-Z\u0590-\u05FF0-9]+/).filter(Boolean);
        const candidates = kb.filter(a => a.language === lang);
        const scored = candidates.map(a => {
          const t = norm(a.title);
          const ex = norm(a.excerpt);
          const cat = norm(a.category);
          const tags = (a.tags || []).map(norm).join(' ');
          let score = 0;
          keywords.forEach(k => {
            if (!k) return;
            if (t.includes(k)) score += 5;
            if (tags.includes(k)) score += 4;
            if (cat.includes(k)) score += 2;
            if (ex.includes(k)) score += 1;
          });
          return { a, score };
        }).sort((x, y) => y.score - x.score);
        const best = (scored[0]?.score > 0) ? scored[0].a : null;
        const kbVideo = best?.media_video_url;
        const kbImage = best?.media_images?.[0];
        if (kbVideo) {
          setMessages(prev => [...prev, { role: 'assistant', content: lang === 'he' ? 'תצוגת וידאו מהמערכת:' : 'In‑app video preview:', videoUrl: kbVideo }]);
        } else if (kbImage) {
          setMessages(prev => [...prev, { role: 'assistant', content: lang === 'he' ? 'תצוגה מהמערכת:' : 'In-app preview:', imageUrl: kbImage }]);
        }
      } catch (_) {
        // ignore preview errors
      } finally {
        setImgLoading(false);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'מצטער, הייתה שגיאה בעיבוד הבקשה. נסו שוב או פנו לתמיכה.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>צ'אטבוט תמיכה</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 overflow-y-auto border rounded-md p-3 bg-white mb-3 space-y-2">
          {messages.map((m, idx) => (
            <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
              <div className={`inline-block px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
                {m.content}
              </div>
              {m.videoUrl && (
                <div className={`mt-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <video src={m.videoUrl} controls className="max-h-72 rounded-lg border shadow-sm bg-black" />
                </div>
              )}
              {m.imageUrl && (
                <div className={`mt-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={m.imageUrl} alt="Visual guide" className="max-h-72 rounded-lg border shadow-sm" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
        {imgLoading && (
          <div className="text-xs text-gray-500 flex items-center gap-2 mb-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Generating visual preview...
          </div>
        )}
        <div className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="שאלו שאלה..." onKeyDown={e => e.key === 'Enter' && ask()} />
          <Button onClick={ask} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            שלח
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}