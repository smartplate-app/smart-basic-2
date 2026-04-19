import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { orderId } = await req.json();
        if (!orderId) {
            return Response.json({ error: 'Missing orderId' }, { status: 400 });
        }

        const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
        if (!orders || orders.length === 0) {
            return Response.json({ error: 'Order not found' }, { status: 404 });
        }

        const order = orders[0];

        const suppliers = await base44.asServiceRole.entities.Supplier.filter({ name: order.supplier_name });
        const storenextId = suppliers?.[0]?.storenext_id || '9999999999999';

        const orderNumber = order.order_number || `ORD-${(order.id || Date.now()).toString().slice(-8)}`;
        const creationDate = (order.created_date ? new Date(order.created_date) : new Date()).toISOString().split('T')[0];
        const deliveryDate = order.delivery_date ? new Date(order.delivery_date).toISOString().split('T')[0] : creationDate;

        const itemsXml = (order.items || []).map((item, index) => {
            const qty = item.quantity || 0;
            const sku = item.catalog_number || `SKU-${index + 1}`;
            return `        <Line>
            <LineNumber>${index + 1}</LineNumber>
            <ItemCode>${sku}</ItemCode>
            <ItemDescription>${(item.item_name || item.name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</ItemDescription>
            <Quantity>${qty}</Quantity>
            <UnitOfMeasure>${item.unit || 'EA'}</UnitOfMeasure>
        </Line>`;
        }).join('\n');

        // B2B StoreNext generic XML order format structure
        const xml = `<?xml version="1.0" encoding="utf-8"?>
<Interchange>
    <Header>
        <DocumentType>ORDER</DocumentType>
        <From>${user.business_name || order.restaurant_name || 'Restaurant_GLN'}</From>
        <To>${storenextId}</To>
        <CreationDate>${creationDate}</CreationDate>
    </Header>
    <Order>
        <OrderHeader>
            <OrderNumber>${orderNumber}</OrderNumber>
            <OrderDate>${creationDate}</OrderDate>
            <DeliveryDate>${deliveryDate}</DeliveryDate>
            <BuyerName>${(order.restaurant_name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</BuyerName>
            <BuyerAddress>${(order.restaurant_address || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</BuyerAddress>
            <SupplierName>${(order.supplier_name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</SupplierName>
            <Remarks>${(order.notes || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Remarks>
        </OrderHeader>
        <Lines>
${itemsXml}
        </Lines>
    </Order>
</Interchange>`;

        return Response.json({ success: true, xml });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});