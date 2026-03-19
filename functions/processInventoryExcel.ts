import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { file_url, warehouse_id } = body;

        if (!file_url) {
            return Response.json({ error: 'No file URL provided' }, { status: 400 });
        }

        console.log('[processInventoryExcel] Fetching file from:', file_url);

        // Fetch the file from the URL
        const fileResponse = await fetch(file_url);
        if (!fileResponse.ok) {
            throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
        }

        const arrayBuffer = await fileResponse.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        console.log('[processInventoryExcel] File size:', data.length);

        // Parse Excel/CSV file
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log('[processInventoryExcel] Parsed rows:', jsonData.length);

        // Load all items from database (for matching if they exist)
        const allItems = await base44.entities.Item.filter({ created_by: user.email });
        console.log('[processInventoryExcel] Total items in DB:', allItems.length);

        const processedItems = [];

        // Process each row - import ALL items from Excel
        jsonData.forEach((row, index) => {
            // Try to find item name column (supports multiple languages)
            const itemName = row['שם הפריט'] || row['Item Name'] || row['اسم الصنف'] || 
                           row['item_name'] || row['name'] || row['Name'] || '';
            
            const quantity = parseFloat(row['כמות נספרת'] || row['Counted Quantity'] || 
                                      row['الكمية المحسوبة'] || row['quantity'] || row['Quantity'] || 0);
            
            const unit = row['יחידה / ליטר / קילו / מארז'] || row['unit / liter / kg / case'] || 
                        row['وحدة / لتر / كجم / صندوق'] || row['unit'] || row['Unit'] || 'unit';
            
            const warehouseName = row['מחסן'] || row['Warehouse'] || row['المخزن'] || 
                                 row['warehouse'] || row['Storage'] || '';
            
            const remarks = row['הערות'] || row['Remarks'] || row['ملاحظات'] || 
                           row['remarks'] || row['Notes'] || '';
            
            // Extract price from Excel (supports multiple column names)
            const excelPrice = parseFloat(
                row['מחיר ליחידה'] || 
                row['Price per Unit'] || 
                row['السعر لكل وحدة'] || 
                row['Τιμή ανά μονάδα'] ||
                row['Preis pro Einheit'] ||
                row['Цена за единицу'] ||
                row['מחיר'] || 
                row['Price'] || 
                row['السعر'] || 
                row['price'] || 
                row['price_per_unit'] || 
                0
            );

            // Skip empty rows and example rows
            if (!itemName || 
                itemName.toLowerCase().includes('example') || 
                itemName.toLowerCase().includes('דוגמה') ||
                itemName.toLowerCase().includes('مثال')) {
                console.log(`[processInventoryExcel] Skipping row ${index + 1}:`, itemName);
                return;
            }

            const itemNameLower = itemName.trim().toLowerCase();
            
            // Try to find matching item in database
            const foundItem = allItems.find(dbItem => {
                const dbName = dbItem.name.trim().toLowerCase();
                const matches = dbName === itemNameLower ||
                              dbName.includes(itemNameLower) ||
                              itemNameLower.includes(dbName);
                
                // Check warehouse match if provided in Excel
                let warehouseMatch = true;
                if (warehouseName && dbItem.warehouse_name) {
                    warehouseMatch = dbItem.warehouse_name.toLowerCase().includes(warehouseName.toLowerCase()) ||
                                    warehouseName.toLowerCase().includes(dbItem.warehouse_name.toLowerCase());
                }
                
                // If warehouse_id was provided in the import, also check that
                if (warehouse_id && dbItem.warehouse_id) {
                    warehouseMatch = warehouseMatch && dbItem.warehouse_id === warehouse_id;
                }
                
                return matches && warehouseMatch;
            });

            // Determine which price to use (priority: Excel > Database > 0)
            const finalPrice = excelPrice > 0 ? excelPrice : (foundItem?.price || 0);
            
            // Calculate total cost
            const totalCost = quantity * finalPrice;

            // Create item for count - use DB data if found, otherwise use Excel data
            const countItem = {
                item_id: foundItem?.id || '',
                item_name: foundItem?.name || itemName,
                supplier_name: foundItem?.supplier_name || '',
                counted_quantity: quantity,
                unit: foundItem?.unit || unit,
                price_per_unit: finalPrice,
                total_cost: totalCost,
                notes: remarks,
                matched: !!foundItem // Flag to indicate if item was matched
            };

            console.log(`[processInventoryExcel] ${foundItem ? 'Matched' : 'New item from Excel'} "${itemName}" - Qty: ${quantity}, Price: ₪${finalPrice}, Total: ₪${totalCost.toFixed(2)}`);
            processedItems.push(countItem);
        });

        console.log(`[processInventoryExcel] Processed ${processedItems.length} total items`);
        
        const matchedCount = processedItems.filter(item => item.matched).length;
        const newCount = processedItems.length - matchedCount;
        const totalValue = processedItems.reduce((sum, item) => sum + item.total_cost, 0);
        
        console.log(`[processInventoryExcel] ${matchedCount} matched with DB, ${newCount} new from Excel`);
        console.log(`[processInventoryExcel] Total inventory value: ₪${totalValue.toFixed(2)}`);

        return Response.json({
            items: processedItems, // All items - both matched and new
            matched: processedItems, // For backward compatibility
            unmatched: [], // No longer needed - we import everything
            stats: {
                total: processedItems.length,
                matched_with_catalog: matchedCount,
                new_from_excel: newCount,
                total_value: totalValue
            }
        });

    } catch (error) {
        console.error('[processInventoryExcel] Error:', error);
        return Response.json({ 
            error: error.message || 'Failed to process file' 
        }, { status: 500 });
    }
});