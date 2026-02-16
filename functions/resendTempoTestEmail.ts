import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function base64UrlEncode(str) {
  const utf8 = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetEmail = (body?.target_email || 'guestroom@smartplate.org').toString().trim().toLowerCase();
    const subject = (body?.subject || 'test order to see that we dont get postmaster').toString();
    const supplierKeyword = (body?.supplier_keyword || 'tempo').toString().toLowerCase();
    const orderNumber = (body?.order_number || '').toString().trim();
    const toOverride = (body?.to || '').toString().trim();

    const isAdmin = user?.role === 'admin';
    if (!isAdmin && (user.email || '').toLowerCase() !== targetEmail) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let order = null;
    let supplierName = null;

    // Prefer explicit order_number if provided
    if (orderNumber) {
      const exact = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
      if (exact && exact.length > 0) {
        order = exact[0];
      } else {
        // Fallback: search recent orders by this user and match suffix or contains
        const recent = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail }, '-created_date');
        const normalize = (s) => (s || '').toString().toLowerCase();
        const suffix = orderNumber.replace(/^ORD[-_]?/i, '').toLowerCase();
        order = (recent || []).find(o => {
          const onum = normalize(o.order_number);
          return onum === normalize(orderNumber) || onum.endsWith(suffix) || onum.includes(suffix);
        }) || null;
      }
      if (!order) {
        return Response.json({ success: false, error: `Order with number ${orderNumber} not found for ${targetEmail}` }, { status: 404 });
      }
      supplierName = order.supplier_name || null;
    } else {
      // Legacy path: infer by supplier keyword (e.g., 'tempo')
      const suppliers = await base44.asServiceRole.entities.Supplier.filter({ created_by: targetEmail }, 'name');
      let matchedSupplier = (suppliers || []).find(s => (s.name || '').toString().toLowerCase().includes(supplierKeyword));
      if (matchedSupplier) {
        const list = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail, supplier_id: matchedSupplier.id }, '-created_date');
        if (list && list.length > 0) order = list[0];
        supplierName = matchedSupplier.name || null;
      }
      if (!order) {
        const recent = await base44.asServiceRole.entities.Order.filter({ created_by: targetEmail }, '-created_date');
        const byName = (recent || []).find(o => ((o.supplier_name || '').toString().toLowerCase().includes(supplierKeyword)));
        if (byName) {
          order = byName;
          supplierName = byName.supplier_name || supplierName;
        }
      }
      if (!order) {
        return Response.json({ success: false, error: `No recent order to a supplier matching "${supplierKeyword}" for ${targetEmail}` }, { status: 404 });
      }
    }

    // New policy: primary To is order.supplier_email; CC admin and guestroom
    const toAddress = (order.supplier_email || '').toString().trim();
    if (!toAddress || !toAddress.includes('@')) {
      return Response.json({ success: false, error: 'No supplier_email on order' }, { status: 400 });
    }
    const ccList = ['admin@smartplate.org','guestroom@smartplate.org'].filter(cc => cc.toLowerCase() !== toAddress.toLowerCase());
    const ccHeader = ccList.join(', ');

    // Compose HTML + text (based on sendOrderEmail style)
    const items = Array.isArray(order.items) ? order.items : [];
    const itemsRows = items.map((it: any) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${(it.item_name || '').toString()}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${Number(it.quantity || 0)}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${(it.unit || '').toString()}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">₪${Number(it.total || (Number(it.price || 0) * Number(it.quantity || 0))).toFixed(2)}</td>
      </tr>
    `).join('');

    const totalCost = Number(order.total_cost || 0).toFixed(2);
    const restaurantName = order.restaurant_name || '';
    const deliveryDate = order.delivery_date || '';

    const origin = (() => { try { return (new URL(req.url)).origin; } catch { return ''; }})();
    const publicUrl = origin ? `${origin}/#/pages/OrderDetails?id=${order.id}` : '';

    const html = `<!DOCTYPE html>
<html>
  <body style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:16px;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <div style="background:#111827;color:#ffffff;padding:16px 20px;">
        <div style="font-size:18px;font-weight:700;">Smart Plate basic</div>
        <div style="font-size:13px;opacity:0.85;">New order notification</div>
      </div>
      <div style="padding:20px;">
        <p style="margin:0 0 12px 0;">Hello${order.supplier_name ? ' ' + order.supplier_name : ''},</p>
        <p style="margin:0 0 12px 0;">קיבלת הזמנה חדשה באמצעות SMART PLATE BASIC — איזה כיף!</p>
        <div style="margin:16px 0;padding:12px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;">
          <div style="margin:4px 0;"><strong>From:</strong> ${restaurantName || '-'}</div>
          <div style="margin:4px 0;"><strong>Order #:</strong> ${order.order_number || '-'}</div>
          <div style="margin:4px 0;"><strong>Delivery date:</strong> ${deliveryDate || '-'}</div>
          <div style="margin:4px 0;"><strong>Total:</strong> ₪${totalCost}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin:10px 0 16px 0;font-size:13px;">
          <thead>
            <tr>
              <th style="text-align:right;padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Item</th>
              <th style="text-align:right;padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Qty</th>
              <th style="text-align:right;padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Unit</th>
              <th style="text-align:right;padding:6px 8px;border:1px solid #e5e7eb;background:#f9fafb;">Amount</th>
            </tr>
          </thead>
          <tbody>${itemsRows || ''}</tbody>
        </table>
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Please reply to this email for any questions or confirmations.</p>
      </div>
      <div style="padding:12px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">Sent by Smart Plate basic</div>
    </div>
  </body>
</html>`;

    const itemsTxt = items.map((it: any) => `• ${(it.item_name || '')} — ${Number(it.quantity || 0)} ${(it.unit || '')}`).join('\n');
    const text = `New order from Smart Plate basic\n\nFrom: ${restaurantName || '-'}\nOrder #: ${order.order_number || '-'}\nDelivery date: ${deliveryDate || '-'}\nTotal: ₪${totalCost}\n\nItems:\n${itemsTxt}\n\nView online: ${publicUrl || ''}\nReply to confirm or ask questions.`;

    // Gmail connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    if (!accessToken) return Response.json({ error: 'Gmail connector not authorized' }, { status: 500 });

    // Identify sender
    let senderEmail = '';
    try {
      const prof = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { 'Authorization': `Bearer ${accessToken}` } });
      const p = await prof.json();
      senderEmail = p?.emailAddress || '';
    } catch (_) {}

    const boundary = 'b44_boundary_' + Math.random().toString(36).slice(2);
    const sendEmail = async () => {
      const headers = [
        `From: Smart Plate basic <${senderEmail || targetEmail || 'no-reply@smartplate.org'}>`,
        `To: ${toAddress}`,
        `${ccHeader ? `Cc: ${ccHeader}` : ''}`,
        `Reply-To: ${targetEmail}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
      ].filter(Boolean);
      const raw = headers.join('\r\n') +
        `--${boundary}\r\n` +
        'Content-Type: text/plain; charset=UTF-8\r\n' +
        'Content-Transfer-Encoding: 7bit\r\n\r\n' +
        text + '\r\n' +
        `--${boundary}\r\n` +
        'Content-Type: text/html; charset=UTF-8\r\n' +
        'Content-Transfer-Encoding: 7bit\r\n\r\n' +
        html + '\r\n' +
        `--${boundary}--`;
      const encoded = base64UrlEncode(raw);
      const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: encoded })
      });
      if (!resp.ok) return { to: toAddress, ok: false, error: await resp.text() };
      const data = await resp.json();
      return { to: toAddress, ok: true, id: data?.id || null };
    };

    const result = await sendEmail();

    if (!result.ok) return Response.json({ success: false, result }, { status: 500 });

    return Response.json({ success: true, order_id: order.id, order_number: order.order_number || null, supplier: supplierName, result });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});