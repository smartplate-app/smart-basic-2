import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      topics = ['offline mode', 'weekly scheduling', 'order management'],
      features = [],
      languages = ['he', 'en'],
      type = 'post', // 'post' | 'reel'
      tone = 'friendly',
      length = 'medium'
    } = body || {};

    const prompt = `You are a social media strategist. Generate Instagram ${type === 'reel' ? 'Reel' : 'post'} content for a restaurant operations app called "SmartPlate Basic".
Audience: restaurant owners/managers in Israel (primary), global (secondary).
Goals: Educate and drive signups. CTA to "Try SmartPlate Basic".

Provide bilingual output (Hebrew=he, English=en). Respect Instagram best practices.
- Keep captions ${length} length.
- Tone: ${tone}, clear, benefits-first, with 1-2 emojis per paragraph (no overuse).
- Include 8-12 relevant hashtags per language.
- If type is reel, include a short voiceover_script (8-12 lines max) and a shot_list of 5-8 bullets.

Topics/features to cover: ${[...topics, ...features].join(', ')}.
Make each language standalone (not translations inline).
Return JSON strictly following the schema.`;

    const schema = {
      type: 'object',
      properties: {
        type: { type: 'string' },
        topics: { type: 'array', items: { type: 'string' } },
        generated: {
          type: 'object',
          properties: {
            he: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                caption: { type: 'string' },
                hashtags: { type: 'array', items: { type: 'string' } },
                cta: { type: 'string' },
                voiceover_script: { type: 'string' },
                shot_list: { type: 'array', items: { type: 'string' } }
              },
              required: ['caption', 'hashtags']
            },
            en: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                caption: { type: 'string' },
                hashtags: { type: 'array', items: { type: 'string' } },
                cta: { type: 'string' },
                voiceover_script: { type: 'string' },
                shot_list: { type: 'array', items: { type: 'string' } }
              },
              required: ['caption', 'hashtags']
            }
          },
          required: []
        }
      },
      required: ['type', 'generated']
    };

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    return Response.json({ success: true, result: llmRes, meta: { type, topics, languages } });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});