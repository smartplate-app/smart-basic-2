import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const { spreadsheetId } = await req.json();
    
    // Test fetching it publicly
    const publicUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
    const res = await fetch(publicUrl);
    const text = await res.text();
    
    return Response.json({
      status: res.status,
      ok: res.ok,
      preview: text.substring(0, 500)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});