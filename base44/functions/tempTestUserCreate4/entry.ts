import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const res = await base44.auth.loginViaEmailPassword(
            'test_password_user@example.com',
            'securePassword123'
        );

        return Response.json({ success: true, res });
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});