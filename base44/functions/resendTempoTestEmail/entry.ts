import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetEmail = (body?.target_email || 'guestroom@smartplate.org').toString().trim().toLowerCase();
    const subject = (body?.subject || 'test order to see that we dont get postmaster').toString();
    const supplierKeyword = (body?.supplier_keyword || 'tempo').toString().toLowerCase();

    const isAdmin = user?.role === 'admin';
    if (!isAdmin && (user.email || '').toLowerCase() !== targetEmail) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1) Try by supplier name under the target user
    const suppliers = await base44.asServiceRole.entities.Supplier.filter({ created_by: targetEmail }, 'name');
    let tempoSupplier = (suppliers || []).find(s => (s.name || '').toString().toLowerCase().includes(supplierKeyword));

    let order = null;

    if (tempoSupplier) {
      const list = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail, supplier_id: tempoSupplier.id }, '-created_date');
      if (list && list.length > 0) order = list[0];
    }

    // 2) If still not found, search recent orders by supplier_name includes keyword
    if (!order) {
      const recent = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail }, '-created_date');
      const byName = (recent || []).find(o => ((o.supplier_name || '').toString().toLowerCase().includes(supplierKeyword)));
      if (byName) {
        order = byName;
        // Best-effort supplier lookup for info
        if (!tempoSupplier && byName.supplier_id) {
          try { tempoSupplier = await base44.asServiceRole.entities.Supplier.get(byName.supplier_id); } catch { /* ignore */ }
        }
      }
    }

    if (!order) {
      return Response.json({ success: false, error: `No recent order to a supplier matching "${supplierKeyword}" for ${targetEmail}` }, { status: 404 });
    }

    // Resend via existing mailer with custom subject + reply-to override; keep original recipients
    const resp = await base44.asServiceRole.functions.invoke('sendOrderEmail', {
      orderId: order.id,
      subject,
      reply_to_override: targetEmail,
    });

    return Response.json({ success: true, order_id: order.id, supplier: tempoSupplier?.name || order.supplier_name || null, email_result: resp?.data || null });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});