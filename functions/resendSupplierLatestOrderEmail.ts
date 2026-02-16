import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rawSupplier = (body?.supplierName || '').trim();
    const toEmail = (body?.toEmail || '').trim();
    const orderNumberHint = (body?.orderNumber || '').trim();

    if (!rawSupplier && !orderNumberHint) return Response.json({ error: 'supplierName or orderNumber is required' }, { status: 400 });
    // No direct toEmail required; using order.supplier_email policy

    const norm = (s) => (s || '').toString().trim().toLowerCase();

    // 1) If orderNumber provided, try that first (exact then fuzzy)
    let targetOrder = null;
    if (orderNumberHint) {
      try {
        const exact = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumberHint }, '-created_date');
        if (exact && exact.length > 0) targetOrder = exact[0];
      } catch (_) {}
      if (!targetOrder) {
        try {
          const recent = await base44.asServiceRole.entities.Order.list('-created_date', 200);
          targetOrder = (recent || []).find(o => norm(o.order_number).includes(norm(orderNumberHint)));
        } catch (_) {}
      }
    }

    // 2) If still not found, try supplier name -> supplier_id -> orders
    if (!targetOrder) {
      let supplier = null;
      if (rawSupplier) {
        try {
          const suppliers = await base44.asServiceRole.entities.Supplier.list('name', 1000);
          const byExact = suppliers.find(s => norm(s.name) === norm(rawSupplier));
          const byStarts = suppliers.find(s => norm(s.name).startsWith(norm(rawSupplier)));
          const byIncludes = suppliers.find(s => norm(s.name).includes(norm(rawSupplier)));
          supplier = byExact || byStarts || byIncludes || null;
        } catch (_) {}
      }

      // Prefer orders by supplier_id when we have it
      if (supplier?.id) {
        try {
          const byId = await base44.asServiceRole.entities.Order.filter({ supplier_id: supplier.id }, '-created_date');
          if (byId && byId.length > 0) targetOrder = byId[0];
        } catch (_) {}
      }

      // Fallback: scan recent orders and match by supplier_name OR restaurant_name; then by supplier_email
      if (!targetOrder) {
        try {
          const recent = await base44.asServiceRole.entities.Order.list('-created_date', 500);
          if (rawSupplier) {
            const byExact = recent.find(o => norm(o.supplier_name) === norm(rawSupplier) || norm(o.restaurant_name) === norm(rawSupplier));
            const byStarts = recent.find(o => norm(o.supplier_name).startsWith(norm(rawSupplier)) || norm(o.restaurant_name).startsWith(norm(rawSupplier)));
            const byIncludes = recent.find(o => norm(o.supplier_name).includes(norm(rawSupplier)) || norm(o.restaurant_name).includes(norm(rawSupplier)));
            targetOrder = byExact || byStarts || byIncludes || null;
          }
          // As a final fallback, match by supplier_email (useful when name is in different language/script)
          if (!targetOrder && toEmail) {
            targetOrder = recent.find(o => norm(o.supplier_email) === norm(toEmail)) || null;
          }
        } catch (_) {}
      }
    }

    if (!targetOrder) {
      return Response.json({ success: false, error: `No matching order found for ${orderNumberHint || rawSupplier}` }, { status: 404 });
    }

    // 3) Send email using existing sender (adds CC to admin, Reply-To, Gmail connector)
    const sendRes = await base44.asServiceRole.functions.invoke('sendOrderEmail', {
      orderId: targetOrder.id
    });

    const ok = sendRes?.status >= 200 && sendRes?.status < 300 && !!sendRes?.data && sendRes?.data?.success !== false;
    if (!ok) {
      return Response.json({
        success: false,
        error: 'Failed to send email',
        details: sendRes?.data || null,
        order_id: targetOrder.id,
        order_number: targetOrder.order_number || null
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      to: targetOrder.supplier_email || null,
      supplier: rawSupplier || targetOrder.supplier_name,
      order_id: targetOrder.id,
      order_number: targetOrder.order_number || null,
      email: sendRes.data
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});