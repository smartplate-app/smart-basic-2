import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        async function searchDir(path) {
            const results = [];
            for await (const dirEntry of Deno.readDir(path)) {
                const entryPath = `${path}/${dirEntry.name}`;
                if (dirEntry.isDirectory) {
                    results.push(...await searchDir(entryPath));
                } else if (dirEntry.isFile && (entryPath.endsWith('.js') || entryPath.endsWith('.jsx'))) {
                    results.push(entryPath);
                }
            }
            return results;
        }

        const files = await searchDir('./src/components/labor');
        return Response.json({ files });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});