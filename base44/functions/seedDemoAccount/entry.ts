import { createClientFromRequest } from 'npm:@base44/sdk@0.8.27';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const demoEmail = 'demo@foodcostapp.com';
        
        // Cleanup existing demo data just in case
        const existingSuppliers = await base44.asServiceRole.entities.Supplier.filter({ created_by: demoEmail });
        for (const s of existingSuppliers) {
            await base44.asServiceRole.entities.Supplier.delete(s.id);
        }
        const existingItems = await base44.asServiceRole.entities.Item.filter({ created_by: demoEmail });
        for (const i of existingItems) {
            await base44.asServiceRole.entities.Item.delete(i.id);
        }
        const existingRecipes = await base44.asServiceRole.entities.Recipe.filter({ created_by: demoEmail });
        for (const r of existingRecipes) {
            await base44.asServiceRole.entities.Recipe.delete(r.id);
        }
        const existingOrders = await base44.asServiceRole.entities.Order.filter({ created_by: demoEmail });
        for (const o of existingOrders) {
            await base44.asServiceRole.entities.Order.delete(o.id);
        }
        const existingReceipts = await base44.asServiceRole.entities.SupplyReceipt.filter({ created_by: demoEmail });
        for (const sr of existingReceipts) {
            await base44.asServiceRole.entities.SupplyReceipt.delete(sr.id);
        }
        const existingDashboard = await base44.asServiceRole.entities.MonthlyDashboardData.filter({ created_by: demoEmail });
        for (const d of existingDashboard) {
            await base44.asServiceRole.entities.MonthlyDashboardData.delete(d.id);
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
            { name: "Tomatoes (עגבניות / Ντομάτες)", supplier_id: createdSuppliers[0].id, supplier_name: createdSuppliers[0].name, unit: "kg", price: 5.5, units_per_package: 1, content_per_unit: 1 },
            { name: "Cucumbers (מלפפונים / Αγγούρια)", supplier_id: createdSuppliers[0].id, supplier_name: createdSuppliers[0].name, unit: "kg", price: 4.2, units_per_package: 1, content_per_unit: 1 },
            { name: "Feta Cheese (גבינת פטה / Τυρί Φέτα)", supplier_id: createdSuppliers[1].id, supplier_name: createdSuppliers[1].name, unit: "kg", price: 45.0, units_per_package: 1, content_per_unit: 1 },
            { name: "Olive Oil (שמן זית / Ελαιόλαδο)", supplier_id: createdSuppliers[2].id, supplier_name: createdSuppliers[2].name, unit: "liter", price: 35.0, units_per_package: 1, content_per_unit: 1 },
            { name: "Ground Beef (בשר טחון / Κιμάς)", supplier_id: createdSuppliers[1].id, supplier_name: createdSuppliers[1].name, unit: "kg", price: 55.0, units_per_package: 1, content_per_unit: 1 },
            { name: "Pasta (פסטה / Ζυμαρικά)", supplier_id: createdSuppliers[2].id, supplier_name: createdSuppliers[2].name, unit: "kg", price: 8.0, units_per_package: 1, content_per_unit: 1 }
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
            predicted_sales: 150000,
            total_sales: 145000,
            labor_goal_percent: 28,
            food_goal_percent: 30,
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        await base44.asServiceRole.entities.MonthlyDashboardData.create({
            month: previousMonth,
            predicted_sales: 140000,
            total_sales: 138000,
            labor_goal_percent: 28,
            food_goal_percent: 30,
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // 6. Orders
        const order = await base44.asServiceRole.entities.Order.create({
            supplier_id: createdSuppliers[0].id,
            supplier_name: createdSuppliers[0].name,
            order_number: "ORD-DEMO-001",
            status: "delivered",
            total_cost: 250.0,
            items: [
                { item_id: createdItems[0].id, item_name: createdItems[0].name, quantity: 10, unit: "kg", price: 5.5, total: 55.0 },
                { item_id: createdItems[1].id, item_name: createdItems[1].name, quantity: 10, unit: "kg", price: 4.2, total: 42.0 }
            ],
            created_by: demoEmail,
            store_owner_email: demoEmail
        });

        // 7. Receipts
        await base44.asServiceRole.entities.SupplyReceipt.create({
            order_id: order.id,
            order_number: order.order_number,
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

        return Response.json({ success: true, message: "Demo account seeded successfully with demo@foodcostapp.com" });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});