import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Use Google Drive connector (already authorized) to create a Google Doc from HTML and export as PDF
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    const now = new Date();
    const name = `Hebrew_Invoice_Sample_${now.toISOString().slice(0,10)}.doc`;

    const html = `<!doctype html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, Helvetica, 'Noto Sans Hebrew', sans-serif; direction: rtl; margin: 36pt; }
    .title { font-weight: 700; font-size: 20pt; text-align: right; margin-bottom: 8pt; }
    .meta { text-align: right; font-size: 11pt; line-height: 1.5; margin-bottom: 12pt; }
    table { width: 100%; border-collapse: collapse; direction: rtl; }
    th, td { border: 1px solid #ddd; padding: 6pt 8pt; text-align: right; font-size: 11pt; }
    th { background: #f3f4f6; }
    .totals { margin-top: 12pt; width: 50%; float: left; }
    .totals td { border: none; padding: 4pt 0; font-size: 12pt; }
    .bold { font-weight: 700; }
  </style>
</head>
<body>
  <div class="title">חשבונית מס/קבלה</div>
  <div class="meta">
    <div>מספר חשבונית: <span class="bold">123456</span></div>
    <div>תאריך: <span class="bold">${now.toISOString().slice(0,10)}</span></div>
    <div>ספק: <span class="bold">שוק מחנה יהודה</span></div>
    <div>ח.פ: <span class="bold">515555555</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>שם פריט</th>
        <th>כמות</th>
        <th>מחיר ליחידה</th>
        <th>סה"כ</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>טחינה גולמית 1 ק"ג</td>
        <td>3</td>
        <td>24.90</td>
        <td>74.70</td>
      </tr>
      <tr>
        <td>שמן זית כתית מעולה 750 מ"ל</td>
        <td>2</td>
        <td>39.90</td>
        <td>79.80</td>
      </tr>
      <tr>
        <td>מיץ לימון סחוט טבעי 1 ל'</td>
        <td>1</td>
        <td>18.00</td>
        <td>18.00</td>
      </tr>
      <tr>
        <td>כמון טחון 500 גרם</td>
        <td>1</td>
        <td>14.90</td>
        <td>14.90</td>
      </tr>
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>סה"כ ביניים:</td>
      <td class="bold">187.40</td>
    </tr>
    <tr>
      <td>מע"מ (17%):</td>
      <td class="bold">31.86</td>
    </tr>
    <tr>
      <td>סה"כ לתשלום:</td>
      <td class="bold">219.26</td>
    </tr>
  </table>
</body>
</html>`;

    // Create a Google Doc from the HTML (Drive conversion)
    const boundary = 'b44-' + Math.random().toString(16).slice(2);
    const metadata = JSON.stringify({ name, mimeType: 'application/vnd.google-apps.document' });
    const multipartBody =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadata + '\r\n' +
      `--${boundary}\r\n` +
      'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
      html + '\r\n' +
      `--${boundary}--`;

    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!createRes.ok) {
      const txt = await createRes.text();
      return Response.json({ error: 'Drive create failed', details: txt }, { status: 502 });
    }

    const created = await createRes.json();
    const fileId = created.id;

    // Export the Google Doc as PDF
    const exportRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!exportRes.ok) {
      const txt = await exportRes.text();
      return Response.json({ error: 'Drive export failed', details: txt }, { status: 502 });
    }

    const pdfBytes = await exportRes.arrayBuffer();

    // Optional cleanup: delete the temporary doc
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
    } catch { /* ignore cleanup errors */ }

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=hebrew-invoice-sample.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});