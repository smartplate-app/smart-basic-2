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
      const { data } = await base44.integrations.Core.InvokeLLM({ prompt });
      setMessages(prev => [...prev, { role: 'assistant', content: typeof data === 'string' ? data : JSON.stringify(data) }]);
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
            </div>
          ))}
        </div>
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