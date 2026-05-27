import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';



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
    // 1) Extract header fields and items from the document (Heb/Eng supported)
    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_1_pro',
      prompt: `You are an expert accountant extracting data from an Israeli supplier invoice/delivery note image. Read the Hebrew text carefully. DO NOT invent or hallucinate data.

VERY IMPORTANT: DO NOT TRANSLATE any item names. Extract the exact text in its original language exactly as it appears in the document. If the document is in Hebrew, keep names in Hebrew. If in English, keep in English.

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
7. items:
   - Extract the list of ALL items exactly as they appear in the invoice (the "תיאור" / Description column).
   - Look for the item name, quantity ("כמות", "כמויות"), price per unit ("מחיר יחידה", "מחיר"), and total line price ("סה"כ", "סכום").

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
          is_refund: { type: 'boolean' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item_name: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' },
                total: { type: 'number' }
              }
            }
          }
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
      items: llm.items || [] 
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});