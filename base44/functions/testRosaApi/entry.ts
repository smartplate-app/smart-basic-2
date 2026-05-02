import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const response = await fetch('https://rosa-app-41540b5f.base44.app/KonaDashboard');
        const text = await response.text();
        return Response.json({ text: text.substring(0, 10000) });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});