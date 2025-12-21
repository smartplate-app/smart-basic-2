import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userEmailRaw = body?.userEmail || caller.email;
    const email = (userEmailRaw || '').toLowerCase().trim();
    if (!email) {
      return Response.json({ success: false, error: 'Missing userEmail' }, { status: 400 });
    }

    // Allow only self or admins to run this for another user
    if (caller.email !== email && caller.role !== 'admin') {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Delete all StoreUser records for this email
    const storeUsers = await base44.asServiceRole.entities.StoreUser.filter({ user_email: email });
    let deleted = 0;
    for (const su of storeUsers) {
      await base44.asServiceRole.entities.StoreUser.delete(su.id);
      deleted++;
    }

    // Clear user flags on the built-in User entity (extra fields only)
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, {
        store_user_role: null,
        store_user_owner_email: null,
        store_user_store_name: null,
        store_user_revoked: false,
        acting_as_store_email: null,
        acting_as_store_name: null
      });
    }

    return Response.json({ success: true, email, deleted });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to remove membership' }, { status: 500 });
  }
});