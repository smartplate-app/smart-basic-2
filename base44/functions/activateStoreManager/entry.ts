import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { storeUserId } = await req.json();
    if (!storeUserId) return Response.json({ error: 'Missing storeUserId' }, { status: 400 });

    // Get the StoreUser record
    const storeUserRecords = await base44.asServiceRole.entities.StoreUser.filter({ id: storeUserId });
    const storeUser = storeUserRecords?.[0];
    if (!storeUser) return Response.json({ error: 'StoreUser not found' }, { status: 404 });

    // Only the owner or an admin can activate
    const ownerEmail = user.acting_as_store_email || user.email;
    if (storeUser.owner_email !== ownerEmail && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Activate the StoreUser record
    await base44.asServiceRole.entities.StoreUser.update(storeUserId, {
      is_active: true,
      description: ''
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});