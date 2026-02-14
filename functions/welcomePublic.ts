import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL') || '';

// Simple HTML templates (bilingual)
function pageTemplate({ lang = 'he', success = false, error = '', values = {} }) {
  const isHe = lang === 'he';
  const dir = isHe ? 'rtl' : 'ltr';
  const t = (he, en) => (isHe ? he : en);
  const canonical = (PUBLIC_APP_URL ? `${PUBLIC_APP_URL}/functions/welcomePublic` : '/functions/welcomePublic');
  const pageUrl = isHe ? `${canonical}?lang=he` : `${canonical}?lang=en`;
  const otherUrl = isHe ? `${canonical}?lang=en` : `${canonical}?lang=he`;
  const metaDesc = t(
    'אפליקציה למסעדות ולענף המזון להזמנות מספקים, ווצאפ, סריקת חשבוניות, ניהול פריטים וסידור עבודה – כולל דשבורד חודשי לעלויות מזון וכוח אדם. Smart Plate basic – פתרון להזמנות בענף המסעדנות והמזון.',
    'App for restaurants and the food industry to order from suppliers, WhatsApp ordering, invoice scanning, item management and weekly scheduling – with a monthly dashboard for food and labor cost. Smart Plate basic – supplier ordering for restaurants.'
  );

  const {
    full_name = '',
    email = '',
    phone = '',
    business_name = '',
    message = ''
  } = values;

  const content = success
    ? `
    <div class="notice success">${t('תודה! הבקשה נשלחה ונחזור אליך בהקדם.', "Thanks! Your request was sent. We'll be in touch shortly.")}</div>
    <div class="actions">
      <a class="btn primary" href="/functions/welcomePublic?lang=${lang}">${t('חזרה לדף', 'Back to page')}</a>
    </div>
  `
    : `
    ${error ? `<div class="notice error">${error}</div>` : ''}
    <form method="POST" action="/functions/welcomePublic" class="form">
      <input type="hidden" name="lang" value="${lang}" />
      <div class="grid">
        <label>
          <span>${t('שם מלא', 'Full name')}</span>
          <input name="full_name" value="${escapeHtml(full_name)}" required />
        </label>
        <label>
          <span>${t('אימייל', 'Email')}</span>
          <input type="email" name="email" value="${escapeHtml(email)}" required />
        </label>
      </div>
      <div class="grid">
        <label>
          <span>${t('טלפון (לא חובה)', 'Phone (optional)')}</span>
          <input name="phone" value="${escapeHtml(phone)}" />
        </label>
        <label>
          <span>${t('שם עסק (לא חובה)', 'Business name (optional)')}</span>
          <input name="business_name" value="${escapeHtml(business_name)}" />
        </label>
      </div>
      <label>
        <span>${t('הערות (לא חובה)', 'Notes (optional)')}</span>
        <textarea name="message" rows="3">${escapeHtml(message)}</textarea>
      </label>
      <div class="actions">
        <button type="submit" class="btn primary">${t('שלח בקשה', 'Request access')}</button>
        <a class="btn" href="/#/pages/Welcome">${t('התחברות', 'Sign in')}</a>
      </div>
    </form>
  `;

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t('Smart Plate basic - בקשת גישה', 'Smart Plate basic - Request access')}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${pageUrl}" />
  <link rel="alternate" href="${canonical}?lang=he" hreflang="he-IL" />
  <link rel="alternate" href="${canonical}?lang=en" hreflang="en-US" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Smart Plate basic" />
  <meta property="og:title" content="${t('Smart Plate basic - בקשת גישה', 'Smart Plate basic - Request access')}" />
  <meta property="og:description" content="${escapeHtml(metaDesc)}" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:image" content="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t('Smart Plate basic - בקשת גישה', 'Smart Plate basic - Request access')}" />
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />
  <meta name="twitter:image" content="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" />
  <script type="application/ld+json">
  ${JSON.stringify({"@context":"https://schema.org","@type":"SoftwareApplication","name":"Smart Plate basic","applicationCategory":"BusinessApplication","operatingSystem":"Web"})}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify({"@context":"https://schema.org","@type":"Organization","name":"Smart Plate","url": canonical,"logo":"https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg","sameAs":["https://smartplate.org"]})}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify({"@context":"https://schema.org","@type":"WebSite","url": canonical,"name":"Smart Plate basic","potentialAction":{"@type":"SearchAction","target": `${canonical}?q={search_term_string}`,"query-input":"required name=search_term_string"}})}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify({"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"How can restaurants order from suppliers?","acceptedAnswer":{"@type":"Answer","text":"Use Smart Plate basic to create and send supplier orders via WhatsApp or email, track delivery dates and costs."}},{"@type":"Question","name":"Does it support the food industry?","acceptedAnswer":{"@type":"Answer","text":"Yes, it is purpose-built for restaurants and food businesses with items, invoices, and scheduling."}}]})}
  </script>
  <style>
    :root { --bg: #f8fafc; --card: #ffffff; --text: #0f172a; --muted:#64748b; --primary:#111827; --ring:#e5e7eb; --success:#16a34a; --error:#dc2626; }
    body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: linear-gradient(180deg, #f8fafc, #ffffff); color: var(--text); }
    .wrap { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
    .card { width:100%; max-width:860px; background:var(--card); border:1px solid var(--ring); border-radius:16px; box-shadow:0 10px 30px rgba(15,23,42,.08); padding:24px; }
    .brand { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
    .brand img { height:48px; object-fit:contain; }
    .title { font-size:28px; font-weight:800; margin:8px 0; }
    .desc { color: var(--text); opacity:.85; line-height:1.7; font-size:16px; margin-bottom:18px; }
    .email { display:block; font-weight:900; font-size:22px; color:#2563eb; text-decoration:none; margin:12px 0 22px; }
    .toolbar { display:flex; gap:8px; justify-content:flex-end; margin-bottom:8px; }
    .lang { color: var(--muted); font-size:12px; }
    .form { margin-top:8px; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
    label { display:flex; flex-direction:column; gap:6px; font-size:14px; color:var(--text); }
    input, textarea { border:1px solid var(--ring); border-radius:10px; padding:10px 12px; font-size:14px; outline:none; }
    input:focus, textarea:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.15); }
    .actions { display:flex; gap:12px; margin-top:16px; }
    .btn { appearance:none; border:1px solid var(--ring); background:#fff; color:var(--text); padding:10px 14px; border-radius:10px; text-decoration:none; font-weight:600; }
    .btn.primary { background: var(--primary); color:#fff; border-color: var(--primary); }
    .notice { padding:12px 14px; border-radius:10px; margin-bottom:12px; }
    .notice.success{ background:#ecfdf5; border:1px solid #86efac; color:#065f46; }
    .notice.error{ background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
    @media (max-width:720px) { .grid { grid-template-columns: 1fr; } .brand img { height:40px; } .title{font-size:24px;} }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="toolbar">
        <a class="lang" href="/functions/welcomePublic?lang=${isHe ? 'en' : 'he'}">${isHe ? 'English' : 'עברית'}</a>
      </div>
      <div class="brand">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dd24d1ee7388591074b22c/ea9fc4246_IMG_0004.jpeg" alt="Smart Plate" />
        <span style="opacity:.35;font-weight:700;font-size:24px;">+</span>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="height:48px;width:48px;border-radius:12px;background:linear-gradient(135deg,#111827,#273449);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:22px;">B</div>
          <div>
            <div style="font-weight:900;font-size:22px;line-height:1;">basic</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px;">${t('מאת Smart Plate', 'by Smart Plate')}</div>
          </div>
        </div>
      </div>

      <div class="title">Smart Plate basic</div>
      <p class="desc">
        ${t('המערכת הכי יעילה בישראל לביצוע הזמנות מספקים ויצירת סידור עבודה שבועי, הזמנות בווצאפ, סריקת חשבוניות, ומשלוח לרואה חשבון. דאשבורד חודשי שמראה לך בדיוק מה מצב עלויות כוח האדם והקניינות שלך מתחילת החודש והאם עברת 60% או לא. המערכת החכמה והיעילה בישראל.', 'The most efficient system for supplier orders and weekly staff scheduling, WhatsApp ordering, invoice scanning and export to your accountant. A monthly dashboard shows labor and food cost status from month start. The smart, efficient system for restaurants.')}
      </p>
      <a class="email" href="mailto:admin@smartplate.org">admin@smartplate.org</a>

      ${content}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function handlePost(req) {
  const contentType = req.headers.get('content-type') || '';
  let data = {};
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const form = await req.formData();
    data = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  } else if (contentType.includes('application/json')) {
    data = await req.json();
  }

  const lang = (data.lang === 'en') ? 'en' : 'he';
  const full_name = (data.full_name || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const business_name = (data.business_name || '').trim();
  const message = (data.message || '').trim();

  if (!full_name || !email) {
    const html = pageTemplate({ lang, success: false, error: (lang === 'he' ? 'נא למלא שם מלא ואימייל' : 'Please provide full name and email'), values: { full_name, email, phone, business_name, message } });
    return new Response(html, { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }

  try {
    const base44 = createClientFromRequest(req);

    const ua = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';

    await base44.asServiceRole.entities.AccessRequest.create({
      full_name,
      email,
      phone,
      business_name,
      message,
      page_url: referer || '/functions/welcomePublic',
      user_agent: ua
    });

    // Optional: notify admin by email (non-blocking)
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@smartplate.org',
        subject: `New access request: ${full_name}`,
        body: `Name: ${full_name}\nEmail: ${email}\nPhone: ${phone}\nBusiness: ${business_name}\nMessage: ${message}`,
      });
    } catch (_) {}

    const html = pageTemplate({ lang, success: true });
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch (error) {
    const html = pageTemplate({ lang, success: false, error: (lang === 'he' ? 'אירעה שגיאה בשליחת הבקשה' : 'Failed to submit request'), values: { full_name, email, phone, business_name, message } });
    return new Response(html, { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } });
  }
}

Deno.serve(async (req) => {
  try {
    const { method } = req;
    if (method === 'POST') {
      return await handlePost(req);
    }

    const url = new URL(req.url);
    const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'he';
    const html = pageTemplate({ lang });
    return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch (error) {
    return new Response('Internal Server Error', { status: 500 });
  }
});