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
    
    // Fetch user's existing items for this supplier to provide context
    let userEmail = user.email;
    if (user.store_user_owner_email) userEmail = user.store_user_owner_email;
    if (user.acting_as_store_email) userEmail = user.acting_as_store_email;
    
    let existingItemsContext = "";
    let existingItems = [];
    if (supplier_id) {
      existingItems = await base44.entities.Item.filter({ created_by: userEmail, supplier_id });
      if (existingItems.length > 0) {
        existingItemsContext = "Here is the list of existing items for this supplier in the user's catalog:\n" +
          existingItems.map(i => `- ID: ${i.id}, Name: "${i.name}", Nickname: "${i.nickname || ''}"`).join('\n') +
          "\n\n";
      }
    }

    // 1) Extract header fields from the document (Heb/Eng supported)
    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gpt_5_4',
      prompt: `You are an expert accountant extracting data from an Israeli supplier invoice/delivery note image. Read the Hebrew text carefully. DO NOT invent or hallucinate data.

${existingItemsContext}

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

ITEMS EXTRACTION:
For each line item on the invoice, extract its details.
If the item matches one of the existing items provided above, use that item's ID in 'item_id', set 'is_new_item' to false, and use the existing item's name for 'item_name'.
If the item does NOT clearly match any existing item, DO NOT INVENT A MATCH. DO NOT guess the name. 
Instead, set 'is_new_item' to true, leave 'item_id' empty string, and for 'item_name', extract EXACTLY the Hebrew text written on the invoice for that line item.

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
                is_new_item: { type: 'boolean', description: "True if this item was not found in the existing items list" },
                item_id: { type: 'string', description: "The ID from the existing items list (if matched)" },
                item_name: { type: 'string', description: "The exact name on the invoice if new, or the name from the existing items list if matched" },
                quantity: { type: 'number', description: "Quantity received" },
                price: { type: 'number', description: "Price per unit before discount" },
                discount: { type: 'number', description: "Discount amount or percentage (0 if none)" },
                total: { type: 'number', description: "Total line price" }
              },
              required: ['is_new_item', 'item_name', 'quantity', 'price', 'total']
            }
          }
        },
        required: ['invoice_number', 'invoice_date', 'total_incl_vat', 'items']
      }
    });

    const itemsParsed = (llm.items || []).map(i => {
      return {
        ...i,
        unit: 'unit', // default
        catalog_price: i.price || 0,
        catalog_discount: i.discount || 0,
        actual_price: i.price || 0,
        actual_discount: i.discount || 0,
        received_quantity: i.quantity || 1,
        ordered_quantity: i.quantity || 1,
        certificate_quantity: i.quantity || 1,
        price_changed: false,
        discount_changed: false,
        has_issue: false,
        issue_note: ""
      };
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
      items: itemsParsed 
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});