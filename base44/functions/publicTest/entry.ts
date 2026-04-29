Deno.serve(async (req) => {
  try {
    const urls = [
      'https://reporting-server.tabit.cloud/login',
      'https://reporting-server.tabit.cloud/api/login',
      'https://reporting-server.tabit.cloud/auth/login',
      'https://reporting-server.tabit.cloud/api/v1/auth/login',
      'https://ros-rp.tabit.cloud/api/login',
      'https://ros-rp.tabit.cloud/auth/login',
      'https://analytics.tabit.cloud/chef/handler.ashx'
    ];
    
    const results = {};
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@test.com', password: 'test' })
        });
        results[url] = { status: res.status, text: await res.text().catch(() => 'no text') };
      } catch (e) {
        results[url] = { error: e.message };
      }
    }
    
    return Response.json(results);
  } catch (e) {
    return Response.json({ error: e.message });
  }
});