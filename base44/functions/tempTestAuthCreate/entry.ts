import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email, password } = await req.json();
        
        try {
            await base44.auth.register({ email, password, full_name: "Test", email_confirm: true, emailConfirm: true, verified: true, is_verified: true });
            return Response.json({ success: true });
        } catch (authError) {
            return Response.json({ success: false, authError: JSON.stringify(authError, Object.getOwnPropertyNames(authError)) });
        }
        
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});