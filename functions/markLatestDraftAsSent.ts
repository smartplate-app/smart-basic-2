import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Determine target email (controlled user if admin is controlling)
    let workingEmail = user.acting_as_store_email || user.acting_as_user_email || user.email;

    // If workingEmail is a store user, use the owner's email to locate orders
    let targetEmail = workingEmail;
    try {
      const links = await base44.entities.StoreUser.filter({ user_email: workingEmail, is_active: true });
      if (links.length > 0) {
        targetEmail = links[0].owner_email || workingEmail;
      }
    } catch (_) {}

    // Fetch latest draft by updated_date desc
    const drafts = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail, status: 'draft' }, '-updated_date');
    if (!drafts || drafts.length === 0) {
      return Response.json({ success: false, message: 'No draft found for target', targetEmail });
    }

    const latest = drafts[0];
    const orderNumber = latest.order_number || `ORD-${(latest.id || Date.now()).toString().slice(-8)}`;

    const updated = await base44.asServiceRole.entities.Order.update(latest.id, {
      status: 'sent',
      order_number: orderNumber,
    });

    return Response.json({ success: true, order: updated, targetEmail });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});