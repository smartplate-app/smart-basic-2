import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function KBMedia() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-gray-600">
            Attach short screen recordings (MP4/WebM/GIF) to show as autoplay muted loop in the chatbot preview.
          </CardTitle>
        </CardHeader>
        <CardContent>
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