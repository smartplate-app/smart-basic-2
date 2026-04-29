Deno.serve(async (req) => {
  try {
    const urls = [
      'https://us-ros.tabit.cloud/login',
      'https://us-ros-beta.tabit.cloud/login',
      'https://ros.tabit.cloud/login'
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