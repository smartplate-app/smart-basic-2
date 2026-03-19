import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await req.json();
    if (!itemId) {
      return Response.json({ success: false, error: 'itemId is required' }, { status: 400 });
    }

    // Load the item using service role
    const items = await base44.asServiceRole.entities.Item.filter({ id: itemId });
    const item = items?.[0] || null;
    if (!item) {
      return Response.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    const ownerEmail = item.created_by || item.store_owner_email;
    const actingAsStoreEmail = user.acting_as_store_email || null;
    const storeOwnerEmail = user.store_user_owner_email || null;

    const allowed = (
      user.email === ownerEmail ||
      (actingAsStoreEmail && actingAsStoreEmail === ownerEmail) ||
      (storeOwnerEmail && (storeOwnerEmail === ownerEmail)) ||
      user.role === 'admin'
    );

    if (!allowed) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await base44.asServiceRole.entities.Item.delete(itemId);
    return Response.json({ success: true, deleted: 1 });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
});