import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const body = await req.json();
        const { warehouse_id, language = 'he', targetEmail } = body;

        const workingEmail = targetEmail || user.acting_as_store_email || user.acting_as_user_email || user.store_user_owner_email || user.email;
        const isAdminImpersonating = user.role === 'admin' && (targetEmail || user.acting_as_user_email || user.acting_as_store_email);

        // Get warehouse items
        let items = [];
        const api = isAdminImpersonating ? base44.asServiceRole.entities : base44.entities;
        let records = [];
        try {
            const storeUsers = await api.StoreUser.filter({ owner_email: workingEmail });
            const allowedEmails = [workingEmail, ...storeUsers.map(u => u.user_email)];
            for (const email of allowedEmails) {
                const r = await api.Item.filter({ created_by: email }, 'name', 5000);
                if (r) records = [...records, ...r];
            }
            try {
                const r2 = await api.Item.filter({ store_owner_email: workingEmail }, 'name', 5000);
                if (r2) records = [...records, ...r2];
            } catch(e) {}
        } catch(e) {
            records = await api.Item.filter({ created_by: workingEmail }, 'name', 5000);
        }
        items = Array.from(new Map(records.map(r => [r.id, r])).values());

        if (warehouse_id) {
            items = items.filter(it => it.warehouse_id === warehouse_id || (it.warehouse_ids && it.warehouse_ids.includes(warehouse_id)));
        }

        // Get all warehouses for the warehouse column
        const warehouses = await base44.entities.Warehouse.filter({ 
            created_by: user.email 
        }, 'name');

        // Create headers based on language
        const headers = {
            he: ['שם ספק', 'שם פריט', 'ארגזים שנספרו', 'יחידות שנספרו', 'הערות'],
            en: ['Supplier', 'Item Name', 'Counted Cases', 'Counted Units', 'Notes'],
            ar: ['اسم المورد', 'اسم الصنف', 'الصناديق المحسوبة', 'الوحدات المحسوبة', 'ملاحظات'],
            el: ['Προμηθευτής', 'Όνομα είδους', 'Καταμετρημένα Κιβώτια', 'Καταμετρημένες Μονάδες', 'Παρατηρήσεις'],
            de: ['Lieferant', 'Artikelname', 'Gezählte Kisten', 'Gezählte Einheiten', 'Bemerkungen'],
            ru: ['Поставщик', 'Название товара', 'Подсчитанные ящики', 'Подсчитанные единицы', 'Примечания']
        };

        const header = headers[language] || headers['he'];

        // Create CSV content
        const csvRows = [];
        
        // Add header
        csvRows.push(header.join(','));
        
        // Add example row
        const exampleRow = language === 'he' 
            ? ['הירקן שלי', 'דוגמה: עגבניות', '', '10', 'דוגמה - מחק שורה זו']
            : language === 'ar'
            ? ['المورد الخاص بي', 'مثال: طماطم', '', '10', 'مثال - احذف هذا السطر']
            : ['My Greengrocer', 'Example: Tomatoes', '', '10', 'Example - delete this row'];
        csvRows.push(exampleRow.map(cell => `"${cell}"`).join(','));
        
        // Add all items
        items.forEach(item => {
            const warehouses = item.warehouse_names && item.warehouse_names.length > 0 
                ? item.warehouse_names 
                : (item.warehouse_name ? [item.warehouse_name] : ['']);
            
            warehouses.forEach(whName => {
                const isCaseItem = item.unit === 'case';
                const row = [
                    `"${item.supplier_name || ''}"`,
                    `"${item.name || ''}"`,
                    isCaseItem ? '""' : '"N/A"', // Counted Cases
                    '""', // Counted Units
                    '""' // Notes
                ];
                csvRows.push(row.join(','));
            });
        });

        const csvContent = csvRows.join('\n');
        
        // Add BOM for UTF-8 to ensure proper Hebrew/Arabic display in Excel
        const bom = '\uFEFF';
        const csvWithBOM = bom + csvContent;
        
        // Convert to UTF-8 bytes
        const encoder = new TextEncoder();
        const csvBytes = encoder.encode(csvWithBOM);

        return new Response(csvBytes, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="inventory_count_template_${new Date().toISOString().split('T')[0]}.csv"`,
                'Content-Length': csvBytes.length.toString()
            }
        });

    } catch (error) {
        console.error('Template generation error:', error);
        return new Response(JSON.stringify({ 
            error: error.message || 'Failed to generate template',
            stack: error.stack
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});