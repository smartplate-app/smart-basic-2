import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ authorized: false, reason: 'unauthenticated' }, { status: 401 });

    // Get the current user's Drive token via connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return Response.json({ authorized: false, error: txt || `HTTP ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({ authorized: true, user: data.user });
  } catch (error) {
    return Response.json({ authorized: false, error: error.message }, { status: 500 });
  }
});