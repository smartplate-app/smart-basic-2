import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { targetEmail } = await req.json().catch(() => ({ targetEmail: null }));
    if (!targetEmail || typeof targetEmail !== 'string' || !targetEmail.includes('@')) {
      return Response.json({ success: false, error: 'Invalid targetEmail' }, { status: 400 });
    }

    // Allow only admins or the chain/store owner to trigger cleanups; keep simple: admin-only
    if (me.role !== 'admin') {
      // Also allow the owner email to run cleanup for their sub-user (exact match for this case)
      const allowedOwners = ['studioaka55@gmail.com'];
      if (!allowedOwners.includes(me.email)) {
        return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    const entities = ['Warehouse', 'Item', 'Supplier', 'Order', 'SupplyReceipt', 'InventoryCount'];
    const deleted = {};

    for (const entity of entities) {
      try {
        const records = await base44.asServiceRole.entities[entity].filter({ created_by: targetEmail });
        let count = 0;
        for (const rec of records) {
          try {
            await base44.asServiceRole.entities[entity].delete(rec.id);
            count += 1;
          } catch (e) {
            // continue
          }
        }
        deleted[entity] = count;
      } catch (_e) {
        deleted[entity] = 0;
      }
    }

    // Do not remove StoreUser linkage we just created
    return Response.json({ success: true, targetEmail, deleted });
  } catch (error) {
    return Response.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
});