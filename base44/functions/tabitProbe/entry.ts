Deno.serve(async (req) => {
  const urls = [
    "https://il-office.tabit.cloud/api/login",
    "https://il-office.tabit.cloud/login",
    "https://office.tabit.cloud/login",
    "https://bof-rp-beta.tabit.cloud/api/login",
    "https://bof-rp-beta.tabit.cloud/login"
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