import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetEmail = body?.targetEmail;

    if (!targetEmail || typeof targetEmail !== 'string') {
      return Response.json({ success: false, error: 'targetEmail is required' }, { status: 400 });
    }

    // Only allow admin or the target user themselves
    const allowed = (user.role === 'admin') || (user.email === targetEmail);
    if (!allowed) {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Fetch sent orders for the target user
    const sentOrders = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail, status: 'sent' });

    let deleted = 0;
    for (const order of sentOrders) {
      try {
        await base44.asServiceRole.entities.Order.delete(order.id);
        deleted += 1;
      } catch (e) {
        // continue on individual errors
      }
    }

    return Response.json({ success: true, targetEmail, deleted, totalFound: sentOrders.length });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
});