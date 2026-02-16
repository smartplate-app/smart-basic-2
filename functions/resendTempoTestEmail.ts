import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = (body?.target_email || 'guestroom@smartplate.org').toString().trim().toLowerCase();
    const subject = (body?.subject || 'test order to see that we dont get postmaster').toString();
    const supplierKeyword = (body?.supplier_keyword || 'tempo').toString().toLowerCase();

    // Admins can act for others; non-admins can only act for themselves
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && user.email?.toLowerCase() !== targetEmail) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find supplier for target user whose name includes keyword (case-insensitive)
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({ created_by: targetEmail }, 'name');
    const tempoSupplier = (suppliers || []).find(s => (s.name || '').toString().toLowerCase().includes(supplierKeyword));
    if (!tempoSupplier) {
      return Response.json({ success: false, error: `No supplier containing "${supplierKeyword}" found for ${targetEmail}` }, { status: 404 });
    }

    // Get most recent order for that supplier by this user
    const orders = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail, supplier_id: tempoSupplier.id }, '-created_date');
    if (!orders || orders.length === 0) {
      return Response.json({ success: false, error: `No orders found for supplier ${tempoSupplier.name} by ${targetEmail}` }, { status: 404 });
    }

    const order = orders[0];

    // Resend using existing email function with subject + reply-to override; do not override recipient
    const resp = await base44.asServiceRole.functions.invoke('sendOrderEmail', {
      orderId: order.id,
      subject,
      reply_to_override: targetEmail,
    });

    return Response.json({ success: true, order_id: order.id, supplier: tempoSupplier.name, email_result: resp?.data || null });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});