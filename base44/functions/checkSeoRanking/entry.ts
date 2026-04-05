import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { keyword, domain } = await req.json();
        
        const prompt = `Search the internet for the exact query: "${keyword}".
Look through the search results and find if the domain "${domain}" appears anywhere.
If it does, estimate its position (e.g., 1, 5, 12, etc.).
If it doesn't appear in the top results, say it's not found.
Be honest based on the actual search results. Do not guess.`;

        const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: prompt,
            model: 'gemini_3_1_pro',
            add_context_from_internet: true,
            response_json_schema: {
                type: "object",
                properties: {
                    found: { type: "boolean" },
                    estimated_position: { type: "number" },
                    summary: { type: "string" }
                }
            }
        });

        return Response.json({ success: true, data: response });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});