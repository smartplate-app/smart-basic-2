import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Find all StoreUser records tied to this user's email
    const records = await base44.asServiceRole.entities.StoreUser.filter({ user_email: user.email });

    let deleted = 0;
    for (const rec of records) {
      try {
        await base44.asServiceRole.entities.StoreUser.delete(rec.id);
        deleted += 1;
      } catch (_) {}
    }

    // Clear any store-user flags on the profile
    await base44.auth.updateMe({
      store_user_role: null,
      store_user_owner_email: null,
      store_user_store_name: null,
      store_user_revoked: false,
      acting_as_store_email: null,
      acting_as_store_name: null
    });

    return Response.json({ success: true, deleted });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to delete StoreUser records' }, { status: 500 });
  }
});