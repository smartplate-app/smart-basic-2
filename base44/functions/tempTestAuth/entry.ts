import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let methods = [];
        let obj = base44.asServiceRole.auth;
        do {
            methods = methods.concat(Object.getOwnPropertyNames(obj));
        } while (obj = Object.getPrototypeOf(obj));
        
        return Response.json({ success: true, adminMethods: methods });
    } catch (e) {
        return Response.json({ success: false, error: e.message });
    }
});