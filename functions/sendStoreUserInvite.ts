import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail, userName, storeName, role, language } = await req.json();
    
    if (!userEmail || !userName || !storeName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const roleText = role === 'manager'
      ? (language === 'he' ? 'מנהל' : 'Manager')
      : role === 'viewer'
      ? (language === 'he' ? 'צופה' : 'Viewer')
      : (language === 'he' ? 'עובד' : 'Worker');

    const appUrl = req.headers.get('origin') || 'https://app.base44.com';

    // Send email via Gmail connector (from the app owner's Gmail)
    const accessToken = await base44.asServiceRole.connectors.getAccessToken("gmail");
    const fromName = user.full_name || "Smart Plate";
    const subject = language === 'he' ? `הזמנה להצטרף ל${storeName}` : `Invitation to join ${storeName}`;
    const textBody = language === 'he'
      ? `שלום ${userName},\n\nהוזמנת להצטרף ל${storeName} כ${roleText}.\n\nלהתחברות למערכת: ${appUrl}\n\nבברכה,\n${fromName}`
      : `Hello ${userName},\n\nYou have been invited to join ${storeName} as a ${roleText}.\n\nTo login: ${appUrl}\n\nBest regards,\n${fromName}`;

    const message =
`From: ${fromName} <me>
To: ${userName} <${userEmail}>
Subject: ${subject}
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8

${textBody}`;

    const base64Url = (str) => {
      const utf8 = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
      let b64 = btoa(binary);
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const raw = base64Url(message);

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
      return Response.json({ error: `Gmail send failed: ${errText}` }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error sending invite:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});