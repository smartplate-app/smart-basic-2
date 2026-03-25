import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ authorized: false, reason: 'unauthenticated' }, { status: 401 });

    try {
      const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');
      if (!accessToken || typeof accessToken !== 'string' || accessToken.length < 10) {
        return Response.json({ authorized: false, reason: 'no_token' }, { status: 403 });
      }
      return Response.json({ authorized: true });
    } catch (e) {
      return Response.json({ authorized: false, reason: 'not_authorized', message: e?.message || String(e) }, { status: 403 });
    }
  } catch (error) {
    return Response.json({ authorized: false, error: error.message }, { status: 500 });
  }
});