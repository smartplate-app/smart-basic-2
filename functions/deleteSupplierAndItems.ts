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

    // Chain manager policy: allow only managers (not workers/viewers) in the same chain as the supplier's owner
    if (!allowed) {
      try {
        // Determine the chain of the supplier owner
        let ownerChainId = null;
        const ownerStores = await base44.asServiceRole.entities.ChainStore.filter({ user_email: ownerEmail });
        if (Array.isArray(ownerStores) && ownerStores.length > 0) {
          ownerChainId = ownerStores[0].chain_id || null;
        }
        if (!ownerChainId) {
          const chains = await base44.asServiceRole.entities.Chain.filter({ head_store_user_email: ownerEmail });
          if (Array.isArray(chains) && chains.length > 0) {
            ownerChainId = chains[0].id || null;
          }
        }

        if (ownerChainId) {
          // Head-store user of this chain is always allowed
          const chainRec = await base44.asServiceRole.entities.Chain.filter({ id: ownerChainId });
          const headEmail = chainRec?.[0]?.head_store_user_email || null;
          if (headEmail && user.email === headEmail) {
            allowed = true;
          }

          // Managers of any store in this chain are allowed (exclude workers/viewers)
          if (!allowed) {
            const storesInChain = await base44.asServiceRole.entities.ChainStore.filter({ chain_id: ownerChainId });
            const ownerEmailsInChain = new Set((storesInChain || []).map((s) => s.user_email).filter(Boolean));

            const myStoreUserRecs = await base44.asServiceRole.entities.StoreUser.filter({ user_email: user.email });
            const isManagerInChain = Array.isArray(myStoreUserRecs) && myStoreUserRecs.some((rec) =>
              rec.is_active !== false &&
              rec.role === 'manager' &&
              ownerEmailsInChain.has(rec.owner_email)
            );

            if (isManagerInChain) {
              allowed = true;
            }
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