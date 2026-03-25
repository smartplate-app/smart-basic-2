import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function dropboxRequest(accessToken, path, { method = 'POST', headers = {}, body, isContent = false } = {}) {
  const domain = isContent ? 'content.dropboxapi.com' : 'api.dropboxapi.com';
  const url = `https://${domain}${path}`;
  
  const res = await fetch(url, {
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
    throw new Error(`Dropbox ${method} ${path} failed (${res.status}): ${txt}`);
  }
  
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await res.json();
  return await res.text();
}

async function findOrCreateFolder(accessToken, path) {
  try {
    const res = await dropboxRequest(accessToken, '/2/files/create_folder_v2', {
      body: { path, autorename: false }
    });
    return res.metadata;
  } catch (err) {
    if (err.message.includes('path/conflict')) {
      // Folder already exists
      return { path_display: path };
    }
    throw err;
  }
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

function sanitizeName(str) {
  return String(str || '')
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { month, receipts, targetEmail } = await req.json();
    if (!month) return Response.json({ error: 'month is required (YYYY-MM)' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('dropbox');

    const me = user;
    const targetUserEmail = (targetEmail || me?.acting_as_store_email || me?.acting_as_user_email || me?.email || 'unknown-user');
    
    // Dropbox paths must start with a slash and not end with a slash
    const basePath = `/SmartPlateUploads/${sanitizeName(targetUserEmail)}/Invoices-${month}`;
    
    // Create base folders sequentially
    await findOrCreateFolder(accessToken, '/SmartPlateUploads');
    await findOrCreateFolder(accessToken, `/SmartPlateUploads/${sanitizeName(targetUserEmail)}`);
    const parentFolder = await findOrCreateFolder(accessToken, basePath);

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
      const supplierPath = `${basePath}/${supplierFolderName}`;
      await findOrCreateFolder(accessToken, supplierPath);
      
      let count = 0;

      for (const r of group.items) {
        const dateStr = (r.invoice_date || r.received_date || '').toString().slice(0, 10);
        const baseName = sanitizeName(`${dateStr || month}__${supplierFolderName}__INV-${r.invoice_number || 'NO-NUM'}__${r.id}`);
        const images = Array.isArray(r.receipt_images) ? r.receipt_images : [];
        
        for (let i = 0; i < images.length; i++) {
          const imgUrl = images[i];
          if (!imgUrl) continue;
          const ext = guessExtFromUrl(imgUrl);
          const fileName = sanitizeName(`${baseName}__p${i + 1}.${ext}`);
          const filePath = `${supplierPath}/${fileName}`;

          const imgRes = await fetch(imgUrl);
          if (!imgRes.ok) continue;
          const bytes = await imgRes.arrayBuffer();

          await dropboxRequest(accessToken, '/2/files/upload', {
            isContent: true,
            headers: {
              'Dropbox-API-Arg': JSON.stringify({
                path: filePath,
                mode: 'add',
                autorename: true,
                mute: false,
                strict_conflict: false
              }),
              'Content-Type': 'application/octet-stream'
            },
            body: bytes
          });
          
          count += 1;
          uploadedCount += 1;
        }
      }
      perSupplier[sid] = { supplier_name: group.supplier_name, uploaded: count };
    }

    return Response.json({
      success: true,
      parentFolder: { path: parentFolder.path_display, name: `Invoices-${month}` },
      uploadedCount,
      perSupplier,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});