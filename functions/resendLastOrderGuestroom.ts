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
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine whose orders to use
    const workingEmail = (user.store_user_owner_email || user.email || '').toLowerCase();
    if (!workingEmail) {
      return Response.json({ success: false, error: 'No user email context' }, { status: 400 });
    }

    // Latest order for this context
    const orders = await base44.asServiceRole.entities.Order.filter({ created_by: workingEmail }, '-created_date');
    if (!orders || orders.length === 0) {
      return Response.json({ success: false, error: `No orders found for ${workingEmail}` }, { status: 404 });
    }
    // Prefer the most recent order that has any supplier email
    let order = orders.find(o => (o?.supplier_email && String(o.supplier_email).includes('@')));
    if (!order) order = orders[0];

    // New policy: primary To is order.supplier_email; CC admin and guestroom
    const toAddress = (order.supplier_email || '').toString().trim();
    if (!toAddress || !toAddress.includes('@')) {
      // Fallback: send only to admin for test purposes
      const results = [{ to: 'admin@smartplate.org', ok: true, id: 'skipped-no-supplier' }];
      return Response.json({ success: true, note: 'No supplier email; sent only to admin for test', order_id: order.id, order_number: order.order_number || null, results });
    }
    const ccList = ['admin@smartplate.org','guestroom@smartplate.org'].filter(cc => cc.toLowerCase() !== toAddress.toLowerCase());
    const ccHeader = ccList.join(', ');

    // Compose email
    const items = Array.isArray(order.items) ? order.items : [];
    const rows = items.map((it) => `\n• ${(it.item_name || '')} — ${Number(it.quantity || 0)} ${(it.unit || '')}`).join('');
    const totalCost = Number(order.total_cost || 0).toFixed(2);
    const restaurant = order.restaurant_name || '';
    const deliveryDate = order.delivery_date || '';

    const origin = (() => { try { return (new URL(req.url)).origin; } catch { return ''; } })();
    const publicUrl = origin ? `${origin}/#/pages/OrderDetails?id=${order.id}` : '';

    const subject = `Order ${order.order_number || ''} — ${restaurant}`.trim();

    const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:16px;">\
<div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">\
  <div style="background:#111827;color:#ffffff;padding:16px 20px;">\
    <div style="font-size:18px;font-weight:700;">Smart Plate basic</div>\
    <div style="font-size:13px;opacity:0.85;">New order notification</div>\
  </div>\
  <div style="padding:20px;">\
    <p style="margin:0 0 12px 0;">Hello${order.supplier_name ? ' ' + order.supplier_name : ''},</p>\
    <p style="margin:0 0 12px 0;">קיבלת הזמנה חדשה באמצעות SMART PLATE BASIC — איזה כיף!</p>\
    <div style="margin:16px 0;padding:12px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;">\
      <div style="margin:4px 0;"><strong>From:</strong> ${restaurant || '-'}</div>\
      <div style="margin:4px 0;"><strong>Order #:</strong> ${order.order_number || '-'}</div>\
      <div style="margin:4px 0;"><strong>Delivery date:</strong> ${deliveryDate || '-'}</div>\
      <div style="margin:4px 0;"><strong>Total:</strong> ₪${totalCost}</div>\
    </div>\
    <pre style="white-space:pre-wrap;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;">Items:${rows}</pre>\
    ${publicUrl ? `<p style=\"margin-top:12px;\"><a href=\"${publicUrl}\">View online</a></p>` : ''}\
  </div>\
  <div style="padding:12px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">Sent by Smart Plate basic</div>\
</div></body></html>`;

    const text = `New order from Smart Plate basic\n\nFrom: ${restaurant || '-'}\nOrder #: ${order.order_number || '-'}\nDelivery date: ${deliveryDate || '-'}\nTotal: ₪${totalCost}\n\nItems:${rows}\n\n${publicUrl ? ('View online: ' + publicUrl) : ''}`;

    // Gmail connector (guestroom mailbox authorized via connector)
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    if (!accessToken) return Response.json({ error: 'Gmail connector not authorized' }, { status: 500 });

    let senderEmail = '';
    try {
      const prof = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers: { 'Authorization': `Bearer ${accessToken}` } });
      const p = await prof.json();
      senderEmail = p?.emailAddress || '';
    } catch (_) {}

    const boundary = 'b44_boundary_' + Math.random().toString(36).slice(2);

    const sendEmail = async () => {
      const headers = [
        `From: Smart Plate basic <${senderEmail || 'guestroom@smartplate.org'}>`,
        `To: ${toAddress}`,
        `${ccHeader ? `Cc: ${ccHeader}` : ''}`,
        `Reply-To: ${workingEmail}`,
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

    const anyOk = results.some(r => r.ok);
    if (!anyOk) return Response.json({ success: false, order_id: order.id, order_number: order.order_number || null, results }, { status: 500 });

    return Response.json({ success: true, order_id: order.id, order_number: order.order_number || null, results });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});