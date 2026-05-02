import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Fetch the external dashboard
        const response = await fetch('https://rosa-app-41540b5f.base44.app/KonaDashboard');
        const html = await response.text();
        
        // Return the HTML to see if there's any hidden data or API calls
        return Response.json({ html: html.substring(0, 2000) });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});