import * as fs from "node:fs/promises";
Deno.serve(async (req) => {
  const dirs = await fs.readdir('/');
  return Response.json({ dirs });
});