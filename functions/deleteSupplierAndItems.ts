import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { supplierId } = await req.json();
    if (!supplierId) {
      return Response.json({ success: false, error: 'supplierId is required' }, { status: 400 });
    }

    // Load supplier
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({ id: supplierId });
    const supplier = suppliers?.[0] || null;
    if (!supplier) {
      return Response.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    const ownerEmail = supplier.created_by || supplier.store_owner_email;
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

    // Delete all items of this supplier
    const items = await base44.asServiceRole.entities.Item.filter({ supplier_id: supplierId });
    let deletedItems = 0;
    for (const it of items) {
      try {
        await base44.asServiceRole.entities.Item.delete(it.id);
        deletedItems += 1;
      } catch (_) {
        // continue on per-item failure
      }
    }

    // Delete supplier
    await base44.asServiceRole.entities.Supplier.delete(supplierId);

    return Response.json({ success: true, deletedItems, deletedSupplier: true });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
});