import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function base64UrlEncode(str) {
  const utf8 = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8.length; i++) {
    binary += String.fromCharCode(utf8[i]);
  }
  // btoa expects a binary string
  const b64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return b64;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const orderId = body?.orderId;
    const overrideTo = (body?.to || '').trim();
    if (!orderId) return Response.json({ error: 'orderId is required' }, { status: 400 });

    // Load order (service role to allow sub-users/admin flows)
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Build recipients: override, order email, supplier card email (dedupe), always CC admin
    const recipientsSet = new Set();
    const pushEmail = (s) => { const e = (s || '').toString().trim(); if (e && e.includes('@')) recipientsSet.add(e.toLowerCase()); };
    pushEmail(overrideTo);
    pushEmail(order.supplier_email);
    let supplierEmail = '';
    try {
      if (order.supplier_id) {
        const supplier = await base44.asServiceRole.entities.Supplier.get(order.supplier_id);
        supplierEmail = (supplier?.email || '').trim();
        pushEmail(supplierEmail);
      }
    } catch (_) { /* ignore */ }
    const recipients = Array.from(recipientsSet);
    if (recipients.length === 0) {
      return Response.json({ success: false, error: 'No recipient email found on order or supplier record' }, { status: 400 });
    }
    const toHeader = recipients.join(', ');

    // Compose email
    const subject = 'a new order has send to you from smart plate basic';
    const adminCc = 'admin@smartplate.org';
    const replyTo = user.email || 'no-reply@smartplate.org';
    const fromDisplay = 'Smart Plate basic';

    const orderNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
    const restaurantName = order.restaurant_name || '';
    const deliveryDate = order.delivery_date || '';
    const items = Array.isArray(order.items) ? order.items : [];

    const itemsRows = items.map((it) => `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${(it.item_name || '').toString()}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${Number(it.quantity || 0)}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${(it.unit || '').toString()}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">₪${Number(it.total || (Number(it.price || 0) * Number(it.quantity || 0))).toFixed(2)}</td>
      </tr>
    `).join('');

    const totalCost = Number(order.total_cost || 0).toFixed(2);

    const publicUrl = (() => {
      try {
        const origin = (new URL(req.url)).origin;
        return `${origin}/#/pages/OrderDetails?id=${order.id}`;
      } catch {
        return '';
      }
    })();

    const html = `
<!DOCTYPE html>
<html>
  <body style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:16px;">
    <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <div style="background:#111827;color:#ffffff;padding:16px 20px;">
        <div style="font-size:18px;font-weight:700;">Smart Plate basic</div>
        <div style="font-size:13px;opacity:0.85;">New order notification</div>
      </div>
      <div style="padding:20px;">
        <p style="margin:0 0 12px 0;">Hello${order.supplier_name ? ' ' + order.supplier_name : ''},</p>
        <p style="margin:0 0 12px 0;">You have received a new order.</p>
        <div style="margin:16px 0;padding:12px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;">
          <div style="margin:4px 0;"><strong>From:</strong> ${restaurantName || '-'}</div>
          <div style="margin:4px 0;"><strong>Order #:</strong> ${orderNumber}</div>
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
        ${publicUrl ? `<p style="margin:16px 0 0 0;">View online: <a href="${publicUrl}">${publicUrl}</a></p>` : ''}
        <p style="margin:16px 0 0 0;color:#6b7280;font-size:12px;">Please reply to this email for any questions or confirmations.</p>
      </div>
      <div style="padding:12px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">Sent by Smart Plate basic</div>
    </div>
  </body>
</html>`;

    // Build raw MIME message
    const headers = [
      `To: ${toHeader}`,
      `Cc: ${adminCc}`,
      `Reply-To: ${replyTo}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
    ];
    const raw = headers.join('\r\n') + html;
    const encoded = base64UrlEncode(raw);

    // Gmail send via connector access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    if (!accessToken) {
      return Response.json({ error: 'Gmail connector not authorized' }, { status: 500 });
    }

    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encoded })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return Response.json({ success: false, error: 'Gmail send failed', details: errText }, { status: 500 });
    }

    const data = await resp.json();
    return Response.json({ success: true, messageId: data?.id || null, to: recipients, cc: adminCc });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});