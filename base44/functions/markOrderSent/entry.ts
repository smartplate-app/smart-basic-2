import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orderId = body?.orderId;
    const providedNumber = body?.orderNumber;
    if (!orderId) return Response.json({ error: 'orderId is required' }, { status: 400 });

    // Load order with service role
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Permission: owner, admin, or active StoreUser linked to owner
    let allowed = (order.created_by === user.email) || (user.role === 'admin');
    if (!allowed) {
      try {
        const links = await base44.entities.StoreUser.filter({ user_email: user.email, is_active: true });
        allowed = links.some((r) => r.owner_email === order.created_by);
      } catch (_) {
        // ignore
      }
    }
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const orderNumber = order.order_number || providedNumber || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;

    const updated = await base44.asServiceRole.entities.Order.update(order.id, {
      status: 'sent',
      order_number: orderNumber,
    });

    return Response.json({ success: true, order: updated });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});