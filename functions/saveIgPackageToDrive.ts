import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function driveFetch(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Drive error ${res.status}: ${text}`);
  }
  return res;
}

function buildMultipart(metadata, mediaBytes, mediaMime) {
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;
  const metaPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `Content-Type: ${mediaMime}\r\n\r\n`;
  const preamble = new TextEncoder().encode(delimiter + metaPart + delimiter + mediaHeader);
  const closure = new TextEncoder().encode(closeDelim);
  const uints = new Uint8Array(preamble.length + mediaBytes.length + closure.length);
  uints.set(preamble, 0);
  uints.set(mediaBytes, preamble.length);
  uints.set(closure, preamble.length + mediaBytes.length);
  return { body: uints, boundary };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const igType = body.igType || 'post';
    const igResult = body.igResult || {};
    const coverUrl = body.coverUrl || '';
    const topics = Array.isArray(body.topics) ? body.topics : [];
    const suggestions = body.suggestions || null;

    const token = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // 1) Create package folder
    const now = new Date();
    const folderName = `SmartPlate IG Package - ${igType} - ${now.toISOString().slice(0, 19).replace('T',' ')}`;
    const folderMeta = { name: folderName, mimeType: 'application/vnd.google-apps.folder' };
    const createFolderRes = await driveFetch(token, 'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folderMeta)
    });
    const folder = await createFolderRes.json();

    // 2) Share folder with the current user (or configured drive_share_email)
    const shareEmail = (user.drive_share_email || user.email || '').trim();
    if (shareEmail) {
      await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${folder.id}/permissions?sendNotificationEmail=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: shareEmail })
      });
    }

    const files = [];

    // Helper to upload a text file
    const uploadText = async (name, content) => {
      const meta = { name, parents: [folder.id] };
      const bytes = new TextEncoder().encode(content);
      const { body: mpBody, boundary } = buildMultipart(meta, bytes, 'text/plain; charset=utf-8');
      const res = await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: mpBody
      });
      const json = await res.json();
      files.push(json);
    };

    // Build HE/EN caption texts
    const g = igResult?.generated || {};
    const mkText = (lang) => {
      const part = g?.[lang] || {};
      const lines = [];
      if (part.title) lines.push(part.title);
      if (part.caption) lines.push(part.caption);
      if (Array.isArray(part.hashtags)) lines.push(part.hashtags.join(' '));
      if (igType === 'reel' && part.voiceover_script) lines.push('\nVOICEOVER:\n' + part.voiceover_script);
      if (igType === 'reel' && Array.isArray(part.shot_list)) lines.push('\nSHOT LIST:\n- ' + part.shot_list.join('\n- '));
      if (topics.length) lines.push(`\nTopics: ${topics.join(', ')}`);
      return lines.filter(Boolean).join('\n\n');
    };

    const heText = mkText('he');
    const enText = mkText('en');
    if (heText) await uploadText(`smartplate_${igType}_he.txt`, heText);
    if (enText) await uploadText(`smartplate_${igType}_en.txt`, enText);

    // 3) Download and upload cover image if provided
    if (coverUrl) {
      const imgRes = await fetch(coverUrl);
      if (imgRes.ok) {
        const buf = new Uint8Array(await imgRes.arrayBuffer());
        const meta = { name: `smartplate_${igType}_cover.jpg`, parents: [folder.id] };
        const { body: mpBody, boundary } = buildMultipart(meta, buf, imgRes.headers.get('content-type') || 'image/jpeg');
        const up = await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
          method: 'POST',
          headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
          body: mpBody
        });
        files.push(await up.json());
      }
    }

    // 4) Optional: upload suggestions summary
    if (suggestions && (Array.isArray(suggestions.he) || Array.isArray(suggestions.en))) {
      const he = (suggestions.he || []).map((s, i) => `${i+1}. ${s}`).join('\n');
      const en = (suggestions.en || []).map((s, i) => `${i+1}. ${s}`).join('\n');
      const txt = `HEBREW\n${he}\n\nENGLISH\n${en}`;
      await uploadText('smartplate_suggestions.txt', txt);
    }

    return Response.json({ success: true, folder, files });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});