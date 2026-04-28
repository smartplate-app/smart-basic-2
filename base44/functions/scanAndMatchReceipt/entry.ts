import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\u200f\u200e]/g, '') // RTL marks
    .replace(/[^\p{L}\p{N}\s.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s) {
  return normalize(s).split(' ').filter(Boolean);
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  const inter = [...sa].filter(x => sb.has(x)).length;
  const uni = new Set([...sa, ...sb]).size;
  return uni === 0 ? 0 : inter / uni;
}

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

    // 1) Extract header and item lines from the document (Heb/Eng supported)
    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are extracting header fields AND line items from a HEBREW supplier invoice image. Do a deep reading of the Hebrew text and DO NOT invent words that are not on the invoice.
      
EXTRACTION RULES (HEBREW ONLY):
- Header fields:
  - invoice_number: number/code following "מספר חשבונית" / "חשבונית מס'" / "מס' חשבונית" / "חשבונית"
  - invoice_date_invoice / invoice_date_printed: YYYY-MM-DD
  - total_excl_vat: סכום ללא מע"מ / מחיר כולל (before VAT)
  - vat_amount: מע"מ
  - total_incl_vat: סה"כ לתשלום OR סה"כ כולל מע"מ (after VAT). Prefer the bold bottom number.
  - is_refund: boolean, if the document includes "זיכוי" or "החזר"
- Line items:
  - Return ONLY items in the 'items' array.
  - Fields per item: name (exact Hebrew name from invoice), quantity (number), unit (string), price (number, pre-discount if unclear), total (number).
  - Ignore headers, subtotals, tax lines. Normalize units to: kg | liter | unit | case when possible.
  - Do NOT invent items. Extract exactly what is written.
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
          is_refund: { type: 'boolean' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string' },
                price: { type: 'number' },
                total: { type: 'number' }
              },
              required: ['name', 'quantity']
            }
          }
        },
        required: ['items']
      }
    });

    const extracted = Array.isArray(llm.items) ? llm.items : [];

    // 2) Build candidate lookup: user's items (+ optional supplier filter) and global aliases
    const userEmail = user.acting_as_store_email || user.email;
    let items = await base44.entities.Item.filter({ created_by: userEmail });
    if (!Array.isArray(items) || items.length === 0) {
      // fallback: items created for this supplier by anyone (shared catalogs)
      items = supplier_id ? await base44.entities.Item.filter({ supplier_id }) : await base44.entities.Item.list();
    }

    const aliases = await base44.asServiceRole.entities.ItemAlias.list();

    const itemsByNorm = new Map();
    items.forEach(it => {
      const n = normalize(it.name);
      if (n) itemsByNorm.set(n, it);
    });

    // supplier-scoped preference
    const itemsBySupplier = new Map();
    items.forEach(it => {
      if (it.supplier_id) {
        const n = normalize(it.name);
        const key = `${it.supplier_id}::${n}`;
        itemsBySupplier.set(key, it);
      }
    });

    const aliasToItem = new Map();
    aliases.forEach(a => {
      const n = normalize(a.normalized || a.alias);
      if (!n) return;
      aliasToItem.set(n, { item_id: a.item_id, item_name: a.item_name });
    });

    // 3) Match each extracted item name
    const matched = extracted.map(row => {
      const rawName = row.name || '';
      const q = Number(row.quantity || 0);
      const unit = (row.unit || '').toLowerCase();
      const price = Number(row.price || 0);
      const total = Number(row.total || 0);

      const n = normalize(rawName);

      // supplier scoped exact name first
      if (supplier_id) {
        const k = `${supplier_id}::${n}`;
        if (itemsBySupplier.has(k)) {
          const it = itemsBySupplier.get(k);
          return { ...row, name_extracted: rawName, item_id: it.id, item_name: it.name, match_confidence: 1.0 };
        }
      }

      // alias exact
      if (aliasToItem.has(n)) {
        const a = aliasToItem.get(n);
        return { ...row, name_extracted: rawName, item_id: a.item_id, item_name: a.item_name, match_confidence: 1.0 };
      }

      // direct name exact
      if (itemsByNorm.has(n)) {
        const it = itemsByNorm.get(n);
        return { ...row, name_extracted: rawName, item_id: it.id, item_name: it.name, match_confidence: 0.98 };
      }

      // fuzzy via token overlap
      const ntoks = tokenize(rawName);
      let best = { it: null, score: 0 };
      items.forEach(it => {
        const sc = jaccard(ntoks, tokenize(it.name));
        if (sc > best.score) best = { it, score: sc };
      });

      if (best.it && best.score >= 0.5) {
        return { ...row, name_extracted: rawName, item_id: best.it.id, item_name: best.it.name, match_confidence: Number(best.score.toFixed(2)) };
      }

      // not matched
      return { ...row, name_extracted: rawName, item_id: null, item_name: null, match_confidence: 0 };
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
      items: matched 
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});