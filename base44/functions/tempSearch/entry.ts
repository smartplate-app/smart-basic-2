import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const __dirname = path.resolve('.');
        
        let files = [];
        try {
            const readDirRecursive = (dir) => {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        if (!['node_modules', '.git', 'dist'].includes(entry.name)) {
                            readDirRecursive(fullPath);
                        }
                    } else {
                        files.push(fullPath.replace(__dirname + '/', ''));
                    }
                }
            };
            readDirRecursive(__dirname);
        } catch (e) {}

        return Response.json({ dir: __dirname, files });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});