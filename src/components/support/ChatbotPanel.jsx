import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
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
      const lang = 'he';
      // Choose most relevant KB article first
      const norm = (s) => (s || '').toString().toLowerCase();
      const ql = norm(q);
      const keywords = ql.split(/[^a-zA-Z\u0590-\u05FF0-9]+/).filter(Boolean);
      const candidates = kb.filter(a => a.published !== false && a.language === lang);
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

      const kbContext = kb.slice(0, 10).map(a => `# ${a.title}\n${(a.excerpt || '').slice(0,200)}\n`).join('\n');
      const articleContext = best?.content ? `\n\nTop relevant article (${best.title}):\n${best.content.slice(0, 1500)}` : '';
      const navPages = ['Dashboard','Orders','Supply Receipts','Suppliers','Items','Warehouses','Monthly Count','Labor Cost','Support','User Profile'];
      const prompt = `You are the in-app assistant for Smart Plate BASIC. Answer strictly about how to use this app, not general industry advice, unless explicitly asked.\n` +
        `Provide concise, numbered step-by-step instructions using the exact page names from this list: ${navPages.join(', ')}.\n` +
        `If the action requires navigation, say where to click and what to fill. Keep it short and actionable.\n\n` +
        `Knowledge Base (summaries):\n${kbContext}${articleContext}\n\n` +
        `User question: ${q}\n\n` +
        `Respond in ${lang === 'he' ? 'Hebrew' : 'English'}.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      const content = typeof result === 'string' ? result : (typeof result?.output === 'string' ? result.output : JSON.stringify(result));

      // Prepare link to related section (page)
      const pageMap = { getting_started: 'Dashboard', orders: 'Orders', receipts: 'SupplyReceipts', labor: 'LaborCost', account: 'UserProfile', other: 'Support' };
      const hePageNames = { Dashboard: 'לוח בקרה', Orders: 'הזמנות', SupplyReceipts: 'חשבוניות ספק', Suppliers: 'ספקים', Items: 'מוצרים', Warehouses: 'מחסנים', MonthlyCount: 'ספירה חודשית', LaborCost: 'עלויות כח אדם', Support: 'תמיכה', UserProfile: 'פרופיל משתמש' };
      const targetPageName = best?.related_page || (best?.category ? pageMap[best.category] : null);
      const linkUrl = targetPageName ? createPageUrl(targetPageName) : null;
      const linkLabel = targetPageName ? `פתח ${hePageNames[targetPageName] || targetPageName}` : null;
      const contentWithPath = (content || 'לא נמצאה תשובה כרגע.') + (targetPageName ? `\n\nנתיב: תפריט > ${hePageNames[targetPageName] || targetPageName}` : '');

      setMessages(prev => [...prev, { role: 'assistant', content: contentWithPath, linkUrl, linkLabel }]);

      // Visual preview from KB media
      try {
        setImgLoading(true);
        const kbVideo = best?.media_video_url;
        const kbImage = best?.media_images?.[0];
        if (kbVideo) {
          setMessages(prev => [...prev, { role: 'assistant', content: lang === 'he' ? 'תצוגת וידאו מהמערכת:' : 'In‑app video preview:', videoUrl: kbVideo }]);
        } else if (kbImage) {
          setMessages(prev => [...prev, { role: 'assistant', content: lang === 'he' ? 'תצוגה מהמערכת:' : 'In‑app preview:', imageUrl: kbImage }]);
        }
      } catch (_) { /* ignore */ } finally {
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
                  <video src={m.videoUrl} autoPlay muted loop playsInline controls className="max-h-72 rounded-lg border shadow-sm bg-black" />
                </div>
              )}
              {m.imageUrl && (
                <div className={`mt-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={m.imageUrl} alt="Visual guide" className="max-h-72 rounded-lg border shadow-sm" />
                  </a>
                </div>
              )}
              {m.linkUrl && (
                <div className={`mt-2 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <Link to={m.linkUrl} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-900 text-white hover:bg-gray-800">
                    {m.linkLabel || 'Open related section'}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
        {imgLoading && (
          <div className="text-xs text-gray-500 flex items-center gap-2 mb-2">
            <Loader2 className="h-3 w-3 animate-spin" /> מכין תצוגה ויזואלית...
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