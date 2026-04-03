Deno.serve(async (req) => {
    return new Response("This is a completely public text page that works without login. If you see this, the public backend endpoint is working.", {
        status: 200,
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
        }
    });
});