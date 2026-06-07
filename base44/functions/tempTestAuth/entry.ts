import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        return Response.json({ props: Object.keys(base44.asServiceRole.auth || {}) });
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});