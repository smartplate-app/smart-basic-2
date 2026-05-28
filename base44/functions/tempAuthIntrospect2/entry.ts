import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const serviceAuthKeys = base44.asServiceRole.auth ? Object.keys(base44.asServiceRole.auth) : null;
    return Response.json({ serviceAuthKeys });
});