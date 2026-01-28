import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

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

    // Generate a Hebrew invoice-like image using the Core image generator
    const prompt = `Create a clean, single-page invoice image in Hebrew (RTL). White background, black text.
Title: "חשבונית מס/קבלה" bold.
Header fields (right aligned):
- מספר חשבונית: 123456
- תאריך: 2026-01-28
- ספק: שוק מחנה יהודה
- ח.פ: 515555555

Items table (right aligned, with light row lines):
- טחינה גולמית 1 ק"ג | כמות: 3 | מחיר ליחידה: 24.90 | סה"כ: 74.70
- שמן זית כתית מעולה 750 מ"ל | כמות: 2 | מחיר ליחידה: 39.90 | סה"כ: 79.80
- מיץ לימון סחוט טבעי 1 ל' | כמות: 1 | מחיר ליחידה: 18.00 | סה"כ: 18.00
- כמון טחון 500 גרם | כמות: 1 | מחיר ליחידה: 14.90 | סה"כ: 14.90

Footer (right aligned):
- סה"כ ביניים: 187.40
- מע"מ (17%): 31.86
- סה"כ לתשלום: 219.26

Use crisp Hebrew fonts and keep the layout realistic.`;

    const imgRes = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt,
    });

    const imageUrl = imgRes?.url || imgRes?.data?.url || imgRes?.image_url;
    if (!imageUrl) {
      return Response.json({ error: 'Image generation failed' }, { status: 500 });
    }

    const fetchRes = await fetch(imageUrl);
    if (!fetchRes.ok) {
      return Response.json({ error: 'Failed to fetch generated image' }, { status: 502 });
    }
    const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
    const ab = await fetchRes.arrayBuffer();
    const b64 = arrayBufferToBase64(ab);
    const dataUrl = `data:${contentType};base64,${b64}`;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 24; // 24pt margin

    // Add image sized to fit within page while preserving aspect ratio
    // Assume image is portrait; compute size based on A4 minus margins
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    // jsPDF needs width/height; we don't know the image size — try full width and centered vertically
    // Most generated images are square-ish; fit to width and keep some top margin
    const imgW = maxW;
    const imgH = maxH; // fill available area

    doc.addImage(dataUrl, undefined, margin, margin, imgW, imgH);

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=hebrew_invoice_sample.pdf',
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});