import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await base44.auth.updateMe({
      acting_as_store_email: null,
      acting_as_store_name: null,
      store_user_revoked: false
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to clear user context' }, { status: 500 });
  }
});