import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const demoEmail = 'demo@foodcostapp.com';
        
        // Cleanup existing demo data just in case
        const existingSuppliers = await base44.asServiceRole.entities.Supplier.filter({ store_owner_email: demoEmail });
        for (const s of existingSuppliers) {
            await base44.asServiceRole.entities.Supplier.delete(s.id);
        }
        const existingItems = await base44.asServiceRole.entities.Item.filter({ store_owner_email: demoEmail });
        for (const i of existingItems) {
            await base44.asServiceRole.entities.Item.delete(i.id);
        }
        const existingRecipes = await base44.asServiceRole.entities.Recipe.filter({ store_owner_email: demoEmail });
        for (const r of existingRecipes) {
            await base44.asServiceRole.entities.Recipe.delete(r.id);
        }
        const existingOrders = await base44.asServiceRole.entities.Order.filter({ store_owner_email: demoEmail });
        for (const o of existingOrders) {
            await base44.asServiceRole.entities.Order.delete(o.id);
        }
        const existingReceipts = await base44.asServiceRole.entities.SupplyReceipt.filter({ store_owner_email: demoEmail });
        for (const sr of existingReceipts) {
            await base44.asServiceRole.entities.SupplyReceipt.delete(sr.id);
        }
        const existingDashboard = await base44.asServiceRole.entities.MonthlyDashboardData.filter({ store_owner_email: demoEmail });
        for (const d of existingDashboard) {
            await base44.asServiceRole.entities.MonthlyDashboardData.delete(d.id);
        }
        const existingCogsReports = await base44.asServiceRole.entities.CogsReport.filter({ store_owner_email: demoEmail });
        for (const cr of existingCogsReports) {
            await base44.asServiceRole.entities.CogsReport.delete(cr.id);
        }
        const existingInventoryCounts = await base44.asServiceRole.entities.InventoryCount.filter({ store_owner_email: demoEmail });
        for (const ic of existingInventoryCounts) {
            await base44.asServiceRole.entities.InventoryCount.delete(ic.id);
        }
        const existingWarehouses = await base44.asServiceRole.entities.Warehouse.filter({ store_owner_email: demoEmail });
        for (const w of existingWarehouses) {
            await base44.asServiceRole.entities.Warehouse.delete(w.id);
        }
        const existingPriceChanges = await base44.asServiceRole.entities.PriceChangeLog.filter({ store_owner_email: demoEmail });
        for (const pcl of existingPriceChanges) {
            await base44.asServiceRole.entities.PriceChangeLog.delete(pcl.id);
        }
        
        // 1. Suppliers
        const suppliers = [
            { name: "Fresh Produce Ltd (ירקות/Λαχανικά)", phone: "050-1234567" },
            { name: "Meat Master (בשר/Κρέας)", phone: "052-7654321" },
            { name: "Dry Goods & Co", phone: "054-1112223" }
        ];

        const createdSuppliers = [];
        for (const s of suppliers) {
            createdSuppliers.push(await base44.asServiceRole.entities.Supplier.create({
                ...s,
                created_by: demoEmail,
                store_owner_email: demoEmail
            }));
        }

        // 2. Items
        const items = [
            { name: "Tomatoes", nickname: "עגבניות", supplier_id: createdSuppliers[0].id, supplier_name: createdSuppliers[0].name, unit: "kg", price: 5.5, units_per_package: 1, content_per_unit: 1 },
            { name: "Cucumbers", nickname: "מלפפונים", supplier_id: createdSuppliers[0].id, supplier_name: createdSuppliers[0].name, unit: "kg", price: 4.2, units_per_package: 1, content_per_unit: 1 },
            { name: "Feta Cheese", nickname: "גבינת פטה", supplier_id: createdSuppliers[1].id, supplier_name: createdSuppliers[1].name, unit: "kg", price: 45.0, units_per_package: 1, content_per_unit: 1 },
            { name: "Olive Oil", nickname: "שמן זית", supplier_id: createdSuppliers[2].id, supplier_name: createdSuppliers[2].name, unit: "liter", price: 35.0, units_per_package: 1, content_per_unit: 1 },
            { name: "Ground Beef", nickname: "בשר טחון", supplier_id: createdSuppliers[1].id, supplier_name: createdSuppliers[1].name, unit: "kg", price: 55.0, units_per_package: 1, content_per_unit: 1 },
            { name: "Pasta", nickname: "פסטה", supplier_id: createdSuppliers[2].id, supplier_name: createdSuppliers[2].name, unit: "kg", price: 8.0, units_per_package: 1, content_per_unit: 1 }
        ];

        const createdItems = [];
        for (const i of items) {
            createdItems.push(await base44.asServiceRole.entities.Item.create({
                ...i,
                created_by: demoEmail,
                store_owner_email: demoEmail
            }));
        }

        // 3. Prep Recipes
        const prepRecipe = await base44.asServiceRole.entities.Recipe.create({
            name: "Tomato Sauce (רוטב עגבניות / Σάλτσα ντομάτας)",
            type: "prep_recipe",
            batch_yield: 2,
            batch_unit: "liter",
            ingredients: [
                { item_id: createdItems[0].id, item_name: createdItems[0].name, quantity: 2.5, unit: "kg", price_per_unit: 5.5, is_recipe: false },
                { item_id: createdItems[3].id, item_name: createdItems[3].name, quantity: 0.1, unit: "liter", price_per_unit: 35.0, is_recipe: false }
            ],
            total_cost: 2.5 * 5.5 + 0.1 * 35.0,
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // 4. Sale Recipes
        const saleRecipe1 = await base44.asServiceRole.entities.Recipe.create({
            name: "Greek Salad (סלט יווני / Χωριάτικη Σαλάτα)",
            type: "sale_item",
            batch_yield: 1,
            batch_unit: "portion",
            ingredients: [
                { item_id: createdItems[0].id, item_name: createdItems[0].name, quantity: 0.2, unit: "kg", price_per_unit: 5.5, is_recipe: false },
                { item_id: createdItems[1].id, item_name: createdItems[1].name, quantity: 0.15, unit: "kg", price_per_unit: 4.2, is_recipe: false },
                { item_id: createdItems[2].id, item_name: createdItems[2].name, quantity: 0.1, unit: "kg", price_per_unit: 45.0, is_recipe: false },
                { item_id: createdItems[3].id, item_name: createdItems[3].name, quantity: 0.05, unit: "liter", price_per_unit: 35.0, is_recipe: false }
            ],
            total_cost: (0.2 * 5.5) + (0.15 * 4.2) + (0.1 * 45.0) + (0.05 * 35.0),
            sale_price: 52.0,
            sold_count: 450,
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        const saleRecipe2 = await base44.asServiceRole.entities.Recipe.create({
            name: "Pasta Bolognese (פסטה בולונז / Μακαρόνια με κιμά)",
            type: "sale_item",
            batch_yield: 1,
            batch_unit: "portion",
            ingredients: [
                { item_id: prepRecipe.id, item_name: prepRecipe.name, quantity: 0.2, unit: "liter", price_per_unit: prepRecipe.total_cost / 2, is_recipe: true },
                { item_id: createdItems[4].id, item_name: createdItems[4].name, quantity: 0.15, unit: "kg", price_per_unit: 55.0, is_recipe: false },
                { item_id: createdItems[5].id, item_name: createdItems[5].name, quantity: 0.2, unit: "kg", price_per_unit: 8.0, is_recipe: false }
            ],
            total_cost: (0.2 * (prepRecipe.total_cost / 2)) + (0.15 * 55.0) + (0.2 * 8.0),
            sale_price: 68.0,
            sold_count: 320,
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // 5. Monthly Dashboard Data
        const currentMonth = new Date().toISOString().substring(0, 7);
        const prevMonthDate = new Date();
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const previousMonth = prevMonthDate.toISOString().substring(0, 7);
        
        await base44.asServiceRole.entities.MonthlyDashboardData.create({
            month: currentMonth,
            predicted_sales: 160000,
            total_sales: 158000,
            restaurant_sales: 130000,
            delivery_takeaway_sales: 28000,
            labor_goal_percent: 28,
            food_goal_percent: 30,
            monthly_rent_incl_vat: 11500,
            use_manual_labor: true,
            manual_labor_cost: 41000,
            use_manual_food: false,
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        await base44.asServiceRole.entities.MonthlyDashboardData.create({
            month: previousMonth,
            predicted_sales: 140000,
            total_sales: 142000,
            restaurant_sales: 110000,
            delivery_takeaway_sales: 32000,
            labor_goal_percent: 28,
            food_goal_percent: 30,
            monthly_rent_incl_vat: 11500,
            use_manual_labor: true,
            manual_labor_cost: 38500,
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // 6. Orders
        const order1 = await base44.asServiceRole.entities.Order.create({
            supplier_id: createdSuppliers[0].id,
            supplier_name: createdSuppliers[0].name,
            order_number: "ORD-DEMO-001",
            status: "delivered",
            total_cost: 97.0,
            items: [
                { item_id: createdItems[0].id, item_name: createdItems[0].name, quantity: 10, unit: "kg", price: 5.5, total: 55.0 },
                { item_id: createdItems[1].id, item_name: createdItems[1].name, quantity: 10, unit: "kg", price: 4.2, total: 42.0 }
            ],
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        const order2 = await base44.asServiceRole.entities.Order.create({
            supplier_id: createdSuppliers[1].id,
            supplier_name: createdSuppliers[1].name,
            order_number: "ORD-DEMO-002",
            status: "sent",
            total_cost: 2750.0,
            items: [
                { item_id: createdItems[4].id, item_name: createdItems[4].name, quantity: 50, unit: "kg", price: 55.0, total: 2750.0 }
            ],
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        const order3 = await base44.asServiceRole.entities.Order.create({
            supplier_id: createdSuppliers[2].id,
            supplier_name: createdSuppliers[2].name,
            order_number: "ORD-DEMO-003",
            status: "draft",
            total_cost: 305.0,
            items: [
                { item_id: createdItems[3].id, item_name: createdItems[3].name, quantity: 5, unit: "liter", price: 35.0, total: 175.0 },
                { item_id: createdItems[5].id, item_name: createdItems[5].name, quantity: 5, unit: "kg", price: 8.0, total: 40.0 },
                { item_id: createdItems[2].id, item_name: createdItems[2].name, quantity: 2, unit: "kg", price: 45.0, total: 90.0 }
            ],
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // 7. Receipts
        await base44.asServiceRole.entities.SupplyReceipt.create({
            order_id: order1.id,
            order_number: order1.order_number,
            supplier_id: createdSuppliers[0].id,
            supplier_name: createdSuppliers[0].name,
            received_date: new Date().toISOString().substring(0, 10),
            invoice_total: 97.0,
            status: "verified",
            verified_items: [
                { item_id: createdItems[0].id, item_name: createdItems[0].name, received_quantity: 10, unit: "kg", actual_price: 5.5 },
                { item_id: createdItems[1].id, item_name: createdItems[1].name, received_quantity: 10, unit: "kg", actual_price: 4.2 }
            ],
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // Add a large fake receipt to simulate monthly bulk purchases
        await base44.asServiceRole.entities.SupplyReceipt.create({
            order_number: "ORD-DEMO-002",
            supplier_id: createdSuppliers[1].id,
            supplier_name: createdSuppliers[1].name,
            received_date: new Date().toISOString().substring(0, 10),
            invoice_total: 60000.0,
            status: "verified",
            notes: "Monthly bulk meat and poultry order",
            verified_items: [
                { item_id: createdItems[4].id, item_name: createdItems[4].name, received_quantity: 1000, unit: "kg", actual_price: 55.0 }
            ],
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // 8. Warehouses & Inventory Counts
        const mainWarehouse = await base44.asServiceRole.entities.Warehouse.create({
            name: "Main Kitchen (מטבח ראשי)",
            is_active: true,
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        await base44.asServiceRole.entities.InventoryCount.create({
            name: "May 2026 Month-End Count",
            warehouse_id: mainWarehouse.id,
            warehouse_name: mainWarehouse.name,
            count_date: new Date(new Date().getFullYear(), new Date().getMonth(), 28).toISOString().substring(0, 10),
            count_type: "monthly",
            status: "completed",
            total_inventory_value: 75000,
            items: [
                { item_id: createdItems[0].id, item_name: createdItems[0].name, counted_quantity: 400, unit: "kg", price_per_unit: 5.5, total_cost: 400 * 5.5 },
                { item_id: createdItems[1].id, item_name: createdItems[1].name, counted_quantity: 500, unit: "kg", price_per_unit: 4.2, total_cost: 500 * 4.2 },
                { item_id: createdItems[2].id, item_name: createdItems[2].name, counted_quantity: 200, unit: "kg", price_per_unit: 45.0, total_cost: 200 * 45.0 },
                { item_id: createdItems[3].id, item_name: createdItems[3].name, counted_quantity: 400, unit: "liter", price_per_unit: 35.0, total_cost: 400 * 35.0 },
                { item_id: createdItems[4].id, item_name: createdItems[4].name, counted_quantity: 600, unit: "kg", price_per_unit: 55.0, total_cost: 600 * 55.0 },
                { item_id: createdItems[5].id, item_name: createdItems[5].name, counted_quantity: 1837.5, unit: "kg", price_per_unit: 8.0, total_cost: 1837.5 * 8.0 }
            ],
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        await base44.asServiceRole.entities.InventoryCount.create({
            name: "April 2026 Month-End Count",
            warehouse_id: mainWarehouse.id,
            warehouse_name: mainWarehouse.name,
            count_date: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 28).toISOString().substring(0, 10),
            count_type: "monthly",
            status: "completed",
            total_inventory_value: (500 * 5.5) + (400 * 4.2) + (300 * 45.0) + (500 * 35.0) + (1000 * 55.0) + (4300 * 8.0),
            items: [
                { item_id: createdItems[0].id, item_name: createdItems[0].name, counted_quantity: 500, unit: "kg", price_per_unit: 5.5, total_cost: 500 * 5.5 },
                { item_id: createdItems[1].id, item_name: createdItems[1].name, counted_quantity: 400, unit: "kg", price_per_unit: 4.2, total_cost: 400 * 4.2 },
                { item_id: createdItems[2].id, item_name: createdItems[2].name, counted_quantity: 300, unit: "kg", price_per_unit: 45.0, total_cost: 300 * 45.0 },
                { item_id: createdItems[3].id, item_name: createdItems[3].name, counted_quantity: 500, unit: "liter", price_per_unit: 35.0, total_cost: 500 * 35.0 },
                { item_id: createdItems[4].id, item_name: createdItems[4].name, counted_quantity: 1000, unit: "kg", price_per_unit: 55.0, total_cost: 1000 * 55.0 },
                { item_id: createdItems[5].id, item_name: createdItems[5].name, counted_quantity: 4300, unit: "kg", price_per_unit: 8.0, total_cost: 4300 * 8.0 }
            ],
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        await base44.asServiceRole.entities.InventoryCount.create({
            name: "March 2026 Month-End Count",
            warehouse_id: mainWarehouse.id,
            warehouse_name: mainWarehouse.name,
            count_date: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 28).toISOString().substring(0, 10),
            count_type: "monthly",
            status: "completed",
            total_inventory_value: (600 * 5.5) + (500 * 4.2) + (400 * 45.0) + (600 * 35.0) + (1100 * 55.0) + (3200 * 8.0),
            items: [
                { item_id: createdItems[0].id, item_name: createdItems[0].name, counted_quantity: 600, unit: "kg", price_per_unit: 5.5, total_cost: 600 * 5.5 },
                { item_id: createdItems[1].id, item_name: createdItems[1].name, counted_quantity: 500, unit: "kg", price_per_unit: 4.2, total_cost: 500 * 4.2 },
                { item_id: createdItems[2].id, item_name: createdItems[2].name, counted_quantity: 400, unit: "kg", price_per_unit: 45.0, total_cost: 400 * 45.0 },
                { item_id: createdItems[3].id, item_name: createdItems[3].name, counted_quantity: 600, unit: "liter", price_per_unit: 35.0, total_cost: 600 * 35.0 },
                { item_id: createdItems[4].id, item_name: createdItems[4].name, counted_quantity: 1100, unit: "kg", price_per_unit: 55.0, total_cost: 1100 * 55.0 },
                { item_id: createdItems[5].id, item_name: createdItems[5].name, counted_quantity: 3200, unit: "kg", price_per_unit: 8.0, total_cost: 3200 * 8.0 }
            ],
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // 9. Price Changes
        await base44.asServiceRole.entities.PriceChangeLog.create({
            item_type: "item",
            item_id: createdItems[0].id,
            item_name: createdItems[0].name,
            change_type: "cost",
            old_price: 4.8,
            new_price: 5.5,
            effective_date: new Date().toISOString(),
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        await base44.asServiceRole.entities.PriceChangeLog.create({
            item_type: "recipe",
            item_id: saleRecipe1.id,
            item_name: saleRecipe1.name,
            change_type: "sale_price",
            old_price: 48.0,
            new_price: 52.0,
            effective_date: new Date().toISOString(),
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        await base44.asServiceRole.entities.PriceChangeLog.create({
            item_type: "item",
            item_id: createdItems[2].id,
            item_name: createdItems[2].name,
            change_type: "cost",
            old_price: 50.0,
            new_price: 45.0,
            effective_date: new Date().toISOString(),
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // 10. COGS Reports
        await base44.asServiceRole.entities.CogsReport.create({
            name: "May 2026 MTD",
            report_date: new Date(new Date().getFullYear(), new Date().getMonth(), 28).toISOString().substring(0, 10),
            report_type: "actual",
            total_sales: 145705,
            total_cogs: 34532,
            gross_profit: 111173,
            cogs_percentage: 23.7,
            items: [
                { item_name: "Greek Salad (סלט יווני)", quantity_sold: 450, cost_percentage: 23.7, total_sales: 23400, unit_cost: 13.0, unit_price: 52.0 },
                { item_name: "Pasta Bolognese (פסטה בולונז)", quantity_sold: 320, cost_percentage: 32.5, total_sales: 21760, unit_cost: 22.1, unit_price: 68.0 }
            ],
            notes: "Demo account COGS report",
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        await base44.asServiceRole.entities.CogsReport.create({
            name: "April 2026 Monthly Report",
            report_date: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 28).toISOString().substring(0, 10),
            report_type: "actual",
            total_sales: 142000,
            total_cogs: 35500,
            gross_profit: 106500,
            cogs_percentage: 25.0,
            items: [
                { item_name: "Greek Salad (סלט יווני)", quantity_sold: 420, cost_percentage: 24.5, total_sales: 21840, unit_cost: 12.74, unit_price: 52.0 },
                { item_name: "Pasta Bolognese (פסטה בולונז)", quantity_sold: 300, cost_percentage: 33.0, total_sales: 20400, unit_cost: 22.44, unit_price: 68.0 }
            ],
            notes: "Demo account COGS report",
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        await base44.asServiceRole.entities.CogsReport.create({
            name: "March 2026 Monthly Report",
            report_date: new Date(new Date().getFullYear(), new Date().getMonth() - 2, 28).toISOString().substring(0, 10),
            report_type: "actual",
            total_sales: 135000,
            total_cogs: 33750,
            gross_profit: 101250,
            cogs_percentage: 25.0,
            items: [
                { item_name: "Greek Salad (סלט יווני)", quantity_sold: 400, cost_percentage: 24.0, total_sales: 20800, unit_cost: 12.48, unit_price: 52.0 },
                { item_name: "Pasta Bolognese (פסטה בולונז)", quantity_sold: 280, cost_percentage: 32.0, total_sales: 19040, unit_cost: 21.76, unit_price: 68.0 }
            ],
            notes: "Demo account COGS report",
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        return Response.json({ success: true, message: "Demo account seeded successfully with demo@foodcostapp.com" });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});