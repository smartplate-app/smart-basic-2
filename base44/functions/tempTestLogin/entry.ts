import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email, password } = await req.json();
        
        try {
            const result = await base44.auth.loginViaEmailPassword(email, password);
            return Response.json({ success: true, result });
        } catch (authError) {
            return Response.json({ success: false, authError: JSON.stringify(authError, Object.getOwnPropertyNames(authError)) });
        }
        
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});