import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const newUser = await base44.asServiceRole.entities.User.create({
            email: "test.worker2@store.local",
            full_name: "Test Worker 2",
            role: "user",
            business_name: "Test Store",
            business_address: "Test Address"
        });
        return Response.json({ success: true, newUser });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});