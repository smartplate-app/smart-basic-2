import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Get data from request body
        const body = await req.json();
        const { ownerId, action } = body;
        
        if (!ownerId) {
            return Response.json({ error: 'Owner ID required' }, { status: 400 });
        }

        // Get owner's user record by ID
        // User.filter by id doesn't work reliably — use list and find
        const allUsers = await base44.asServiceRole.entities.User.list();
        const owner = allUsers?.find(u => u.id === ownerId);
        
        if (!owner) {
            return Response.json({ error: 'Owner not found' }, { status: 404 });
        }

        if (action === 'load') {
            // Also try store_owner_email for chain sub-stores
            const [suppliersByCreated, suppliersByOwner, orders, itemsByCreated, itemsByOwner, warehousesByCreated, warehousesByOwner, allCountsRaw] = await Promise.all([
                base44.asServiceRole.entities.Supplier.filter({ created_by: owner.email }),
                base44.asServiceRole.entities.Supplier.filter({ store_owner_email: owner.email }),
                base44.asServiceRole.entities.Order.filter({ store_owner_email: owner.email }, "-created_date"),
                base44.asServiceRole.entities.Item.filter({ created_by: owner.email }),
                base44.asServiceRole.entities.Item.filter({ store_owner_email: owner.email }),
                base44.asServiceRole.entities.Warehouse.filter({ created_by: owner.email, is_active: true }),
                base44.asServiceRole.entities.Warehouse.filter({ store_owner_email: owner.email, is_active: true }),
                base44.asServiceRole.entities.InventoryCount.filter({ store_owner_email: owner.email }, "-created_date", 50)
            ]);
            // Merge and deduplicate suppliers
            const allSuppliers = [...suppliersByCreated, ...suppliersByOwner];
            const seenS = new Set();
            const suppliers = allSuppliers.filter(s => { if (seenS.has(s.id)) return false; seenS.add(s.id); return true; });
            // Merge and deduplicate items
            const allItems = [...itemsByCreated, ...itemsByOwner];
            const seenI = new Set();
            const items = allItems
              .filter(i => { if (seenI.has(i.id)) return false; seenI.add(i.id); return true; })
              .map(i => ({ id: i.id, name: i.name, unit: i.unit, supplier_name: i.supplier_name, supplier_id: i.supplier_id || '', price_after_discount: i.price_after_discount || 0, price: i.price || 0, discount: i.discount || 0, catalog_number: i.catalog_number || '', minimum_stock: i.minimum_stock || 0, nickname: i.nickname || '' }));
            // Merge and deduplicate warehouses
            const allWarehouses = [...warehousesByCreated, ...warehousesByOwner];
            const seenW = new Set();
            const warehouses = allWarehouses.filter(w => { if (seenW.has(w.id)) return false; seenW.add(w.id); return true; });
            const counts = allCountsRaw;
            
            return Response.json({ 
                suppliers, 
                orders,
                items,
                warehouses,
                counts,
                ownerEmail: owner.email,
                businessName: owner.business_name || owner.full_name || owner.email || ''
            });
        }

        if (action === 'createOrder') {
            const order = await base44.asServiceRole.entities.Order.create({
                ...body,
                created_by: owner.email,
                store_owner_email: owner.email
            });
            return Response.json({ success: true, order });
        }

        if (action === 'createReceipt') {
            const receipt = await base44.asServiceRole.entities.SupplyReceipt.create({
                ...body,
                created_by: owner.email,
                store_owner_email: owner.email
            });
            return Response.json({ success: true, receipt });
        }

        if (action === 'loadReceipts') {
            const [byCreated, byOwner] = await Promise.all([
                base44.asServiceRole.entities.SupplyReceipt.filter({ created_by: owner.email }, "-created_date"),
                base44.asServiceRole.entities.SupplyReceipt.filter({ store_owner_email: owner.email }, "-created_date")
            ]);
            const all = [...byCreated, ...byOwner];
            const seen = new Set();
            const receipts = all.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
            return Response.json({ receipts });
        }

        if (action === 'loadCounts') {
            const [byCreated, byOwner] = await Promise.all([
                base44.asServiceRole.entities.InventoryCount.filter({ created_by: owner.email }, "-created_date"),
                base44.asServiceRole.entities.InventoryCount.filter({ store_owner_email: owner.email }, "-created_date")
            ]);
            const all = [...byCreated, ...byOwner];
            const seen = new Set();
            const counts = all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
            return Response.json({ counts });
        }

        if (action === 'createCount') {
            const { warehouse_id, warehouse_name, count_date, count_type, items: countItems, total_inventory_value } = body;
            const count = await base44.asServiceRole.entities.InventoryCount.create({
                warehouse_id: warehouse_id || '',
                warehouse_name: warehouse_name || 'ספירה כללית',
                count_date: count_date || new Date().toISOString().split('T')[0],
                count_type: count_type || 'monthly',
                items: Array.isArray(countItems) ? countItems : [],
                total_inventory_value: Number(total_inventory_value) || 0,
                status: 'completed',
                created_by: owner.email,
                store_owner_email: owner.email
            });
            return Response.json({ success: true, count });
        }

        if (action === 'updateCount') {
            const { countId, warehouse_id, warehouse_name, count_date, count_type, items: countItems, total_inventory_value } = body;
            if (!countId) return Response.json({ error: 'countId required' }, { status: 400 });
            const count = await base44.asServiceRole.entities.InventoryCount.update(countId, {
                warehouse_id: warehouse_id || '',
                warehouse_name: warehouse_name || 'ספירה כללית',
                count_date: count_date || new Date().toISOString().split('T')[0],
                count_type: count_type || 'monthly',
                items: Array.isArray(countItems) ? countItems : [],
                total_inventory_value: Number(total_inventory_value) || 0,
                status: 'completed',
                store_owner_email: owner.email
            });
            return Response.json({ success: true, count });
        }

        if (action === 'loadWarehouses') {
            const warehouses = await base44.asServiceRole.entities.Warehouse.filter({ created_by: owner.email, is_active: true });
            return Response.json({ warehouses });
        }

        if (action === 'startSession') {
            const { workerName, workerUserId } = body;
            const session = await base44.asServiceRole.entities.WorkerSession.create({
                owner_id: ownerId,
                owner_email: owner.email,
                worker_name: workerName || 'עובד',
                worker_user_id: workerUserId || '',
                login_at: new Date().toISOString(),
                actions: [],
                actions_count: 0
            });
            return Response.json({ success: true, sessionId: session.id });
        }

        if (action === 'logAction') {
            const { sessionId, actionName, subject } = body;
            if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });
            const session = await base44.asServiceRole.entities.WorkerSession.get(sessionId);
            if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
            const actions = session.actions || [];
            actions.push({ action: actionName, subject, timestamp: new Date().toISOString() });
            await base44.asServiceRole.entities.WorkerSession.update(sessionId, {
                actions,
                actions_count: actions.length
            });
            return Response.json({ success: true });
        }

        if (action === 'endSession') {
            const { sessionId } = body;
            if (!sessionId) return Response.json({ success: true });
            const session = await base44.asServiceRole.entities.WorkerSession.get(sessionId);
            if (!session) return Response.json({ success: true });
            const loginAt = new Date(session.login_at);
            const now = new Date();
            const duration_minutes = Math.round((now - loginAt) / 60000);
            await base44.asServiceRole.entities.WorkerSession.update(sessionId, {
                logout_at: now.toISOString(),
                duration_minutes
            });
            return Response.json({ success: true });
        }

        if (action === 'loadSessions') {
            const sessions = await base44.asServiceRole.entities.WorkerSession.filter(
                { owner_id: ownerId }, '-login_at', 100
            );
            return Response.json({ sessions });
        }

        if (action === 'uploadFile') {
            // Expects multipart/form-data won't work via JSON body, so we handle base64
            const { file_base64, file_name, file_type } = body;
            if (!file_base64) {
                return Response.json({ error: 'file_base64 required' }, { status: 400 });
            }
            // Convert base64 to Uint8Array
            const byteString = atob(file_base64);
            const bytes = new Uint8Array(byteString.length);
            for (let i = 0; i < byteString.length; i++) {
                bytes[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: file_type || 'application/octet-stream' });
            const file = new File([blob], file_name || 'upload', { type: file_type || 'application/octet-stream' });
            const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });
            return Response.json({ success: true, file_url });
        }

        if (action === 'scanReceipt') {
            const { file_urls = [] } = body;
            if (!Array.isArray(file_urls) || file_urls.length === 0) {
                return Response.json({ error: 'file_urls required' }, { status: 400 });
            }
            const currentYear = new Date().getFullYear();
            const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
                model: 'gemini_3_flash',
                prompt: `You are an expert accountant extracting data from an Israeli supplier invoice/delivery note image. Read the Hebrew text carefully. DO NOT invent or hallucinate data.

VERY IMPORTANT: DO NOT TRANSLATE any item names. Extract the exact text in its original language exactly as it appears in the document.

CRITICAL EXTRACTION RULES:
1. invoice_number: Look for "מספר חשבונית", "חשבונית מס'", "תעודת משלוח", "מספר מסמך". Extract EXACTLY the invoice number.
2. invoice_date: Look for "תאריך", "תאריך הפקה". Format strictly as YYYY-MM-DD. Current year is ${currentYear}.
3. total_incl_vat: Look for "סה"כ לתשלום", "סה"כ כולל מע"מ", "לתשלום ש"ח". The final total to pay.
4. total_excl_vat: Look for "סה"כ לפני מע"מ", "ללא מע"מ".
5. vat_amount: Look for "סכום מע"מ", "מע"מ".
6. is_refund: true ONLY if document says "חשבונית זיכוי", "זיכוי", or total is explicitly negative.
7. document_type: "invoice" for חשבונית מס, "delivery_note" for תעודת משלוח, "summary_invoice" for חשבונית מרכזת.
8. items: Extract ALL items with name, quantity, price per unit.

Extract precisely. Return 0 for missing amounts, empty string for missing text.`,
                file_urls,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        invoice_number: { type: 'string' },
                        invoice_date: { type: 'string' },
                        total_excl_vat: { type: 'number' },
                        vat_amount: { type: 'number' },
                        total_incl_vat: { type: 'number' },
                        is_refund: { type: 'boolean' },
                        document_type: { type: 'string', enum: ['invoice', 'delivery_note', 'summary_invoice'] },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    item_name: { type: 'string' },
                                    quantity: { type: 'number' },
                                    price: { type: 'number' },
                                    total: { type: 'number' }
                                }
                            }
                        }
                    },
                    required: ['invoice_number', 'invoice_date', 'total_incl_vat']
                }
            });
            return Response.json({
                success: true,
                header: {
                    invoice_number: llm.invoice_number,
                    invoice_date: llm.invoice_date,
                    total_excl_vat: llm.total_excl_vat,
                    vat_amount: llm.vat_amount,
                    total_incl_vat: llm.total_incl_vat,
                    is_refund: llm.is_refund,
                    document_type: llm.document_type || 'invoice'
                },
                items: llm.items || []
            });
        }

        if (action === 'createWaste') {
            const { warehouse_id, warehouse_name, report_date, shift, items: wasteItems, total_waste_value, notes } = body;
            const report = await base44.asServiceRole.entities.WasteReport.create({
                warehouse_id: warehouse_id || '',
                warehouse_name: warehouse_name || '',
                report_date: report_date || new Date().toISOString().split('T')[0],
                shift: shift || 'daily',
                items: wasteItems || [],
                total_waste_value: total_waste_value || 0,
                notes: notes || '',
                created_by: owner.email,
                store_owner_email: owner.email
            });
            return Response.json({ success: true, report });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Worker portal error:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});