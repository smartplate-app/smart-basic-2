import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

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
    // Encode the subject to base64 (RFC 2047) so Hebrew works correctly via the Gmail API
    const rawSubject = (body?.subject && String(body.subject)) || `New order from ${order.restaurant_name || ''} via Smart Plate Basic App`;
    const utf8Subject = new TextEncoder().encode(rawSubject);
    let binarySubject = '';
    for (let i = 0; i < utf8Subject.length; i++) {
      binarySubject += String.fromCharCode(utf8Subject[i]);
    }
    const subject = `=?utf-8?B?${btoa(binarySubject)}?=`;
    const adminCc = 'admin@smartplate.org';
    const replyTo = (body?.reply_to_override && String(body.reply_to_override)) || user.email || 'no-reply@smartplate.org';
    const fromDisplay = 'Smart Plate basic';

    const orderNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
    const restaurantName = order.restaurant_name || user.business_name || user.acting_as_store_name || user.store_user_store_name || user.full_name || '';
    const deliveryDate = order.delivery_date || '';
    const items = Array.isArray(order.items) ? order.items : [];

    const itemsRows = items.map((it) => {
      let displayUnit = (it.unit || '').toString();
      if (body?.language === 'he') {
        const translations = {
          'case': 'ארגזים',
          'unit': 'יחידות',
          'kg': 'ק״ג',
          'gram': 'גרם',
          'liter': 'ליטר',
          'ml': 'מ״ל'
        };
        displayUnit = translations[displayUnit] || displayUnit;
      }
      return `
      <tr>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">
          ${(it.item_name || '').toString()}
          ${it.catalog_number ? `<br/><span style="font-size:12px;color:#6b7280;">SKU: ${it.catalog_number}</span>` : ''}
        </td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${Number(it.quantity || 0)}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">${displayUnit}</td>
        <td style="padding:6px 8px;border:1px solid #e5e7eb;">₪${Number(it.total || (Number(it.price || 0) * Number(it.quantity || 0))).toFixed(2)}</td>
      </tr>
      `;
    }).join('');

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
        <p style="margin:0 0 12px 0;">קיבלת הזמנה חדשה באמצעות SMART PLATE BASIC — איזה כיף!</p>
        <div style="margin:16px 0;padding:12px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;">
          <div style="margin:4px 0;"><strong>From:</strong> ${restaurantName || '-'}</div>
          <div style="margin:4px 0;"><strong>Order #:</strong> ${orderNumber}</div>
          <div style="margin:4px 0;"><strong>Delivery date:</strong> ${deliveryDate || '-'}</div>
          <div style="margin:4px 0;"><strong>Sent at:</strong> <span dir="ltr">${new Date().toLocaleDateString(body?.language === 'he' ? 'he-IL' : 'en-US')} ${new Date().toLocaleTimeString(body?.language === 'he' ? 'he-IL' : 'en-US', {hour: '2-digit', minute:'2-digit'})}</span></div>
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
        
        <br/>
        <br/>
        ${restaurantName ? `<div style="font-weight: bold; margin-top: 10px;">${restaurantName}</div>` : ''}
        <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">
          הזמנה זו נשלחה באמצעות מערכת SMART PLATE BASIC, The ultimate food & labor cost app for the restaurant industry 2026.
        </div>
        ${user.restaurant_logo ? `<br/><img src="${user.restaurant_logo}" alt="Logo" style="max-height:80px;" />` : ''}
      </div>
      <div style="padding:12px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">Sent by Smart Plate basic</div>
    </div>
    
    <br/><br/><br/><br/><br/><br/><br/><br/>
  </body>
</html>`;

    // Build plain text alternative (better deliverability for Exchange/Office365)
    const itemsTxt = items.map((it) => {
      let displayUnit = (it.unit || '').toString();
      if (body?.language === 'he') {
        const translations = {
          'case': 'ארגזים',
          'unit': 'יחידות',
          'kg': 'ק״ג',
          'gram': 'גרם',
          'liter': 'ליטר',
          'ml': 'מ״ל'
        };
        displayUnit = translations[displayUnit] || displayUnit;
      }
      return `• ${(it.item_name || '')}${it.catalog_number ? ` (SKU: ${it.catalog_number})` : ''} — ${Number(it.quantity || 0)} ${displayUnit}`;
    }).join('\n');
    const text = `New order from Smart Plate basic\n\nFrom: ${restaurantName || '-'}\nOrder #: ${orderNumber}\nDelivery date: ${deliveryDate || '-'}\nSent at: ${new Date().toLocaleDateString(body?.language === 'he' ? 'he-IL' : 'en-US')} ${new Date().toLocaleTimeString(body?.language === 'he' ? 'he-IL' : 'en-US', {hour: '2-digit', minute:'2-digit'})}\nTotal: ₪${totalCost}\n\nItems:\n${itemsTxt}\n\nView online: ${publicUrl || ''}\nReply to confirm or ask questions.\n\n${restaurantName ? restaurantName + '\n' : ''}הזמנה זו נשלחה באמצעות מערכת SMART PLATE BASIC, The ultimate food & labor cost app for the restaurant industry 2026.\n\n\n\n\n\n\n\n\n`;

    // Attempt to use Gmail connector if authorized, fallback to Core.SendEmail
    const sendTo = async (rcpt) => {
      try {
        let useGmail = false;
        let accessToken = null;
        try {
          const connection = await base44.asServiceRole.connectors.getConnection('gmail');
          if (connection && connection.accessToken) {
            useGmail = true;
            accessToken = connection.accessToken;
          }
        } catch (e) {
          // Gmail not connected
        }

        if (useGmail) {
          const boundary = 'b44_boundary_' + Math.random().toString(36).slice(2);
          const headers = [
            `From: ${fromDisplay} <${replyTo || 'no-reply@smartplate.org'}>`,
            `To: ${rcpt}`,
            `Reply-To: ${replyTo}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            '',
          ];

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
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: encoded }),
          });

          if (!resp.ok) {
            throw new Error(await resp.text());
          }
        } else {
          await base44.integrations.Core.SendEmail({
            to: rcpt,
            subject: subject,
            body: html,
            from_name: fromDisplay
          });
        }
        
        return { to: rcpt, ok: true };
      } catch (err) {
        return { to: rcpt, ok: false, error: err.message };
      }
    };

    const results = [];
    for (const r of recipients) {
      if (r && r.toLowerCase() !== adminCc.toLowerCase()) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await sendTo(r));
      }
    }
    // Send separate copy to admin (not CC'd) to avoid stricter policies blocking the external recipient
    // eslint-disable-next-line no-await-in-loop
    results.push(await sendTo(adminCc));

    const anyOk = results.some(r => r.ok);
    if (!anyOk) {
      return Response.json({ success: false, results }, { status: 500 });
    }
    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});