import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const orders = await base44.asServiceRole.entities.Order.filter({ store_owner_email: 'guestroom@smartplate.org' });
    return Response.json({ orders });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});