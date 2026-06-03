import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Impersonate Daniel to see if he can fetch Order
        // Actually we can't easily impersonate without a token.
        // Let's check Recipe.json again, why does it have an RLS policy?
        
        return Response.json({
            ok: true
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});