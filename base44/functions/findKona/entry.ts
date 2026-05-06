import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const users = await base44.asServiceRole.entities.User.filter({}, 'email', 500);
        return Response.json({ users: users.map(u => ({ email: u.email, full_name: u.full_name })) });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
});