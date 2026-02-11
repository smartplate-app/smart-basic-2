import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const supplierName = (body?.supplierName || '').trim();
    const toEmail = (body?.toEmail || '').trim();

    if (!supplierName) return Response.json({ error: 'supplierName is required' }, { status: 400 });
    if (!toEmail) return Response.json({ error: 'toEmail is required' }, { status: 400 });

    // Find latest order for this supplier (service role to allow chain/sub-user data)
    let orders = await base44.asServiceRole.entities.Order.filter({ supplier_name: supplierName }, '-created_date');
    if (!orders || orders.length === 0) {
      // Fallback: try by -updated_date
      orders = await base44.asServiceRole.entities.Order.filter({ supplier_name: supplierName }, '-updated_date');
    }
    if (!orders || orders.length === 0) {
      return Response.json({ success: false, error: `No orders found for supplier ${supplierName}` }, { status: 404 });
    }

    const order = orders[0];

    // Reuse existing email sender (ensures CC + Reply-To, Gmail connector, etc.)
    const sendRes = await base44.asServiceRole.functions.invoke('sendOrderEmail', {
      orderId: order.id,
      to: toEmail
    });

    const ok = sendRes?.status >= 200 && sendRes?.status < 300 && !!sendRes?.data;
    if (!ok || sendRes?.data?.success === false) {
      return Response.json({
        success: false,
        error: 'Failed to send email',
        details: sendRes?.data || null,
        order_id: order.id,
        order_number: order.order_number || null
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      to: toEmail,
      supplier: supplierName,
      order_id: order.id,
      order_number: order.order_number || null,
      email: sendRes.data
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});