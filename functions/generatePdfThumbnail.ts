import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const pdfUrl = body?.pdf_url || body?.pdfUrl;
    const size = Math.max(64, Math.min(Number(body?.size || 256), 1024));
    if (!pdfUrl) return Response.json({ error: 'pdf_url is required' }, { status: 400 });

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // 1) Download PDF bytes
    const pdfResp = await fetch(pdfUrl);
    if (!pdfResp.ok) throw new Error(`Failed to fetch PDF (${pdfResp.status})`);
    const pdfBuf = await pdfResp.arrayBuffer();

    // 2) Upload to Google Drive (multipart)
    const metadata = { name: `b44-thumb-${Date.now()}.pdf`, mimeType: 'application/pdf' };
    const boundary = 'b44-' + crypto.randomUUID();
    const delimiter = `--${boundary}`;
    const closeDelim = `--${boundary}--`;

    const metaPart =
      `${delimiter}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + '\r\n';

    const fileHeader = `${delimiter}\r\nContent-Type: application/pdf\r\n\r\n`;

    const metaBytes = new TextEncoder().encode(metaPart);
    const fileHeaderBytes = new TextEncoder().encode(fileHeader);
    const closeBytes = new TextEncoder().encode(`\r\n${closeDelim}`);

    const multipartBytes = new Uint8Array(metaBytes.length + fileHeaderBytes.length + pdfBuf.byteLength + closeBytes.length);
    multipartBytes.set(metaBytes, 0);
    multipartBytes.set(fileHeaderBytes, metaBytes.length);
    multipartBytes.set(new Uint8Array(pdfBuf), metaBytes.length + fileHeaderBytes.length);
    multipartBytes.set(closeBytes, metaBytes.length + fileHeaderBytes.length + pdfBuf.byteLength);

    const uploadResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBytes,
    });
    if (!uploadResp.ok) {
      const txt = await uploadResp.text();
      throw new Error(`Drive upload failed: ${uploadResp.status} ${txt}`);
    }
    const uploaded = await uploadResp.json();
    const fileId = uploaded.id;

    // 3) Poll thumbnailLink
    let thumbLink = null;
    for (let i = 0; i < 6; i++) {
      const metaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=thumbnailLink`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!metaResp.ok) throw new Error(`Drive get failed: ${metaResp.status}`);
      const meta = await metaResp.json();
      thumbLink = meta.thumbnailLink || null;
      if (thumbLink) break;
      await sleep(500);
    }
    if (!thumbLink) throw new Error('Thumbnail not ready');

    // adjust size param
    if (/=s\d+$/i.test(thumbLink)) {
      thumbLink = thumbLink.replace(/=s\d+$/i, `=s${size}`);
    } else {
      thumbLink += `=s${size}`;
    }

    // 4) Fetch thumbnail bytes
    const imgResp = await fetch(thumbLink, { headers: { 'Authorization': `Bearer ${accessToken}` } });
    if (!imgResp.ok) throw new Error(`Fetch thumbnail failed: ${imgResp.status}`);
    const imgBuf = await imgResp.arrayBuffer();

    // 5) Cleanup file (best effort)
    try { await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${accessToken}` }}); } catch {}

    const b64 = arrayBufferToBase64(imgBuf);
    return Response.json({ success: true, data_url: `data:image/jpeg;base64,${b64}` });
  } catch (error) {
    return Response.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
});