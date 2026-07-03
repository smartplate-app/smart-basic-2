import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // Ensure only admins can trigger this migration export
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { entityName, skip = 0 } = await req.json();
    
    if (!entityName) {
      return Response.json({ error: 'entityName is required' }, { status: 400 });
    }

    // Using the standard SDK signature: filter(query, sort, limit, skip)
    const records = await base44.asServiceRole.entities[entityName].filter(
      { store_owner_email: 'konaburgerltd@gmail.com' },
      '',
      500,
      skip
    );

    return Response.json({ records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});