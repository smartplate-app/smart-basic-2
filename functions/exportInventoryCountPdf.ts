import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

// Hebrew font + RTL helpers
let __hebrewFontB64 = null;
const __hebrewFontUrl = 'https://cdn.jsdelivr.net/gh/google/fonts/ofl/notosanshebrew/NotoSansHebrew-Regular.ttf';

function __toBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  // btoa is available in Deno runtime
  return btoa(binary);
}

async function __ensureHebrewFont(doc) {
  try {
    if (!__hebrewFontB64) {
      const res = await fetch(__hebrewFontUrl);
      if (!res.ok) throw new Error('Failed to download Hebrew font');
      const buf = await res.arrayBuffer();
      __hebrewFontB64 = __toBase64(buf);
    }
    const fontFile = 'NotoSansHebrew-Regular.ttf';
    const fontName = 'NotoSansHebrew';
    doc.addFileToVFS(fontFile, __hebrewFontB64);
    doc.addFont(fontFile, fontName, 'normal');
    doc.setFont(fontName, 'normal');
  } catch (_) {
    // If font fails, continue with default to avoid breaking PDF generation
  }
}

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

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    await __ensureHebrewFont(doc);
    const margin = 40;
    let y = 50;

    // RTL/Hebrew helpers
    const containsHebrew = (s) => /[\u0590-\u05FF]/.test(String(s || ''));
    const drawTextSmart = (txt, xLeft, xRight, yPos, preferredAlign = 'left') => {
      const isHeb = containsHebrew(txt);
      const align = isHeb ? 'right' : preferredAlign;
      const x = align === 'right' ? xRight : xLeft;
      doc.text(String(txt ?? ''), x, yPos, { align });
    };
    if (typeof doc.setR2L === 'function') { doc.setR2L(true); }

    const restaurantName = user?.business_name || user?.store_user_store_name || user?.full_name || user?.email || 'Restaurant';
    const monthLabel = (() => {
      try {
        const d = count.count_date ? new Date(count.count_date) : null;
        if (d && !isNaN(d)) return d.toLocaleString('he-IL', { month: 'long', year: 'numeric' });
      } catch {}
      return '';
    })();
    const generatedAt = new Date().toLocaleString('he-IL');

    const pw = doc.internal.pageSize.getWidth();

    const title = `${restaurantName} - Inventory Count${monthLabel ? ` (${monthLabel})` : ''}`;
    doc.setFontSize(18);
    drawTextSmart(title, margin, pw - margin, y, 'left');
    y += 24;

    doc.setFontSize(11);
    const companyName = user?.business_name || '';
    const taxId = user?.business_tax_id || '';
    const metaLines = [
        companyName ? `שם חברה: ${companyName}` : '',
        taxId ? `מספר עוסק/חברה: ${taxId}` : '',
        `Count Name: ${count.name || '-'}`,
        `Warehouse: ${count.warehouse_name || '-'}`,
        `Count Date: ${count.count_date || '-'}`,
        monthLabel ? `Month: ${monthLabel}` : '',
        `Type: ${count.count_type || '-'}`,
        `Status: ${count.status || '-'}`,
        `Generated: ${generatedAt}`,
    ].filter(Boolean);
    metaLines.forEach((line) => {
        drawTextSmart(line, margin, pw - margin, y, 'left');
        y += 16;
    });

    y += 8;

    // Table headers
    const columns = [
      { key: 'item_name', label: 'Item', x: margin, width: 220 },
      { key: 'counted_quantity', label: 'Qty', x: margin + 230, width: 60, align: 'right' },
      { key: 'unit', label: 'Unit', x: margin + 300, width: 60 },
      { key: 'price_per_unit', label: 'Price', x: margin + 370, width: 80, align: 'right' },
      { key: 'total_cost', label: 'Total', x: margin + 460, width: 90, align: 'right' },
    ];

    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();

    const drawHeader = () => {
      doc.setFontSize(12);
      doc.setTextColor(40);
      columns.forEach((col) => {
        drawTextSmart(col.label, col.x, col.x + col.width, y, col.align || 'left');
      });
      y += 14;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    };

    drawHeader();

    const items = Array.isArray(count.items) ? count.items : [];

    doc.setFontSize(10);
    for (const it of items) {
      if (y > pageHeight - 60) {
        doc.addPage();
        y = 50;
        drawHeader();
      }
      const row = {
        item_name: String(it.item_name || ''),
        counted_quantity: (it.counted_quantity ?? 0).toString(),
        unit: String(it.unit || ''),
        price_per_unit: (Number(it.price_per_unit || 0)).toFixed(2),
        total_cost: (Number(it.total_cost || 0)).toFixed(2),
      };
      columns.forEach((col) => {
        const txt = row[col.key] ?? '';
        drawTextSmart(txt, col.x, col.x + col.width, y, col.align || 'left');
      });
      y += 14;
    }

    // Totals
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 50;
    }
    y += 6;
    doc.setDrawColor(160);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;
    doc.setFontSize(12);
    doc.setTextColor(20);
    doc.text(`Total Inventory Value: ₪${Number(count.total_inventory_value || 0).toFixed(2)}`, margin, y);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="InventoryCount_${(count.name || count.warehouse_name || 'Count').replace(/\s+/g,'_')}_${count.count_date || ''}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});