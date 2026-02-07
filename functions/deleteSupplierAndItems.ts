import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    let allowed = (
      user.email === ownerEmail ||
      (actingAsStoreEmail && actingAsStoreEmail === ownerEmail) ||
      (storeOwnerEmail && (storeOwnerEmail === ownerEmail)) ||
      user.role === 'admin'
    );

    // Extend permission: users in the same chain as the owner (head/branch) can delete
    if (!allowed) {
      try {
        if (user.chain_id) {
          const stores = await base44.asServiceRole.entities.ChainStore.filter({ chain_id: user.chain_id });
          const ownerInChain = Array.isArray(stores) && stores.some((s) => s.user_email === ownerEmail);
          if (ownerInChain) {
            allowed = true;
          }
        }
      } catch (_) {}
    }

    if (!allowed) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Delete all items of this supplier (by id) and any orphan items matching supplier name for this owner
    const itemsById = await base44.asServiceRole.entities.Item.filter({ supplier_id: supplierId });
    const itemsByNameCreated = await base44.asServiceRole.entities.Item.filter({ supplier_name: supplier.name, created_by: ownerEmail });
    const itemsByNameStore = await base44.asServiceRole.entities.Item.filter({ supplier_name: supplier.name, store_owner_email: ownerEmail });

    const allToDeleteMap = new Map();
    for (const it of [...itemsById, ...itemsByNameCreated, ...itemsByNameStore]) {
      allToDeleteMap.set(it.id, it);
    }

    let deletedItems = 0;
    for (const it of allToDeleteMap.values()) {
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