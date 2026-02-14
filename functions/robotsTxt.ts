Deno.serve(async (req) => {
  try {
    const origin = new URL(req.url).origin;
    const base = (Deno.env.get('PUBLIC_APP_URL') || origin).replace(/\/$/, '');
    const body = `User-agent: *\nAllow: /\n\nSitemap: ${base}/functions/sitemapXml`;
    return new Response(body, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  } catch (e) {
    return new Response('User-agent: *\nAllow: /', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
});