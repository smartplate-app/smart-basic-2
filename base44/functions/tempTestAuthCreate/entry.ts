import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email, password } = await req.json();
        
        const newUser = await base44.asServiceRole.entities.User.create({
            email: email,
            full_name: "Test User",
            role: 'user',
            password: password,
            business_name: "Test Business",
            business_address: "Test Address",
            is_verified: true
        });
        
        return Response.json({ success: true, newUser });
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});