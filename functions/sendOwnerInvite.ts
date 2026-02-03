import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();

    if (!me) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    // Admins should send owner invites
    if (me.role !== 'admin') {
      return Response.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Parse body robustly (JSON or form) and normalize fields
    let body = {};
    const contentType = req.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const form = await req.formData();
        body = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
      } else {
        // Try JSON anyway; if fails, treat as empty
        body = await req.json().catch(() => ({}));
      }
    } catch (_) {
      body = {};
    }

    const emailRaw = body.email || body.userEmail || body.to || body.recipient || '';
    const nameRaw = body.full_name || body.fullName || body.name || '';
    const language = (body.language === 'en') ? 'en' : 'he';

    const email = String(emailRaw).trim();
    let full_name = String(nameRaw).trim();
    if (!full_name && email) {
      full_name = email.split('@')[0]; // fallback name from email local-part
    }

    if (!email) {
      return Response.json({ success: false, error: 'Missing required field: email' }, { status: 400 });
    }

    // Grant this email access to the app so they can sign in immediately
    try {
      await base44.asServiceRole.auth.addAppUser(email);
    } catch (e) {
      // If already invited/added, ignore
      console.log('[sendOwnerInvite] addAppUser warning:', e?.message || e);
    }

    // Build login link (Google sign-in preferred) - force custom domain
    const preferredOrigin = Deno.env.get('PUBLIC_APP_URL') || 'https://smartplatebasic.com';
    const origin = preferredOrigin.replace(/\/$/, '');
    const loginUrl = `${origin}/functions/welcomePublic?lang=${language}`;

    // Prepare localized content
    const fromName = me.full_name || 'Smart Plate';
    // Subject always in English (ASCII-safe)
    const subject = `Invitation to join Smart Plate BASIC`;

    const dir = (language === 'he' || language === 'ar') ? 'rtl' : 'ltr';
    const strings = language === 'he' ? {
      greeting: `שלום ${full_name},`,
      line1: `הוזמנת להצטרף ל־Smart Plate BASIC כבעלים.`,
      cta: 'התחילו עכשיו',
      after: 'לאחר ההתחברות תוכלו להגדיר את פרטי העסק ולהתחיל לעבוד.',
      regards: 'בברכה,',
      brand: fromName
    } : {
      greeting: `Hello ${full_name},`,
      line1: `You've been invited to join Smart Plate BASIC as an owner.`,
      cta: 'Get started',
      after: 'After signing in you can set up your business details and get started.',
      regards: 'Best regards,',
      brand: fromName
    };
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg';
    const htmlBody = `<!doctype html>
<html lang="${language}" dir="${dir}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${subject}</title>
</head>
<body style="margin:0;background:#f6f8fb;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;direction:${dir};text-align:${dir==='rtl'?'right':'left'};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f8fb;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:640px;background:#ffffff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,0.05);overflow:hidden" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background:linear-gradient(135deg,#111827,#334155);padding:24px;text-align:center;">
              <img src="${logoUrl}" alt="Smart Plate" style="height:56px;object-fit:contain;display:inline-block" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;color:#0f172a;font-size:18px;line-height:1.6;">${strings.greeting}</td>
          </tr>
          <tr>
            <td style="padding:8px 28px;color:#334155;font-size:16px;line-height:1.7;">${strings.line1}</td>
          </tr>
          <tr>
            <td style="padding:20px 28px;text-align:${dir==='rtl'?'left':'right'};">
              <a href="${loginUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">${strings.cta}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px 28px;color:#334155;font-size:14px;line-height:1.7;">${strings.after}</td>
          </tr>
          <tr>
            <td style="padding:0 28px 32px 28px;color:#64748b;font-size:13px;">${strings.regards}<br/>${strings.brand}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // RFC 2047 encode headers for non-ASCII characters (e.g., Hebrew)
    const toBase64 = (str) => {
      const utf8 = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
      return btoa(binary); // standard Base64
    };
    const encodeWord = (str) => `=?UTF-8?B?${toBase64(str)}?=`;
    const fromHeaderName = /[^\x00-\x7F]/.test(fromName) ? encodeWord(fromName) : fromName;
    const subjectHeader = `Subject: ${encodeWord(subject)}`;

    // Send via Gmail connector
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    const rawMessage =
`From: ${fromHeaderName} <me>\n` +
`To: ${full_name} <${email}>\n` +
`${subjectHeader}\n` +
`MIME-Version: 1.0\n` +
`Content-Type: text/html; charset=UTF-8\n` +
`Content-Transfer-Encoding: 8bit\n` +
`Content-Language: ${language}\n` +
`\n` +
`${htmlBody}`;

    // base64url encode
    const base64Url = (str) => {
      const utf8 = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
      let b64 = btoa(binary);
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const raw = base64Url(rawMessage);

    const resp = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return Response.json({ success: false, error: `Gmail send failed: ${errText}` }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[sendOwnerInvite] Error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to send invite' }, { status: 500 });
  }
});