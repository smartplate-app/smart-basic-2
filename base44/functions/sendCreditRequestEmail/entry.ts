import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

function base64UrlEncode(str) {
  const utf8 = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8.length; i++) {
    binary += String.fromCharCode(utf8[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { to, rawSubject, text, html } = body;
    
    if (!to) return Response.json({ error: 'Recipient (to) is required' }, { status: 400 });

    const utf8Subject = new TextEncoder().encode(rawSubject || 'Credit Request');
    let binarySubject = '';
    for (let i = 0; i < utf8Subject.length; i++) {
      binarySubject += String.fromCharCode(utf8Subject[i]);
    }
    const encodedSubject = `=?utf-8?B?${btoa(binarySubject)}?=`;

    const adminCc = 'admin@smartplate.org';
    const replyTo = user.email || 'no-reply@smartplate.org';
    const fromDisplay = 'Smart Plate basic';

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
            `Subject: ${encodedSubject}`,
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
            subject: rawSubject,
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
    results.push(await sendTo(to));
    if (to.toLowerCase() !== adminCc.toLowerCase()) {
      results.push(await sendTo(adminCc));
    }

    const anyOk = results.some(r => r.ok);
    if (!anyOk) {
      return Response.json({ success: false, results }, { status: 500 });
    }
    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});