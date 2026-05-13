import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        let targetEmail = 'demo@foodcostapp.com';
        const { data: adminData } = await base44.functions.invoke('getAdminData', { action: 'getFullUserData', userEmail: targetEmail });
        
        return Response.json({
            success: true,
            hasAdminData: !!adminData,
            adminDataSuccess: adminData?.success,
            recipesLength: adminData?.data?.recipes?.length,
            recipes: adminData?.data?.recipes
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});