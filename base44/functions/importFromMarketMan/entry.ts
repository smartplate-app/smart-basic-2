import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const reqBody = await req.json();
        const { system_url, username, password, import_type = 'both', targetEmail: providedTargetEmail } = reqBody;

        if (!system_url || !username || !password) {
            return Response.json({ error: 'URL, username and password are required' }, { status: 400 });
        }

        let targetEmail = user.acting_as_store_email || user.store_user_owner_email || user.acting_as_user_email || user.email;
        if (providedTargetEmail && (user.role === 'admin' || user.email.startsWith('service+'))) {
            targetEmail = providedTargetEmail;
        }

        let suppliers_imported = 0;
        let items_imported = 0;

        // Detect which system based on URL
        const isMarketMan = system_url.includes('marketman');
        const isChefTec = system_url.includes('cheftec');
        
        try {
            // First, try to login to the system
            const loginResponse = await fetch(`${system_url}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!loginResponse.ok) {
                throw new Error('Failed to login to external system');
            }

            const loginData = await loginResponse.json();
            const authToken = loginData.token || loginData.access_token;

            // Import suppliers
            if (import_type === 'both' || import_type === 'suppliers') {
                try {
                    const suppliersResponse = await fetch(`${system_url}/api/suppliers`, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (suppliersResponse.ok) {
                        const suppliersData = await suppliersResponse.json();
                        const suppliers = suppliersData.data || suppliersData.suppliers || suppliersData;
                        
                        for (const supplier of suppliers) {
                            try {
                                await base44.asServiceRole.entities.Supplier.create({
                                    name: supplier.name || supplier.supplier_name,
                                    phone: supplier.phone || supplier.telephone || '',
                                    email: supplier.email || '',
                                    contact_person: supplier.contact_name || supplier.contact || '',
                                    supplier_type: 'simple',
                                    created_by: targetEmail,
                                    store_owner_email: targetEmail
                                });
                                suppliers_imported++;
                            } catch (error) {
                                console.error(`Error importing supplier:`, error);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching suppliers:', error);
                }
            }

            // Import items/products
            if (import_type === 'both' || import_type === 'items') {
                try {
                    const itemsResponse = await fetch(`${system_url}/api/items`, {
                        headers: {
                            'Authorization': `Bearer ${authToken}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (itemsResponse.ok) {
                        const itemsData = await itemsResponse.json();
                        const items = itemsData.data || itemsData.items || itemsData.products || itemsData;
                        
                        // Get all suppliers to match items
                        const allSuppliers = await base44.asServiceRole.entities.Supplier.filter({ created_by: targetEmail });
                        
                        for (const item of items) {
                            try {
                                // Find matching supplier
                                const supplierName = item.supplier_name || item.supplier || item.vendor;
                                const supplier = allSuppliers.find(s => 
                                    s.name.toLowerCase() === supplierName?.toLowerCase()
                                );

                                if (supplier) {
                                    await base44.asServiceRole.entities.Item.create({
                                        name: item.name || item.item_name || item.product_name,
                                        supplier_id: supplier.id,
                                        supplier_name: supplier.name,
                                        catalog_number: item.sku || item.item_code || item.catalog_number || '',
                                        unit: mapUnit(item.unit || item.unit_type),
                                        price: parseFloat(item.price || item.cost || 0),
                                        created_by: targetEmail,
                                        store_owner_email: targetEmail
                                    });
                                    items_imported++;
                                }
                            } catch (error) {
                                console.error(`Error importing item:`, error);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error fetching items:', error);
                }
            }

            return Response.json({
                success: true,
                suppliers_imported,
                items_imported,
                message: `Successfully imported ${suppliers_imported} suppliers and ${items_imported} items`
            });

        } catch (error) {
            console.error('Connection error:', error);
            return Response.json({ 
                error: 'Failed to connect to system. Please check your URL, username and password.'
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Import error:', error);
        return Response.json({ 
            error: error.message || 'Failed to import data'
        }, { status: 500 });
    }
});

function mapUnit(unit) {
    const unitMap = {
        'kg': 'kg',
        'kilogram': 'kg',
        'kilo': 'kg',
        'g': 'kg',
        'gram': 'kg',
        'l': 'liter',
        'liter': 'liter',
        'litre': 'liter',
        'ml': 'liter',
        'unit': 'unit',
        'piece': 'unit',
        'each': 'unit',
        'pcs': 'unit',
        'case': 'case',
        'box': 'case',
        'carton': 'case'
    };
    
    return unitMap[unit?.toLowerCase()] || 'unit';
}