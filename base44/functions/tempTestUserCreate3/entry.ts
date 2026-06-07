import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email, password, full_name } = await req.json();
        
        // Try to register a new user with email + password
        try {
            const result = await base44.auth.register({ email, password, full_name });
            return Response.json({ success: true, result });
        } catch (authError) {
            return Response.json({ 
                success: false, 
                authError: JSON.stringify(authError, Object.getOwnPropertyNames(authError)),
                status: authError?.status,
                message: authError?.message
            });
        }
        
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});