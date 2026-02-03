import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function KBMedia() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [edits, setEdits] = useState({});
  const [newArt, setNewArt] = useState({ title: "", language: "he", category: "orders", tags: "" });

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const list = await base44.entities.KBArticle.filter({});
        // Prefer Hebrew first if browser is he
        const isHe = (navigator.language || "he").startsWith("he");
        const sorted = [...list].sort((a, b) => {
          if (isHe && a.language !== b.language) return a.language === "he" ? -1 : 1;
          return (a.title || "").localeCompare(b.title || "");
        });
        setArticles(sorted);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = articles.filter(a => {
    const q = search.toLowerCase();
    if (!q) return true;
    const hay = [a.title, a.excerpt, a.category, ...(a.tags || [])].join(" ").toLowerCase();
    return hay.includes(q);
  });

  const handleUploadVideo = async (article, file) => {
    if (!file) return;
    setSavingId(article.id);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.KBArticle.update(article.id, { media_video_url: file_url });
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, media_video_url: file_url } : a));
      alert("Video attached successfully");
    } finally {
      setSavingId(null);
    }
  };

  const handleUploadImage = async (article, file) => {
    if (!file) return;
    setSavingId(article.id);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const imgs = Array.isArray(article.media_images) ? [...article.media_images, file_url] : [file_url];
      await base44.entities.KBArticle.update(article.id, { media_images: imgs });
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, media_images: imgs } : a));
      alert("Image added successfully");
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveMeta = async (article) => {
    const e = edits[article.id] || {};
    const category = e.category ?? article.category ?? 'other';
    const tagsStr = e.tags ?? (Array.isArray(article.tags) ? article.tags.join(',') : '');
    const tags = tagsStr.split(',').map(s=>s.trim()).filter(Boolean);
    setSavingId(article.id);
    try {
      await base44.entities.KBArticle.update(article.id, { category, tags });
      setArticles(prev => prev.map(x => x.id === article.id ? { ...x, category, tags } : x));
    } finally {
      setSavingId(null);
    }
  };

  const createArticle = async () => {
    if (!newArt.title.trim()) { alert('Title is required'); return; }
    setSavingId('new');
    try {
      const payload = {
        title: newArt.title.trim(),
        content: '',
        excerpt: '',
        category: newArt.category || 'other',
        language: newArt.language || 'he',
        published: true,
        tags: (newArt.tags || '').split(',').map(s=>s.trim()).filter(Boolean)
      };
      const rec = await base44.entities.KBArticle.create(payload);
      setArticles(prev => [rec, ...prev]);
      setNewArt({ title: '', language: 'he', category: 'orders', tags: '' });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6"><div className="animate-pulse h-6 w-40 bg-gray-200 rounded mb-4"></div><div className="animate-pulse h-40 bg-gray-100 rounded"></div></div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>403 - Admin only</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This page is only available to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">KB Media Manager</h1>
        <div className="w-full sm:w-72">
          <Input placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>New KB Article</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="text-xs text-gray-500 mb-1">Title</div>
              <Input placeholder="e.g., Orders flow" value={newArt.title} onChange={e=>setNewArt({...newArt, title: e.target.value})} />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Category</div>
              <Select value={newArt.category} onValueChange={(v)=>setNewArt({...newArt, category: v})}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="getting_started">Getting started</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="receipts">Receipts</SelectItem>
                  <SelectItem value="labor">Labor</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Language</div>
              <Select value={newArt.language} onValueChange={(v)=>setNewArt({...newArt, language: v})}>
                <SelectTrigger><SelectValue placeholder="Language" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="he">Hebrew</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <div className="text-xs text-gray-500 mb-1">Tags (comma separated)</div>
              <Input placeholder="orders, ספקים, הזמנה" value={newArt.tags} onChange={e=>setNewArt({...newArt, tags: e.target.value})} />
            </div>
            <div className="flex items-end">
              <Button disabled={savingId==='new'} onClick={createArticle} className="w-full">{savingId==='new'?'Creating...':'Create article'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-gray-600">
            Attach short screen recordings (MP4/WebM/GIF) to show as autoplay muted loop in the chatbot preview.
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 && (
            <div className="text-sm text-gray-500 mb-2">No articles yet — create one above, then upload a short screen recording.</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(a => (
              <div key={a.id} className="border rounded-lg p-4 bg-white space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{a.title || '(untitled)'}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <Badge variant="outline">{a.category || 'other'}</Badge>
                      <Badge variant="secondary">{a.language || 'he'}</Badge>
                    </div>
                  </div>
                  {savingId === a.id ? (
                    <div className="text-xs text-gray-500">Saving...</div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Video preview</div>
                  {a.media_video_url ? (
                    <video src={a.media_video_url} className="w-full max-h-56 rounded border bg-black" autoPlay muted loop playsInline controls />
                  ) : (
                    <div className="text-xs text-gray-500">No video yet</div>
                  )}
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Input type="file" accept="video/*,image/gif" onChange={e => handleUploadVideo(a, e.target.files?.[0])} />
                    <Button type="button" variant="outline" onClick={() => document.activeElement && document.activeElement.blur()}>
                      Upload video
                    </Button>
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Images</div>
                  <div className="flex gap-2 flex-wrap">
                    {(a.media_images || []).map((img, idx) => (
                      <img key={idx} src={img} alt="KB" className="h-16 w-28 object-cover rounded border" />
                    ))}
                    {(!a.media_images || a.media_images.length === 0) && (
                      <div className="text-xs text-gray-500">No images yet</div>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Input type="file" accept="image/*" onChange={e => handleUploadImage(a, e.target.files?.[0])} />
                    <Button type="button" variant="outline" onClick={() => document.activeElement && document.activeElement.blur()}>
                      Upload image
                    </Button>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}