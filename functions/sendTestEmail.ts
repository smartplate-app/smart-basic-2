import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function base64UrlEncode(str) {
  const utf8 = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
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
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const to = (body?.to || '').toString().trim();
    const ccMe = Boolean(body?.cc_me);
    const subject = body?.subject || 'Smart Plate basic — Test order email';

    if (!to || !to.includes('@')) {
      return Response.json({ error: 'Valid "to" address is required' }, { status: 400 });
    }

    // Gmail access token via connector (already authorized)
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    if (!accessToken) {
      return Response.json({ error: 'Gmail connector not authorized' }, { status: 500 });
    }

    // Identify sender Gmail address for proper From header
    let senderEmail = '';
    try {
      const prof = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const p = await prof.json();
      senderEmail = p?.emailAddress || '';
    } catch (_) {}

    const adminEmail = 'admin@smartplate.org';
    const replyTo = user.email || 'no-reply@smartplate.org';
    const fromDisplay = 'Smart Plate basic';

    // Simple test content (plain + HTML) to satisfy strict MTAs
    const html = `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:16px;">
      <div style="max-width:660px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <div style="background:#111827;color:#fff;padding:14px 18px;font-weight:700;">Smart Plate basic</div>
        <div style="padding:18px;">
          <p style="margin:0 0 10px 0;">This is a test order email to validate delivery to Microsoft/Exchange mailboxes.</p>
          <ul style="margin:8px 0 0 18px;color:#374151;">
            <li>Date: ${new Date().toISOString()}</li>
            <li>Recipient: ${to}</li>
            <li>Sender: ${senderEmail || replyTo}</li>
          </ul>
          <p style="margin:14px 0 0 0;color:#6b7280;font-size:12px;">Please reply to confirm receipt.</p>
        </div>
      </div>
    </body></html>`;

    const text = `Smart Plate basic test mail\n\nThis is a test order email to validate delivery to Microsoft/Exchange.\nDate: ${new Date().toISOString()}\nRecipient: ${to}\nSender: ${senderEmail || replyTo}\n\nPlease reply to confirm receipt.`;

    const boundary = 'b44_boundary_' + Math.random().toString(36).slice(2);

    const sendOne = async (rcpt) => {
      const headers = [
        `From: ${fromDisplay} <${senderEmail || replyTo || 'no-reply@smartplate.org'}>`,
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
        return { to: rcpt, ok: false, error: await resp.text() };
      }
      const data = await resp.json();
      return { to: rcpt, ok: true, id: data?.id || null };
    };

    const results = [];
    // Primary target (Microsoft mailbox)
    results.push(await sendOne(to));
    // Separate copy to admin (not CC) to avoid affecting external deliverability
    results.push(await sendOne(adminEmail));
    // Optional copy to current user for visibility
    if (ccMe && user.email && user.email !== adminEmail && user.email !== to) {
      results.push(await sendOne(user.email));
    }

    const anyOk = results.some(r => r.ok);
    return Response.json({ success: anyOk, results });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});