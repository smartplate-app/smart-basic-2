import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Helper to call Google Drive API
async function driveRequest(accessToken, path, { method = 'GET', query = {}, headers = {}, body } = {}) {
  const url = new URL(`https://www.googleapis.com${path}`);
  Object.entries(query || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body instanceof Uint8Array || body instanceof ArrayBuffer || typeof body === 'string'
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body && !(body instanceof Uint8Array || body instanceof ArrayBuffer || typeof body === 'string')
      ? JSON.stringify(body)
      : body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Drive ${method} ${path} failed (${res.status}): ${txt}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await res.json();
  return await res.arrayBuffer();
}

async function findOrCreateFolder(accessToken, name, parentId = null) {
  // Try to find existing folder among app-created files
  try {
    const qParts = [
      `name = '${name.replace(/'/g, "\\'")}'`,
      "mimeType = 'application/vnd.google-apps.folder'",
      'trashed = false',
    ];
    if (parentId) qParts.push(`'${parentId}' in parents`);
    const q = qParts.join(' and ');
    const list = await driveRequest(accessToken, '/drive/v3/files', {
      query: { q, fields: 'files(id,name,webViewLink,parents)', spaces: 'drive' },
    });
    if (list?.files?.length) return list.files[0];
  } catch (_) {
    // If listing is not permitted under drive.file, ignore and create anew
  }
  // Create folder
  const meta = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) meta.parents = [parentId];
  const created = await driveRequest(accessToken, '/drive/v3/files', {
    method: 'POST',
    query: { fields: 'id,name,webViewLink' },
    body: meta,
  });
  return created;
}

function guessExtFromUrl(url) {
  try {
    const u = new URL(url);
    const pathname = u.pathname.toLowerCase();
    const m = pathname.match(/\.(jpg|jpeg|png|pdf|heic|webp)$/i);
    return m ? m[1].toLowerCase() : 'jpg';
  } catch {
    return 'jpg';
  }
}

function mimeFromExt(ext) {
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'pdf':
      return 'application/pdf';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return 'application/octet-stream';
  }
}

function sanitizeName(str) {
  return String(str || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function buildMultipartBody(metadata, fileBytes, mimeType) {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metaPart = new TextEncoder().encode(
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`
  );
  const fileHeader = new TextEncoder().encode(
    `${delimiter}Content-Type: ${mimeType}\r\n\r\n`
  );
  const closing = new TextEncoder().encode(closeDelim);

  // Concatenate parts
  const parts = [metaPart, fileHeader, new Uint8Array(fileBytes), closing];
  const totalLen = parts.reduce((s, p) => s + p.byteLength, 0);
  const out = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.byteLength; }

  const contentType = `multipart/related; boundary=${boundary}`;
  return { body: out, contentType };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { month, receipts } = await req.json();
    if (!month) return Response.json({ error: 'month is required (YYYY-MM)' }, { status: 400 });

    // Acquire Google Drive access token for this app/user
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    const me = user; // current logged-in user
    const root = await findOrCreateFolder(accessToken, 'SmartPlateUploads', null);
    const userFolderName = sanitizeName(me?.email || 'unknown-user');
    const userFolder = await findOrCreateFolder(accessToken, userFolderName, root.id);
    const parentFolderName = `Invoices-${month}`;
    const parent = await findOrCreateFolder(accessToken, parentFolderName, userFolder.id);

    // Build supplier groups from provided receipts
    const groups = {};
    for (const r of Array.isArray(receipts) ? receipts : []) {
      const sid = r.supplier_id || 'unknown';
      if (!groups[sid]) groups[sid] = { supplier_id: sid, supplier_name: r.supplier_name || 'Unknown', items: [] };
      groups[sid].items.push(r);
    }

    const perSupplier = {};
    let uploadedCount = 0;

    for (const [sid, group] of Object.entries(groups)) {
      const supplierFolderName = sanitizeName(group.supplier_name || sid);
      const sub = await findOrCreateFolder(accessToken, supplierFolderName, parent.id);
      let count = 0;

      for (const r of group.items) {
        const dateStr = (r.invoice_date || r.received_date || '').toString().slice(0, 10);
        const baseName = sanitizeName(`${dateStr || month}__${supplierFolderName}__INV-${r.invoice_number || 'NO-NUM'}__${r.id}`);
        const images = Array.isArray(r.receipt_images) ? r.receipt_images : [];
        for (let i = 0; i < images.length; i++) {
          const imgUrl = images[i];
          if (!imgUrl) continue;
          const ext = guessExtFromUrl(imgUrl);
          const mime = mimeFromExt(ext);
          const fileName = sanitizeName(`${baseName}__p${i + 1}.${ext}`);

          // Download image bytes
          const imgRes = await fetch(imgUrl);
          if (!imgRes.ok) continue;
          const bytes = await imgRes.arrayBuffer();

          // Upload
          const metadata = { name: fileName, parents: [sub.id] };
          const { body, contentType } = buildMultipartBody(metadata, bytes, mime);
          await driveRequest(accessToken, '/upload/drive/v3/files', {
            method: 'POST',
            query: { uploadType: 'multipart', fields: 'id,name,webViewLink' },
            headers: { 'Content-Type': contentType },
            body,
          });
          count += 1;
          uploadedCount += 1;
        }
      }
      perSupplier[sid] = { supplier_name: group.supplier_name, uploaded: count };
    }

    return Response.json({
      success: true,
      parentFolder: { id: parent.id, webViewLink: parent.webViewLink || null, name: parentFolderName },
      uploadedCount,
      perSupplier,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});