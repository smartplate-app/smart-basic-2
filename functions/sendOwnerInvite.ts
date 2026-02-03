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

    const { email, full_name, restaurant_name, language = 'he' } = await req.json();

    if (!email || !full_name || !restaurant_name) {
      return Response.json({ success: false, error: 'Missing required fields (email, full_name, restaurant_name)' }, { status: 400 });
    }

    // Grant this email access to the app so they can sign in immediately
    try {
      await base44.asServiceRole.auth.addAppUser(email);
    } catch (e) {
      // If already invited/added, ignore
      console.log('[sendOwnerInvite] addAppUser warning:', e?.message || e);
    }

    // Build login link (Google sign-in preferred)
    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const next = encodeURIComponent(`${origin}/#/pages/Welcome`);
    const loginUrl = `${origin}/auth/login?provider=google&next=${next}`;

    // Prepare localized content
    const fromName = me.full_name || 'Smart Plate';
    const subject = language === 'he'
      ? `הזמנה להצטרף כבעלים ל${restaurant_name}`
      : `Invitation to join as owner at ${restaurant_name}`;

    const bodyText = language === 'he'
      ? `שלום ${full_name},\n\nהוזמנת לפתוח חשבון כבעלים באפליקציה עבור \"${restaurant_name}\".\n\nכניסה מהירה עם Google:\n${loginUrl}\n\nלאחר ההתחברות תוכל/י להגדיר את פרטי העסק ולהתחיל לעבוד.\n\nבברכה,\n${fromName}`
      : `Hello ${full_name},\n\nYou've been invited to create an owner account for \"${restaurant_name}\".\n\nQuick sign-in with Google:\n${loginUrl}\n\nAfter signing in you can set up your business details and get started.\n\nBest regards,\n${fromName}`;

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
`Content-Type: text/plain; charset=UTF-8\n` +
`Content-Transfer-Encoding: 8bit\n` +
`Content-Language: ${language}\n` +
`\n` +
`${bodyText}`;

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