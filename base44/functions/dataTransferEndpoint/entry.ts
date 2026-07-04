import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  if (body.mode === 'readUsers') {
    const users = await base44.asServiceRole.entities.User.list();
    return Response.json({ users: users.map(u => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role })) });
  }

  if (body.mode === 'read') {
    const result = {};
    for (const name of body.entity_names) {
      try {
        let records = [];
        if (body.user_id) {
          records = await base44.asServiceRole.entities[name].filter({ created_by_id: body.user_id }, '-created_date', 5000);
        } else {
          let skip = 0;
          while (true) {
            const batch = await base44.asServiceRole.entities[name].list('-created_date', 1000, skip);
            records = records.concat(batch);
            if (batch.length < 1000) break;
            skip += 1000;
          }
        }
        result[name] = { records, error: null };
      } catch (err) {
        result[name] = { records: [], error: err.message };
      }
    }
    return Response.json(result);
  }

  return Response.json({ error: 'Read-only endpoint' }, { status: 400 });
});