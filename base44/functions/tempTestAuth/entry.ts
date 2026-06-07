import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let methods = [];
        let obj = base44.users;
        while (obj) {
            methods = methods.concat(Object.getOwnPropertyNames(obj));
            obj = Object.getPrototypeOf(obj);
        }
        
        return Response.json({ success: true, methods });
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});