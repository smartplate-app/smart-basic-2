import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';



Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { file_urls = [], supplier_id = null } = payload || {};
    if (!Array.isArray(file_urls) || file_urls.length === 0) {
      return Response.json({ error: 'file_urls required' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    // 1) Extract header fields from the document (Heb/Eng supported)
    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_4',
      prompt: `You are an expert accountant extracting data from an Israeli supplier invoice/delivery note image. Read the Hebrew text carefully. DO NOT invent or hallucinate data.

CRITICAL EXTRACTION RULES:
1. invoice_number:
   - Look for "מספר חשבונית", "חשבונית מס'", "מס' חשבונית", "תעודת משלוח", "מספר מסמך", or "מזהה".
   - Extract EXACTLY the invoice number (digits, sometimes with dashes or letters). Do NOT extract phone numbers or dates.
2. invoice_date:
   - Look for "תאריך", "תאריך הפקה", "תאריך מסמך", "Date".
   - Format strictly as YYYY-MM-DD. If the year is "24" -> 2024, "25" -> 2025. (The current year is ${currentYear}). Do not invent future dates.
3. total_incl_vat:
   - Look for "סה"כ לתשלום", "סה"כ כולל מע"מ", "לתשלום ש"ח", "סה"כ".
   - This is the final absolute bottom-line total you have to pay. Extract the exact numeric value. 
4. total_excl_vat:
   - Look for "סה"כ לפני מע"מ", "סכום פטור", "סכום חייב", "ללא מע"מ".
5. vat_amount:
   - Look for "סכום מע"מ", "מע"מ 17%", "מע"מ".
6. is_refund:
   - Set to true ONLY if the document says "חשבונית זיכוי", "זיכוי", "החזר", or if the total is explicitly negative.

Extract these values precisely. If a value is missing, return 0 for amounts or empty string for text.`,
      file_urls,
      response_json_schema: {
        type: 'object',
        properties: {
          invoice_number: { type: 'string' },
          invoice_date: { type: 'string' },
          total_excl_vat: { type: 'number' },
          vat_amount: { type: 'number' },
          total_incl_vat: { type: 'number' },
          is_refund: { type: 'boolean' }
        },
        required: ['invoice_number', 'invoice_date', 'total_incl_vat']
      }
    });

    return Response.json({ 
      success: true, 
      header: {
        invoice_number: llm.invoice_number,
        invoice_date: llm.invoice_date,
        total_excl_vat: llm.total_excl_vat,
        vat_amount: llm.vat_amount,
        total_incl_vat: llm.total_incl_vat,
        is_refund: llm.is_refund
      },
      items: [] 
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});