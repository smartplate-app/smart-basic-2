import { createClientFromRequest } from 'npm:@base44/sdk@0.8.30';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Let's create a custom JWT for Kona
        const testTokenRes = await base44.asServiceRole.functions.invoke('tempTestToken', { email: 'konaburgerltd@gmail.com' });
        
        // We can just construct a mock Request with the token
        const mockReq = new Request('http://localhost', {
            headers: { 'Authorization': `Bearer ${testTokenRes.data.token}` }
        });
        
        const konaClient = createClientFromRequest(mockReq);
        
        const mySuppliers = await konaClient.entities.Supplier.list();
        
        return Response.json({ 
            token_generated: !!testTokenRes.data.token,
            suppliers_found_with_rls: mySuppliers.length,
            suppliers: mySuppliers
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});