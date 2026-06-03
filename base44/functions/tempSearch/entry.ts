import * as fs from "node:fs/promises";
Deno.serve(async (req) => {
  const { query } = await req.json();
  const results = [];
  async function search(dir) {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory) {
        await search(path);
      } else if (entry.isFile && (path.endsWith('.js') || path.endsWith('.jsx'))) {
        const text = await Deno.readTextFile(path);
        if (text.toLowerCase().includes(query.toLowerCase())) {
          results.push(path);
        }
      }
    }
  }
  await search('./src');
  return Response.json({ results });
});