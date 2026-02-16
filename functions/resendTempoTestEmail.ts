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
    const orderNumber = (body?.order_number || '').toString().trim();
    const toOverride = (body?.to || '').toString().trim();

    const isAdmin = user?.role === 'admin';
    if (!isAdmin && (user.email || '').toLowerCase() !== targetEmail) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let order = null;
    let supplierName = null;

    // Prefer explicit order_number if provided
    if (orderNumber) {
      const exact = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
      if (exact && exact.length > 0) {
        order = exact[0];
      } else {
        // Fallback: search recent orders by this user and match suffix or contains
        const recent = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail }, '-created_date');
        const normalize = (s) => (s || '').toString().toLowerCase();
        const suffix = orderNumber.replace(/^ORD[-_]?/i, '').toLowerCase();
        order = (recent || []).find(o => {
          const onum = normalize(o.order_number);
          return onum === normalize(orderNumber) || onum.endsWith(suffix) || onum.includes(suffix);
        }) || null;
      }
      if (!order) {
        return Response.json({ success: false, error: `Order with number ${orderNumber} not found for ${targetEmail}` }, { status: 404 });
      }
      supplierName = order.supplier_name || null;
    } else {
      // Legacy path: infer by supplier keyword (e.g., 'tempo')
      const suppliers = await base44.asServiceRole.entities.Supplier.filter({ created_by: targetEmail }, 'name');
      let matchedSupplier = (suppliers || []).find(s => (s.name || '').toString().toLowerCase().includes(supplierKeyword));
      if (matchedSupplier) {
        const list = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail, supplier_id: matchedSupplier.id }, '-created_date');
        if (list && list.length > 0) order = list[0];
        supplierName = matchedSupplier.name || null;
      }
      if (!order) {
        const recent = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail }, '-created_date');
        const byName = (recent || []).find(o => ((o.supplier_name || '').toString().toLowerCase().includes(supplierKeyword)));
        if (byName) {
          order = byName;
          supplierName = byName.supplier_name || supplierName;
        }
      }
      if (!order) {
        return Response.json({ success: false, error: `No recent order to a supplier matching "${supplierKeyword}" for ${targetEmail}` }, { status: 404 });
      }
    }

    // Resend via existing mailer with custom subject + reply-to, and optional direct "to" override
    const payload = {
      orderId: order.id,
      subject,
      reply_to_override: targetEmail,
    } as Record<string, unknown>;
    if (toOverride) payload.to = toOverride;

    const resp = await base44.asServiceRole.functions.invoke('sendOrderEmail', payload);

    return Response.json({ success: true, order_id: order.id, order_number: order.order_number || null, supplier: supplierName, email_result: resp?.data || null });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});