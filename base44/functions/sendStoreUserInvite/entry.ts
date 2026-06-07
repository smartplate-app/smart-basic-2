import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    const isHe = language === 'he';

    const roleText = role === 'manager'
      ? (isHe ? 'מנהל' : 'Manager')
      : role === 'viewer'
      ? (isHe ? 'צופה' : 'Viewer')
      : (isHe ? 'עובד' : 'Worker');

    const appUrl = Deno.env.get('PUBLIC_APP_URL') || req.headers.get('origin') || 'https://smartplate.app';
    const fromName = user.full_name || "Smart Plate";

    const subjectText = isHe
      ? `הזמנה להצטרף ל${storeName} כ${roleText}`
      : `You're invited to join ${storeName} as ${roleText}`;

    // Encode subject as RFC 2047 UTF-8 base64 (fixes Hebrew garble in Gmail)
    const encodeSubject = (str) => {
      const utf8 = new TextEncoder().encode(str);
      let binary = '';
      for (let i = 0; i < utf8.length; i++) binary += String.fromCharCode(utf8[i]);
      return `=?UTF-8?B?${btoa(binary)}?=`;
    };

    const htmlBody = isHe ? `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;direction:rtl;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#d4a373 0%,#b88c60 100%);padding:40px 40px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🍽️</div>
            <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0;letter-spacing:-0.5px;">Smart Plate</h1>
            <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">מערכת ניהול מסעדה חכמה</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1a1a1a;font-size:22px;font-weight:700;margin:0 0 8px;">שלום ${userName} 👋</h2>
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0 0 24px;">
              קיבלת הזמנה להצטרף ל<strong style="color:#d4a373;">${storeName}</strong> בתפקיד <strong>${roleText}</strong>.
            </p>

            <!-- Invite Box -->
            <div style="background:#fdf8f3;border:2px solid #d4a373;border-radius:10px;padding:24px;margin-bottom:28px;text-align:center;">
              <div style="font-size:36px;margin-bottom:12px;">🔑</div>
              <p style="color:#8c6b3e;font-size:14px;margin:0 0 6px;font-weight:600;">המסעדה שמחכה לך</p>
              <p style="color:#1a1a1a;font-size:20px;font-weight:700;margin:0;">${storeName}</p>
              <p style="color:#666;font-size:13px;margin:8px 0 0;">כ${roleText} עם גישה מלאה למערכת</p>
            </div>

            <!-- What you can do -->
            <div style="margin-bottom:28px;">
              <p style="color:#1a1a1a;font-size:15px;font-weight:700;margin:0 0 14px;">מה תוכל לעשות במערכת? ✨</p>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="background:#f9f9f9;border-radius:8px;padding:10px 14px;font-size:14px;color:#444;">📦 ניהול הזמנות מספקים</div>
                <div style="background:#f9f9f9;border-radius:8px;padding:10px 14px;font-size:14px;color:#444;">📋 קבלת סחורה ובדיקת חשבוניות</div>
                <div style="background:#f9f9f9;border-radius:8px;padding:10px 14px;font-size:14px;color:#444;">🏪 ניהול מלאי וספירות</div>
                <div style="background:#f9f9f9;border-radius:8px;padding:10px 14px;font-size:14px;color:#444;">📊 דוחות ולוח בקרה</div>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4a373 0%,#b88c60 100%);color:#ffffff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                כניסה למערכת ←
              </a>
              <p style="color:#888;font-size:12px;margin:12px 0 0;">יש להתחבר עם Google בעזרת כתובת האימייל הזו</p>
            </div>

            <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px;">
            <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">
              ההזמנה נשלחה על ידי <strong>${fromName}</strong> דרך מערכת Smart Plate
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9f5f0;padding:20px 40px;text-align:center;">
            <p style="color:#b88c60;font-size:13px;margin:0;font-weight:600;">Smart Plate 🍽️ — ניהול מסעדה חכם</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
` : `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#d4a373 0%,#b88c60 100%);padding:40px 40px 32px;text-align:center;">
            <div style="font-size:48px;margin-bottom:12px;">🍽️</div>
            <h1 style="color:#ffffff;font-size:26px;font-weight:700;margin:0;">Smart Plate</h1>
            <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">Smart Restaurant Management</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#1a1a1a;font-size:22px;font-weight:700;margin:0 0 8px;">Hello ${userName} 👋</h2>
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0 0 24px;">
              You've been invited to join <strong style="color:#d4a373;">${storeName}</strong> as <strong>${roleText}</strong>.
            </p>
            <div style="background:#fdf8f3;border:2px solid #d4a373;border-radius:10px;padding:24px;margin-bottom:28px;text-align:center;">
              <div style="font-size:36px;margin-bottom:12px;">🔑</div>
              <p style="color:#8c6b3e;font-size:14px;margin:0 0 6px;font-weight:600;">Your Restaurant</p>
              <p style="color:#1a1a1a;font-size:20px;font-weight:700;margin:0;">${storeName}</p>
              <p style="color:#666;font-size:13px;margin:8px 0 0;">as ${roleText} with full system access</p>
            </div>
            <div style="margin-bottom:28px;">
              <p style="color:#1a1a1a;font-size:15px;font-weight:700;margin:0 0 14px;">What you can do ✨</p>
              <div style="background:#f9f9f9;border-radius:8px;padding:10px 14px;font-size:14px;color:#444;margin-bottom:8px;">📦 Manage supplier orders</div>
              <div style="background:#f9f9f9;border-radius:8px;padding:10px 14px;font-size:14px;color:#444;margin-bottom:8px;">📋 Receive goods & verify invoices</div>
              <div style="background:#f9f9f9;border-radius:8px;padding:10px 14px;font-size:14px;color:#444;margin-bottom:8px;">🏪 Inventory management & counts</div>
              <div style="background:#f9f9f9;border-radius:8px;padding:10px 14px;font-size:14px;color:#444;">📊 Reports & dashboard</div>
            </div>
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4a373 0%,#b88c60 100%);color:#ffffff;font-size:16px;font-weight:700;padding:14px 36px;border-radius:8px;text-decoration:none;">
                Login to Smart Plate →
              </a>
              <p style="color:#888;font-size:12px;margin:12px 0 0;">Sign in with Google using this email address</p>
            </div>
            <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px;">
            <p style="color:#aaa;font-size:12px;text-align:center;margin:0;">Invite sent by <strong>${fromName}</strong> via Smart Plate</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9f5f0;padding:20px 40px;text-align:center;">
            <p style="color:#b88c60;font-size:13px;margin:0;font-weight:600;">Smart Plate 🍽️ — Smart Restaurant Management</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");

    // Build RFC 2822 MIME email with HTML and proper UTF-8 encoded subject
    const boundary = 'sp_boundary_' + Date.now();
    const encodedSubject = encodeSubject(subjectText);

    const message = [
      `From: ${fromName} <me>`,
      `To: ${userEmail}`,
      `Subject: ${encodedSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      ``
    ].join('\r\n');

    // Encode the full message (headers + HTML body) properly
    const htmlUtf8 = new TextEncoder().encode(htmlBody);
    let htmlBinary = '';
    for (let i = 0; i < htmlUtf8.length; i++) htmlBinary += String.fromCharCode(htmlUtf8[i]);
    const htmlB64 = btoa(htmlBinary);

    const fullMessage = message + htmlB64;

    // Base64url encode the full raw message
    const messageUtf8 = new TextEncoder().encode(fullMessage);
    let messageBinary = '';
    for (let i = 0; i < messageUtf8.length; i++) messageBinary += String.fromCharCode(messageUtf8[i]);
    const raw = btoa(messageBinary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

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