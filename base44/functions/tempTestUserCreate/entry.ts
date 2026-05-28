import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const newUser = await base44.asServiceRole.entities.User.create({
            email: "test.worker@store.local",
            full_name: "Test Worker",
            role: "user"
        });
        return Response.json({ success: true, newUser });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});