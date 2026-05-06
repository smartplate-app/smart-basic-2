import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const data = await base44.asServiceRole.entities.Recipe.filter({ "data.created_by": "konaburgerltd@gmail.com" });
  return Response.json({ count: data.length });
});