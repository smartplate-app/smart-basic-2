import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Generate a fake custom token just like authenticateUser.js
        const customToken = btoa(JSON.stringify({ 
            userId: "test-user-id", 
            email: "test@test.com", 
            timestamp: Date.now() 
        }));

        // Fetch using this token against the public API
        const response = await fetch("https://api.base44.com/api/entities/Item/list", {
            headers: {
                "Authorization": `Bearer ${customToken}`,
                "X-App-Id": req.headers.get("X-App-Id") || Deno.env.get("BASE44_APP_ID")
            }
        });

        const status = response.status;
        const text = await response.text();

        return Response.json({ status, text, customToken });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});