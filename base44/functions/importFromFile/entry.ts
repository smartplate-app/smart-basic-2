import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import * as xlsx from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_url, import_type = 'both' } = await req.json();

        if (!file_url) {
            return Response.json({ error: 'File URL is required' }, { status: 400 });
        }

        // Download the file
        const fileResponse = await fetch(file_url);
        const arrayBuffer = await fileResponse.arrayBuffer();
        const workbook = xlsx.read(new Uint8Array(arrayBuffer), { type: 'array' });

        let suppliers_imported = 0;
        let items_imported = 0;

        // Import suppliers
        if (import_type === 'both' || import_type === 'suppliers') {
            const suppliersSheet = workbook.Sheets['Suppliers'] || workbook.Sheets['suppliers'] || workbook.Sheets[workbook.SheetNames[0]];
            if (suppliersSheet) {
                const suppliersData = xlsx.utils.sheet_to_json(suppliersSheet);
                
                for (const row of suppliersData) {
                    try {
                        await base44.asServiceRole.entities.Supplier.create({
                            name: row['Supplier Name'] || row['Name'] || row['supplier_name'] || '',
                            phone: row['Phone'] || row['phone'] || '',
                            email: row['Email'] || row['email'] || '',
                            contact_person: row['Contact Person'] || row['contact'] || '',
                            supplier_type: 'simple',
                            created_by: user.email
                        });
                        suppliers_imported++;
                    } catch (error) {
                        console.error('Error importing supplier:', error);
                    }
                }
            }
        }

        // Import items
        if (import_type === 'both' || import_type === 'items') {
            const itemsSheet = workbook.Sheets['Items'] || workbook.Sheets['items'] || workbook.Sheets['Products'] || workbook.Sheets[workbook.SheetNames[import_type === 'items' ? 0 : 1]];
            if (itemsSheet) {
                const itemsData = xlsx.utils.sheet_to_json(itemsSheet);
                const allSuppliers = await base44.asServiceRole.entities.Supplier.filter({ created_by: user.email });
                
                for (const row of itemsData) {
                    try {
                        const supplierName = row['Supplier'] || row['supplier'] || row['Supplier Name'] || '';
                        const supplier = allSuppliers.find(s => 
                            s.name.toLowerCase() === supplierName.toLowerCase()
                        );

                        if (supplier) {
                            await base44.asServiceRole.entities.Item.create({
                                name: row['Item Name'] || row['Name'] || row['Product'] || '',
                                supplier_id: supplier.id,
                                supplier_name: supplier.name,
                                catalog_number: row['SKU'] || row['Catalog Number'] || '',
                                unit: mapUnit(row['Unit'] || row['unit']),
                                price: parseFloat(row['Price'] || row['price'] || 0),
                                created_by: user.email
                            });
                            items_imported++;
                        }
                    } catch (error) {
                        console.error('Error importing item:', error);
                    }
                }
            }
        }

        return Response.json({
            success: true,
            suppliers_imported,
            items_imported,
            message: `Successfully imported ${suppliers_imported} suppliers and ${items_imported} items`
        });

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
        'g': 'kg',
        'gram': 'kg',
        'l': 'liter',
        'liter': 'liter',
        'ml': 'liter',
        'unit': 'unit',
        'piece': 'unit',
        'each': 'unit',
        'case': 'case',
        'box': 'case',
        'pcs': 'unit'
    };
    
    return unitMap[unit?.toLowerCase()] || 'unit';
}