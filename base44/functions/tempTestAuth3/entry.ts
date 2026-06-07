import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const users = await base44.asServiceRole.entities.User.filter({ email: "testworker22@gmail.com" });
        return Response.json({ users });
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});