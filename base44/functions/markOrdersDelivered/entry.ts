import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orderIds = body?.orderIds || [];
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return Response.json({ error: 'orderIds array is required' }, { status: 400 });
    }

    const updatedOrders = [];
    
    for (const orderId of orderIds) {
      if (!orderId) continue;
      const order = await base44.asServiceRole.entities.Order.get(orderId).catch(() => null);
      if (!order) continue;
      
      let allowed = (order.created_by === user.email) || (user.role === 'admin') || (order.store_owner_email === user.email);
      if (!allowed) {
        try {
          const links = await base44.entities.StoreUser.filter({ user_email: user.email, is_active: true });
          allowed = links.some((r) => r.owner_email === order.created_by || r.owner_email === order.store_owner_email);
        } catch (_) {}
      }
      
      if (allowed) {
        const updated = await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'delivered'
        });
        updatedOrders.push(updated);
      }
    }

    return Response.json({ success: true, updatedCount: updatedOrders.length });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});