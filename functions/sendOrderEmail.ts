import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function b64UrlEncode(str) {
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function buildEmail({ fromName, fromEmail, toEmail, ccEmail, replyTo, subject, html, text }) {
  const boundary = 'mixed_' + Math.random().toString(36).slice(2);
  const headers = [
    `From: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}`,
    `To: ${toEmail}`,
    ccEmail ? `Cc: ${ccEmail}` : null,
    replyTo ? `Reply-To: ${replyTo}` : null,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`
  ].filter(Boolean).join('\r\n');

  const plain = text || html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    plain,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const raw = headers + '\r\n\r\n' + body;
  return b64UrlEncode(raw);
}

function renderOrderHtml({ order, supplierEmail, user }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const rows = items.map((it) => `
    <tr>
      <td style="padding:8px;border:1px solid #eee;">${(it.item_name || it.item_id || '-')}</td>
      <td style="padding:8px;border:1px solid #eee; text-align:right;">${Number(it.quantity || 0)}</td>
      <td style="padding:8px;border:1px solid #eee;">${it.unit || ''}</td>
      <td style="padding:8px;border:1px solid #eee; text-align:right;">₪${Number(it.price || 0).toFixed(2)}</td>
      <td style="padding:8px;border:1px solid #eee; text-align:right;">₪${Number(it.total || (it.price || 0) * (it.quantity || 0)).toFixed(2)}</td>
    </tr>
  `).join('');

  const total = Number(order.total_cost || items.reduce((s, it) => s + (Number(it.total || 0)), 0) || 0).toFixed(2);
  const delivery = order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('he-IL') : '-';

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#0f172a;">
    <h2 style="margin:0 0 6px 0;">הזמנה חדשה ממסעדה: ${order.restaurant_name || (user?.business_name || user?.full_name || '')}</h2>
    <div style="color:#475569; margin-bottom:14px;">מס' הזמנה: <strong>${order.order_number || '—'}</strong></div>

    <div style="margin:14px 0; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
      <div><strong>לספק:</strong> ${order.supplier_name || ''} ${supplierEmail ? `&lt;${supplierEmail}&gt;` : ''}</div>
      <div><strong>תאריך אספקה מבוקש:</strong> ${delivery}</div>
      ${user?.business_address ? `<div><strong>כתובת המסעדה:</strong> ${user.business_address}</div>` : ''}
      ${user?.supply_receiving_contact ? `<div><strong>איש קשר לקבלה:</strong> ${user.supply_receiving_contact}${user?.supply_receiving_phone ? `, ${user.supply_receiving_phone}` : ''}</div>` : ''}
    </div>

    <table cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:14px; margin:14px 0;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px;border:1px solid #e2e8f0; text-align:right;">פריט</th>
          <th style="padding:8px;border:1px solid #e2e8f0; text-align:right;">כמות</th>
          <th style="padding:8px;border:1px solid #e2e8f0; text-align:right;">יחידה</th>
          <th style="padding:8px;border:1px solid #e2e8f0; text-align:right;">מחיר</th>
          <th style="padding:8px;border:1px solid #e2e8f0; text-align:right;">סה"כ</th>
        </tr>
      </thead>
      <tbody>${rows || ''}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="padding:10px;border:1px solid #e2e8f0; text-align:left;"><strong>סה"כ</strong></td>
          <td style="padding:10px;border:1px solid #e2e8f0; text-align:right;"><strong>₪${total}</strong></td>
        </tr>
      </tfoot>
    </table>

    ${order.notes ? `<div style=\"margin-top:12px; padding:10px; background:#fffbeb; border:1px solid #fde68a; border-radius:8px;\"><strong>הערות:</strong><br>${order.notes}</div>` : ''}

    <p style="margin-top:18px; color:#64748b; font-size:12px;">נשלח אוטומטית ממערכת Smart Plate basic. השיבו למייל זה לתקשורת עם המסעדה.</p>
  </div>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const orderId = payload.orderId || payload.order_id;
    if (!orderId) {
      return Response.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    const order = orders?.[0];
    if (!order) {
      return Response.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    let supplierEmail = order.supplier_email || '';
    if (!supplierEmail && order.supplier_id) {
      try {
        const sup = await base44.asServiceRole.entities.Supplier.filter({ id: order.supplier_id });
        supplierEmail = sup?.[0]?.email || '';
      } catch {}
    }
    if (!supplierEmail) {
      return Response.json({ success: false, error: 'Supplier email not set' }, { status: 400 });
    }

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    if (!accessToken) {
      return Response.json({ success: false, error: 'Gmail connector not authorized' }, { status: 500 });
    }

    const fromName = user.email_sender_name || user.business_name || user.full_name || 'Smart Plate basic';
    const replyTo = (user.reply_to_email || user.email || '').trim();

    const profResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!profResp.ok) {
      const txt = await profResp.text();
      return Response.json({ success: false, error: 'Failed to read Gmail profile', details: txt }, { status: 502 });
    }
    const profile = await profResp.json();
    const fromEmail = profile?.emailAddress || 'me';

    const subject = `Order ${order.order_number || ''} • ${order.supplier_name || ''} • ${user.business_name || user.full_name || 'Restaurant'}`.trim();
    const html = renderOrderHtml({ order, supplierEmail, user });

    const raw = buildEmail({
      fromName,
      fromEmail,
      toEmail: supplierEmail,
      ccEmail: user.email,
      replyTo,
      subject,
      html,
      text: undefined
    });

    const sendResp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    });

    if (!sendResp.ok) {
      const errTxt = await sendResp.text();
      return Response.json({ success: false, error: 'Gmail send failed', details: errTxt }, { status: 502 });
    }

    const data = await sendResp.json();
    return Response.json({ success: true, messageId: data?.id || null });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
});