import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const logs = await base44.asServiceRole.entities.PriceChangeLog.filter({ created_by: 'admin@smartplate.org', item_type: 'recipe' }, 'effective_date', 100);
    const names = [...new Set(logs.map(l => l.item_name))];
    return Response.json({ names });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});