import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// This function returns a plain text summary of an order for sharing
// Accessible via GET with ?orderId=xxx or ?d=encodedData
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const orderId = body.orderId || url.searchParams.get('orderId');
    const language = body.language || url.searchParams.get('lang') || 'he';

    if (!orderId) {
      return Response.json({ error: 'orderId required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const order = await base44.asServiceRole.entities.Order.get(orderId);

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const ensuredNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
    const itemsText = (order.items || []).map(it => `• ${it.item_name || it.name || ''} - ${it.quantity} ${it.unit || ''}`).join('\n');

    const text = language === 'he'
      ? `הזמנה ממסעדת ${order.restaurant_name || ''}\n${order.restaurant_address ? `כתובת: ${order.restaurant_address}\n` : ''}מספר הזמנה: ${ensuredNumber}\n\nפריטים:\n${itemsText}`
      : `Order from ${order.restaurant_name || ''}\n${order.restaurant_address ? `Address: ${order.restaurant_address}\n` : ''}Order #: ${ensuredNumber}\n\nItems:\n${itemsText}`;

    return Response.json({ success: true, text, order_number: ensuredNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});