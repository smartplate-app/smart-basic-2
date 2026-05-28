import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const authKeys = Object.keys(base44.auth);
    return Response.json({ authKeys });
});