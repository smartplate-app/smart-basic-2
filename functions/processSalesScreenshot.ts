import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url } = await req.json();
        if (!file_url) {
            return Response.json({ error: 'Missing file_url' }, { status: 400 });
        }

        const prompt = `You are an expert at extracting sales data from POS (Point of Sale) system reports and screenshots, especially in Hebrew (like Beecome, Tabit, etc).
Please extract the following sales figures (including VAT) from the provided image/file:
1. Total Sales (סה"כ מכירות)
2. Restaurant / Dine-in Sales (מכירות מסעדה / ישיבה במקום)
3. Delivery Sales (מכירות משלוחים - excluding Wolt if Wolt is separate, or total deliveries if combined)
4. Wolt Sales (מכירות וולט)
5. Takeaway Sales (מכירות T/A / טייק אווי / איסוף עצמי)
6. Any other sales (other_sales)

Return ONLY a JSON object with these exact keys (use numbers, 0 if not found):
{
  "total_sales_incl_vat": 0,
  "restaurant_sales": 0,
  "delivery_sales": 0,
  "wolt_sales": 0,
  "takeaway_sales": 0,
  "other_sales": 0
}
Make sure to handle Hebrew text correctly (e.g. "מכירות מסעדה", "משלוחים", "וולט", "T/A", "טייק אווי").
If you see a total sum, make sure it matches the sum of the breakdowns roughly.`;

        const schema = {
            type: "object",
            properties: {
                total_sales_incl_vat: { type: "number" },
                restaurant_sales: { type: "number" },
                delivery_sales: { type: "number" },
                wolt_sales: { type: "number" },
                takeaway_sales: { type: "number" },
                other_sales: { type: "number" }
            },
            required: ["total_sales_incl_vat", "restaurant_sales", "delivery_sales", "wolt_sales", "takeaway_sales", "other_sales"]
        };

        const res = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            response_json_schema: schema,
            file_urls: [file_url],
            model: "claude_sonnet_4_6"
        });

        return Response.json({ success: true, data: res });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});