import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const email = body.email;
    const password = body.password;

    if (!email || !password) {
      return Response.json({ error: 'email and password required' }, { status: 400 });
    }

    const endpoints = [
      'https://ros-rp.tabit.cloud',
      'https://us-ros.tabit.cloud',
      'https://ros-rp-beta.tabit.cloud',
      'https://us-ros-beta.tabit.cloud',
      'https://ros.tabit.cloud',
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`${endpoint}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const statusCode = res.status;
        let responseBody;
        const rawText = await res.text();

        try {
          responseBody = JSON.parse(rawText);
        } catch {
          responseBody = rawText;
        }

        const token = responseBody?.il?.access_token || responseBody?.us?.access_token || responseBody?.access_token || null;
        const orgs = responseBody?.il?.organizations || responseBody?.us?.organizations || responseBody?.organizations || [];

        results[endpoint] = {
          status: statusCode,
          success: res.ok,
          token_found: !!token,
          token_preview: token ? token.substring(0, 40) + '...' : null,
          organizations: orgs.map(o => ({ id: o._id || o.id, name: o.name })),
          response_keys: typeof responseBody === 'object' ? Object.keys(responseBody) : responseBody,
        };
      } catch (e) {
        results[endpoint] = { error: e.message };
      }
    }

    const successEndpoint = Object.entries(results).find(([, v]) => v.success);
    
    return Response.json({
      tested_email: email,
      success_endpoint: successEndpoint ? successEndpoint[0] : null,
      all_results: results
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});