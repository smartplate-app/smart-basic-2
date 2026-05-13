import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const result = await base44.asServiceRole.entities.Order.filter({ $or: [{ created_by: 'demo@foodcostapp.com' }, { store_owner_email: 'demo@foodcostapp.com' }] });
    return Response.json({ success: true, count: result.length, data: result });
  } catch (error) {
    return Response.json({ success: false, error: error.message });
  }
});