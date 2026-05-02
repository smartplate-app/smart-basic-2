import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const response = await base44.integrations.Core.InvokeLLM({
            prompt: "Please extract the total sales (מכירות נטו) and labor cost (עלות עבודה) from this URL: https://rosa-app-41540b5f.base44.app/KonaDashboard. Return JSON.",
            add_context_from_internet: true,
            model: 'gemini_3_flash',
            response_json_schema: {
                type: "object",
                properties: {
                    sales: { type: "number" },
                    labor_cost: { type: "number" }
                }
            }
        });
        
        return Response.json(response);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});