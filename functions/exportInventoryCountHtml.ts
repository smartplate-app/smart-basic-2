import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Generates a full HTML page for an InventoryCount with proper UTF-8 + Hebrew font and RTL support
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const countId = payload?.count_id;
    if (!countId) {
      return Response.json({ error: 'count_id is required' }, { status: 400 });
    }

    const records = await base44.entities.InventoryCount.filter({ id: countId });
    const count = Array.isArray(records) && records.length ? records[0] : null;
    if (!count) {
      return Response.json({ error: 'Inventory count not found' }, { status: 404 });
    }

    const restaurantName = user?.business_name || user?.store_user_store_name || user?.full_name || user?.email || 'Restaurant';
    const companyName = user?.business_name || '';
    const taxId = user?.business_tax_id || '';
    const monthLabel = (() => {
      try {
        const d = count.count_date ? new Date(count.count_date) : null;
        if (d && !isNaN(d)) return d.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
      } catch {}
      return '';
    })();
    const generatedAt = new Date().toLocaleString('he-IL');

    const items = Array.isArray(count.items) ? count.items : [];

    const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

    const rowsHtml = items.map((it) => `
      <tr>
        <td class="name">${esc(it.item_name)}</td>
        <td class="num">${(it.counted_quantity ?? 0).toLocaleString('he-IL')}</td>
        <td>${esc(it.unit || '')}</td>
        <td class="num">${Number(it.price_per_unit || 0).toFixed(2)}</td>
        <td class="num">${Number(it.total_cost || 0).toFixed(2)}</td>
      </tr>
    `).join('\n');

    const totalValue = Number(count.total_inventory_value || 0).toFixed(2);

    const titleText = `${restaurantName} – ${monthLabel ? monthLabel + ' ' : ''}Inventory Count`;

    const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(titleText)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root { --ink:#111827; --muted:#6b7280; --border:#e5e7eb; --accent:#111827; }
    html,body{ margin:0; padding:0; font-family:'Noto Sans Hebrew', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji'; color:var(--ink); }
    .page { padding: 32px; max-width: 900px; margin: 0 auto; }
    header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--border); padding-bottom:12px; margin-bottom:16px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    .meta { font-size: 12px; color: var(--muted); line-height: 1.6; }
    table { width:100%; border-collapse: collapse; font-size: 12px; }
    thead th { text-align: right; border-bottom: 1px solid var(--border); padding: 10px 8px; background:#fafafa; }
    td { border-bottom: 1px solid var(--border); padding: 8px; vertical-align: top; }
    td.num, th.num { text-align: left; }
    td.name { font-weight: 600; }
    tfoot td { border-top:2px solid var(--border); font-weight:700; padding-top:12px; }
    .badge { display:inline-block; padding:2px 8px; font-size:11px; border:1px solid var(--border); border-radius:999px; margin-inline-start:8px; }
    @media print {
      .noprint { display:none; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    .actions { margin: 16px 0; }
    .btn { background: var(--accent); color:white; padding:8px 12px; border-radius:8px; text-decoration:none; }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <div>
        <h1>${esc(restaurantName)}</h1>
        <div class="meta">
          ${companyName ? `<div>שם חברה: ${esc(companyName)}</div>` : ''}
          ${taxId ? `<div>מספר עוסק/חברה: ${esc(taxId)}</div>` : ''}
          <div>שם ספירה: ${esc(count.name || '-')} <span class="badge">${esc(count.status || '')}</span></div>
          <div>מחסן: ${esc(count.warehouse_name || '-')}</div>
          <div>תאריך ספירה: ${esc(count.count_date || '-')}${monthLabel ? ` • ${esc(monthLabel)}` : ''}</div>
          <div>סוג: ${esc(count.count_type || '-')}</div>
          <div>נוצר: ${esc(generatedAt)}</div>
        </div>
      </div>
    </header>

    <table>
      <thead>
        <tr>
          <th>פריט</th>
          <th class="num">כמות</th>
          <th>יחידה</th>
          <th class="num">מחיר</th>
          <th class="num">סה"כ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;">אין פריטים</td></tr>'}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4">שווי מלאי כולל</td>
          <td class="num">₪${totalValue}</td>
        </tr>
      </tfoot>
    </table>

    <div class="actions noprint">
      <a href="#" class="btn" onclick="window.print(); return false;">הדפס / שמור כ-PDF</a>
    </div>
  </div>
  <script>
    // Auto-open print for quick Save as PDF
    window.addEventListener('load', () => setTimeout(() => { try { window.print(); } catch(_){} }, 300));
  </script>
</body>
</html>`;

    return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});