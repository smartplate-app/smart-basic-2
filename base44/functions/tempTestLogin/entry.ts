import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email, password } = await req.json();
        
        const loginRes = await base44.auth.loginViaEmailPassword(email, password);
        return Response.json({ success: true, loginRes });
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});