Deno.serve(async (req) => {
  const url = new URL(req.url);
  const origin = url.origin;
  const base = (Deno.env.get('PUBLIC_APP_URL') || origin).replace(/\/$/, '');
  const target = `${base}/functions/welcomePublic`;
  return new Response(null, { status: 301, headers: { Location: target } });
});