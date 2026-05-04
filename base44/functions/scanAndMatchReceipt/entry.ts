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
      prompt: `You are extracting header fields from a HEBREW supplier invoice image. Do a deep reading of the Hebrew text and DO NOT invent words that are not on the invoice.
      
EXTRACTION RULES (HEBREW ONLY):
- Header fields:
  - invoice_number: number/code following "מספר חשבונית" / "חשבונית מס'" / "מס' חשבונית" / "חשבונית"
  - invoice_date_invoice / invoice_date_printed: YYYY-MM-DD. IMPORTANT: The current year is ${currentYear}. Do NOT guess future years like 2026 unless explicitly written as 2026. If the year is written as two digits (e.g. "25"), assume 2025, not 2026.
  - total_excl_vat: סכום ללא מע"מ / מחיר כולל (before VAT)
  - vat_amount: מע"מ
  - total_incl_vat: סה"כ לתשלום OR סה"כ כולל מע"מ (after VAT). Prefer the bold bottom number.
  - is_refund: boolean, if the document includes "זיכוי" or "החזר"
JSON only.`,
      file_urls,
      response_json_schema: {
        type: 'object',
        properties: {
          invoice_number: { type: 'string' },
          invoice_date_invoice: { type: 'string' },
          invoice_date_printed: { type: 'string' },
          total_excl_vat: { type: 'number' },
          vat_amount: { type: 'number' },
          total_incl_vat: { type: 'number' },
          is_refund: { type: 'boolean' }
        },
        required: ['invoice_number']
      }
    });

    return Response.json({ 
      success: true, 
      header: {
        invoice_number: llm.invoice_number,
        invoice_date: llm.invoice_date_invoice || llm.invoice_date_printed,
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