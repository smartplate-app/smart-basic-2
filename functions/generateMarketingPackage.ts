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
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const topics = Array.isArray(body.topics) && body.topics.length ? body.topics : ['smart plate app', 'inventory & orders', 'weekly schedule'];
    const reelFrames = Math.min(Math.max(parseInt(body.reel_frames || 6, 10), 4), 10);
    const storiesCount = Math.min(Math.max(parseInt(body.stories_count || 3, 10), 1), 10);

    // 1) Ask LLM to design bilingual package (mostly EN, some HE)
    const schema = {
      type: 'object',
      properties: {
        reel: {
          type: 'object',
          properties: {
            caption_en: { type: 'string' },
            caption_he: { type: 'string' },
            voiceover_en: { type: 'string' },
            voiceover_he: { type: 'string' },
            hashtags_en: { type: 'array', items: { type: 'string' } },
            hashtags_he: { type: 'array', items: { type: 'string' } },
            slides: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text_en: { type: 'string' },
                  text_he: { type: 'string' },
                  prompt: { type: 'string' },
                  duration_sec: { type: 'number' }
                },
                required: ['text_en', 'prompt']
              }
            }
          },
          required: ['slides']
        },
        stories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title_en: { type: 'string' },
              title_he: { type: 'string' },
              body_en: { type: 'string' },
              body_he: { type: 'string' },
              cta_en: { type: 'string' },
              cta_he: { type: 'string' },
              prompt: { type: 'string' }
            },
            required: ['title_en', 'body_en']
          }
        }
      },
      required: ['reel', 'stories']
    };

    const prompt = `You are a marketing creative.
Create a bilingual social package for a product called "SmartPlate Basic" (restaurant operations app).
- Deliver 1 vertical reel storyboard with ${reelFrames} slides (mostly English on-screen text, add a few Hebrew words where natural), plus voiceover scripts (EN + HE), captions and hashtags.
- Deliver ${storiesCount} Instagram Stories (1080x1920) concepts with concise text (EN primary, HE secondary), and an image prompt per story.
- Design principles: clean, minimal, readable, bold typography, white background, brand accents (purple/blue), restaurant ops iconography (calendar, box, wifi, checklist).
- Ensure on-screen EN text is under 8 words; add small HE where appropriate.
- Topics: ${topics.join(', ')}
Return JSON per schema.`;

    const design = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema });

    // 2) Create Drive folder structure
    const token = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    const now = new Date();
    const rootName = `SmartPlate Marketing ${now.toISOString().slice(0,10)} ${now.toISOString().slice(11,19).replace(/:/g,'-')}`;
    const createFolder = async (name, parentId) => {
      const meta = parentId ? { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] } : { name, mimeType: 'application/vnd.google-apps.folder' };
      const r = await driveFetch(token, 'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(meta)
      });
      return r.json();
    };
    const root = await createFolder(rootName);

    // Share to user's email (or drive_share_email)
    const shareEmail = (me.drive_share_email || me.email || '').trim();
    if (shareEmail) {
      await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${root.id}/permissions?sendNotificationEmail=false`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: shareEmail })
      });
    }

    const reelFolder = await createFolder('reel', root.id);
    const storiesFolder = await createFolder('stories', root.id);
    const textFolder = await createFolder('text_assets', root.id);

    const uploadText = async (parentId, name, content) => {
      const meta = { name, parents: [parentId] };
      const bytes = new TextEncoder().encode(String(content || ''));
      const { body: mpBody, boundary } = buildMultipart(meta, bytes, 'text/plain; charset=utf-8');
      const res = await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: mpBody
      });
      return res.json();
    };

    const uploadImageFromUrl = async (parentId, name, urlHint, promptText) => {
      // Prefer provided urlHint; otherwise try generating placeholder solid background
      let imgBytes;
      let mime = 'image/jpeg';
      if (urlHint) {
        const r = await fetch(urlHint);
        if (!r.ok) throw new Error('Image fetch failed');
        const ab = await r.arrayBuffer();
        imgBytes = new Uint8Array(ab);
        mime = r.headers.get('content-type') || 'image/jpeg';
      } else {
        // Should not happen in normal flow
        imgBytes = new Uint8Array([]);
      }
      const meta = { name, parents: [parentId], description: promptText || '' };
      const { body: mpBody, boundary } = buildMultipart(meta, imgBytes, mime);
      const res = await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: mpBody
      });
      return res.json();
    };

    const uploadBinary = async (parentId, name, bytes, mime, desc='') => {
      const meta = { name, parents: [parentId], description: desc };
      const { body: mpBody, boundary } = buildMultipart(meta, bytes, mime);
      const res = await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
        method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: mpBody
      });
      return res.json();
    };

    const generateImageWithTimeout = async (prompt, ms = 45000) => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), ms);
      try {
        const { url } = await base44.integrations.Core.GenerateImage({ prompt });
        return url;
      } finally {
        clearTimeout(t);
      }
    };

    const svgPlaceholder = (en='', he='') => (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">`+
      `<rect width="100%" height="100%" fill="white"/>`+
      `<rect x="0" y="0" width="100%" height="96" fill="#ede9fe"/>`+
      `<text x="50%" y="160" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="48" fill="#312e81">SmartPlate Basic</text>`+
      `<foreignObject x="100" y="320" width="880" height="400">`+
      `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, Helvetica, sans-serif; color:#111827; font-size:40px; text-align:center;">`+
      `<div style="font-weight:700; margin-bottom:20px;">${en || ''}</div>`+
      `<div style="font-size:32px; color:#4b5563;">${he || ''}</div>`+
      `</div></foreignObject>`+
      `</svg>`
    );

    const runWithConcurrency = async (tasks, limit = 2) => {
      const results = [];
      let i = 0;
      const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => (async () => {
        for (;;) {
          let idx;
          if (i >= tasks.length) break;
          idx = i++;
          try { results[idx] = await tasks[idx](); } catch (e) { results[idx] = { error: e?.message || String(e) }; }
        }
      })());
      await Promise.all(workers);
      return results;
    };

    const previews = { reel: [], stories: [] };

    // 3) Generate images with Core.GenerateImage
    // Reel slides
    const reelSlides = (design?.reel?.slides || []).slice(0, reelFrames);
    const reelUploads = new Array(reelSlides.length);
    const reelTasks = reelSlides.map((s, i) => async () => {
      try {
        const imgPrompt = `Vertical 1080x1920, clean white background, bold modern typography area, brand accents (purple/blue), subtle restaurant ops icons. Do not include detailed photoreal faces. ${s.prompt || ''}`;
        const url = await generateImageWithTimeout(imgPrompt, 60000);
        previews.reel[i] = url;
        const up = await uploadImageFromUrl(reelFolder.id, `reel_${String(i+1).padStart(2,'0')}.jpg`, url, `EN: ${s.text_en || ''} | HE: ${s.text_he || ''}`);
        reelUploads[i] = up;
      } catch (e) {
        const svg = svgPlaceholder(s?.text_en || '', s?.text_he || '');
        const bytes = new TextEncoder().encode(svg);
        const up = await uploadBinary(reelFolder.id, `reel_${String(i+1).padStart(2,'0')}.svg`, bytes, 'image/svg+xml', 'Placeholder slide');
        reelUploads[i] = up;
      }
    });
    await runWithConcurrency(reelTasks, 3);

    // Stories
    const stories = (design?.stories || []).slice(0, storiesCount);
    const storyUploads = new Array(stories.length);
    const storyTasks = stories.map((st, i) => async () => {
      try {
        const imgPrompt = `Instagram Story 1080x1920, minimal white background, bold headline space, brand accents (purple/blue), UI/ops icons. ${st.prompt || ''}`;
        const url = await generateImageWithTimeout(imgPrompt, 60000);
        previews.stories[i] = url;
        const up = await uploadImageFromUrl(storiesFolder.id, `story_${String(i+1).padStart(2,'0')}.jpg`, url, `EN: ${st.title_en || ''} — ${st.body_en || ''} | HE: ${st.title_he || ''} — ${st.body_he || ''}`);
        storyUploads[i] = up;
      } catch (e) {
        const svg = svgPlaceholder(`${st?.title_en || ''} — ${st?.body_en || ''}`, `${st?.title_he || ''} — ${st?.body_he || ''}`);
        const bytes = new TextEncoder().encode(svg);
        const up = await uploadBinary(storiesFolder.id, `story_${String(i+1).padStart(2,'0')}.svg`, bytes, 'image/svg+xml', 'Placeholder story');
        storyUploads[i] = up;
      }
    });
    await runWithConcurrency(storyTasks, 3);

    // 4) Upload text assets
    await uploadText(textFolder.id, 'reel_caption_en.txt', (design?.reel?.caption_en || '') + '\n\n' + (design?.reel?.hashtags_en || []).join(' '));
    await uploadText(textFolder.id, 'reel_caption_he.txt', (design?.reel?.caption_he || '') + '\n\n' + (design?.reel?.hashtags_he || []).join(' '));
    await uploadText(textFolder.id, 'reel_voiceover_en.txt', design?.reel?.voiceover_en || '');
    await uploadText(textFolder.id, 'reel_voiceover_he.txt', design?.reel?.voiceover_he || '');

    const storyTxt = stories.map((s, i) => (
      `Story ${i+1}\nEN Title: ${s.title_en || ''}\nEN Body: ${s.body_en || ''}\nEN CTA: ${s.cta_en || ''}\nHE Title: ${s.title_he || ''}\nHE Body: ${s.body_he || ''}\nHE CTA: ${s.cta_he || ''}\n---\n`)).join('\n');
    await uploadText(textFolder.id, 'stories_text.txt', storyTxt);

    const howto = `This folder contains a SmartPlate Basic marketing package.\n\nSubfolders:\n- reel: background frames (1080x1920). Add the EN on-screen text (and small HE) per slide description.\n- stories: background story images (1080x1920). Add text overlays as in stories_text.txt.\n- text_assets: captions (EN/HE) and voiceover scripts.\n\nRecommended edits:\n- Use Instagram editor or CapCut. Keep on-screen EN under ~8 words, add small HE words.\n- Brand accents: purple/blue on clean white.\n- Duration per slide as designed.\n`;
    await uploadText(root.id, 'README.txt', howto);

    return Response.json({ success: true, folder: root, subfolders: { reel: reelFolder, stories: storiesFolder, text: textFolder }, previews, reel_files: reelUploads, story_files: storyUploads, design });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});