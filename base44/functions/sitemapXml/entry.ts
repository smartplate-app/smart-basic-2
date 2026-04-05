Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const base = (Deno.env.get('PUBLIC_APP_URL') || origin).replace(/\/$/, '');
    const lastmod = new Date().toISOString();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${base}/</loc>
    <lastmod>${lastmod.split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${base}/welcome</loc>
    <lastmod>${lastmod.split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
    return new Response(xml, { status: 200, headers: { 'content-type': 'application/xml; charset=utf-8' } });
  } catch (e) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', { status: 200, headers: { 'content-type': 'application/xml; charset=utf-8' } });
  }
});