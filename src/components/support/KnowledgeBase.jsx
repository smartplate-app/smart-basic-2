import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await (base44.entities.KBArticle.filter ? base44.entities.KBArticle.filter({ published: true }) : base44.entities.KBArticle.list());
        setArticles((res || []).filter(a => a.published !== false));
      } catch (_) {}
    })();
  }, []);

  const categories = useMemo(() => {
    const set = new Set(articles.map(a => a.category || 'other'));
    return ['all', ...Array.from(set)];
  }, [articles]);

  const filtered = articles.filter(a => {
    const byCat = category === 'all' || (a.category || 'other') === category;
    const t = term.toLowerCase();
    const byTerm = !t || a.title.toLowerCase().includes(t) || (a.excerpt || '').toLowerCase().includes(t) || (a.content || '').toLowerCase().includes(t);
    return byCat && byTerm;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>מאגר מידע</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex gap-2 items-center">
            {categories.map(c => (
              <button key={c} onClick={() => setCategory(c)} className={`px-3 py-1 rounded-full border ${category===c? 'bg-gray-900 text-white' : 'bg-white'}`}>
                {c === 'all' ? 'הכול' : c}
              </button>
            ))}
          </div>
          <div className="ml-auto w-full md:w-72">
            <Input placeholder="חיפוש במאגר" value={term} onChange={e => setTerm(e.target.value)} />
          </div>
        </div>
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-8">אין מאמרים עדיין</div>
          )}
          {filtered.map(a => (
            <div key={a.id} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-lg">{a.title}</div>
                <Badge variant="outline">{a.category || 'other'}</Badge>
              </div>
              {a.excerpt && <p className="text-sm text-gray-600 mt-1">{a.excerpt}</p>}
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-gray-700">קרא עוד</summary>
                <div className="prose prose-sm max-w-none mt-2 whitespace-pre-wrap">
                  {a.content}
                </div>
              </details>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}