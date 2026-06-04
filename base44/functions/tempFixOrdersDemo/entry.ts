import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Only allow admin
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const demoEmail = 'office@smartplate.biz';
    const adminEmail = user.email;

    // Get orders created by admin
    const adminOrders = await base44.asServiceRole.entities.Order.filter({
      created_by: adminEmail
    });
    
    let updatedCount = 0;
    for (const order of adminOrders) {
      if (!order.store_owner_email || order.store_owner_email !== demoEmail) {
        await base44.asServiceRole.entities.Order.update(order.id, {
          store_owner_email: demoEmail
        });
        updatedCount++;
        // Small delay to avoid rate limit
        await new Promise(r => setTimeout(r, 100));
      }
    }

    return Response.json({ success: true, updatedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});