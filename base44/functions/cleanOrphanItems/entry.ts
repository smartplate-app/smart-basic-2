import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = (body?.targetEmail || body?.ownerEmail || body?.email || '').trim();

    if (!targetEmail) {
      return Response.json({ success: false, error: 'targetEmail is required' }, { status: 400 });
    }

    // Authorization: allow if user is the owner, acting as the store, store user of that owner, or admin
    const allowed = (
      user.email === targetEmail ||
      user.acting_as_store_email === targetEmail ||
      user.store_user_owner_email === targetEmail ||
      user.role === 'admin'
    );

    if (!allowed) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Load all suppliers for this owner (both created_by and store_owner_email forms)
    const [suppliersCreated, suppliersStore] = await Promise.all([
      base44.asServiceRole.entities.Supplier.filter({ created_by: targetEmail }),
      base44.asServiceRole.entities.Supplier.filter({ store_owner_email: targetEmail })
    ]);

    const validSupplierIds = new Set([
      ...suppliersCreated.map((s) => s.id),
      ...suppliersStore.map((s) => s.id)
    ]);

    // Load all items for this owner (created_by and store_owner_email)
    const [itemsCreated, itemsStore] = await Promise.all([
      base44.asServiceRole.entities.Item.filter({ created_by: targetEmail }),
      base44.asServiceRole.entities.Item.filter({ store_owner_email: targetEmail })
    ]);

    // De-duplicate items by id
    const allItemsMap = new Map();
    for (const it of [...itemsCreated, ...itemsStore]) {
      allItemsMap.set(it.id, it);
    }

    // Orphan = supplier_id not in validSupplierIds
    const orphanItems = Array.from(allItemsMap.values()).filter((it) => !validSupplierIds.has(it.supplier_id));

    let deleted = 0;
    const deletedIds = [];

    // Delete in batches to be safe
    for (const it of orphanItems) {
      try {
        await base44.asServiceRole.entities.Item.delete(it.id);
        deleted += 1;
        deletedIds.push(it.id);
      } catch (_) {
        // skip failures but continue
      }
    }

    return Response.json({
      success: true,
      targetEmail,
      scanned: allItemsMap.size,
      orphanCount: orphanItems.length,
      deleted,
      deletedIds
    });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
});