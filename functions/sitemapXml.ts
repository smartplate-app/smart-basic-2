Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const origin = url.origin;
    const base = (Deno.env.get('PUBLIC_APP_URL') || origin).replace(/\/$/, '');
    const lastmod = new Date().toISOString();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${base}/functions/welcomePublic?lang=he</loc>
    <lastmod>${lastmod}</lastmod>
    <xhtml:link rel="alternate" hreflang="he-IL" href="${base}/functions/welcomePublic?lang=he" />
    <xhtml:link rel="alternate" hreflang="en-US" href="${base}/functions/welcomePublic?lang=en" />
  </url>
  <url>
    <loc>${base}/functions/welcomePublic?lang=en</loc>
    <lastmod>${lastmod}</lastmod>
    <xhtml:link rel="alternate" hreflang="he-IL" href="${base}/functions/welcomePublic?lang=he" />
    <xhtml:link rel="alternate" hreflang="en-US" href="${base}/functions/welcomePublic?lang=en" />
  </url>
</urlset>`;
    return new Response(xml, { status: 200, headers: { 'content-type': 'application/xml; charset=utf-8' } });
  } catch (e) {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', { status: 200, headers: { 'content-type': 'application/xml; charset=utf-8' } });
  }
});