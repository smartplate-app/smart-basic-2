import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function parseMonthRange(month) {
  const [y, m] = String(month || '').split('-').map((x) => parseInt(x, 10));
  if (!y || !m || m < 1 || m > 12) throw new Error('Invalid month format. Use YYYY-MM');
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

function withinMonth(d, start, end) {
  if (!d) return false;
  try {
    const dt = new Date(d);
    return dt >= start && dt <= end;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const month = body.month || '';
    const targetEmail = body.targetEmail || body.email || user.email;

    if (!month) return Response.json({ error: 'Missing month (YYYY-MM)' }, { status: 400 });

    if (targetEmail !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { start, end } = parseMonthRange(month);

    const receipts = await base44.asServiceRole.entities.SupplyReceipt.filter({ created_by: targetEmail }, '-received_date');

    const monthReceipts = (receipts || []).filter((r) => withinMonth(r.invoice_date || r.received_date, start, end));

    const supplierMap = new Map();
    let withImagesCount = 0;

    for (const r of monthReceipts) {
      const key = r.supplier_id || 'unknown';
      const name = r.supplier_name || 'Unknown';
      if (!supplierMap.has(key)) {
        supplierMap.set(key, {
          supplier_id: key,
          supplier_name: name,
          receipts: [],
          receipts_count: 0,
          with_images_count: 0,
          missing_images_count: 0,
          total: 0,
        });
      }
      const g = supplierMap.get(key);
      g.receipts.push(r);
      g.receipts_count += 1;
      const imgs = Array.isArray(r.receipt_images) ? r.receipt_images.filter(Boolean) : [];
      if (imgs.length > 0) {
        g.with_images_count += 1;
        withImagesCount += 1;
      } else {
        g.missing_images_count += 1;
      }
      g.total += Number(r.invoice_total || r.calculated_total || 0);
    }

    const suppliers = Array.from(supplierMap.values()).sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));

    const centralName = '\u05d4\u05d7\u05d1\u05e8\u05d4 \u05d4\u05de\u05e8\u05db\u05d6\u05d9\u05ea';
    const hasCentral = suppliers.some((s) => (s.supplier_name || '').includes(centralName));
    const centralSupplier = suppliers.find((s) => (s.supplier_name || '').includes(centralName)) || null;

    const missing_invoices = [];
    for (const g of suppliers) {
      for (const r of g.receipts) {
        const imgs = Array.isArray(r.receipt_images) ? r.receipt_images.filter(Boolean) : [];
        if (imgs.length === 0) {
          missing_invoices.push({
            id: r.id,
            supplier_id: r.supplier_id,
            supplier_name: r.supplier_name,
            invoice_number: r.invoice_number || null,
            date: r.invoice_date || r.received_date || null,
            invoice_total: Number(r.invoice_total || r.calculated_total || 0),
          });
        }
      }
    }

    return Response.json({
      success: true,
      month,
      targetEmail,
      totals: {
        receipts_count: monthReceipts.length,
        receipts_with_images: withImagesCount,
        receipts_missing_images: missing_invoices.length,
      },
      suppliers: suppliers.map((s) => ({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        receipts_count: s.receipts_count,
        with_images_count: s.with_images_count,
        missing_images_count: s.missing_images_count,
        total: s.total,
      })),
      has_hevra_merkazit: hasCentral,
      hevra_merkazit_summary: centralSupplier
        ? {
            supplier_id: centralSupplier.supplier_id,
            supplier_name: centralSupplier.supplier_name,
            receipts_count: centralSupplier.receipts_count,
            with_images_count: centralSupplier.with_images_count,
            missing_images_count: centralSupplier.missing_images_count,
            total: centralSupplier.total,
          }
        : null,
      missing_invoices,
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});