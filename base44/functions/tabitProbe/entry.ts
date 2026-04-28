Deno.serve(async (req) => {
  const urls = [
    "https://reporting-server.tabit.cloud/login",
    "https://reporting-server.tabit.cloud/api/login",
    "https://office.tabit.cloud/api/login"
  ];
  const results = {};
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({email: "test", password: "test"}) });
      results[url] = res.status;
    } catch(e) {
      results[url] = e.message;
    }
  }
  return new Response(JSON.stringify(results));
});