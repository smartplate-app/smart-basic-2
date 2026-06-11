import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const filePath = './src/components/orders/ReceiveSupplyForm.jsx';
        let content = await Deno.readTextFile(filePath);

        // Add receipts to props
        content = content.replace(
          'export default function ReceiveSupplyForm({ order, receipt, suppliers, onSubmit, onSuccess, onCancel, onDelete, noOrderMode = false, autoOpenUpload = false, user, externalItems = null, externalOrders = null, ownerId = null, fullScreen = false }) {',
          'export default function ReceiveSupplyForm({ order, receipt, suppliers, receipts, onSubmit, onSuccess, onCancel, onDelete, noOrderMode = false, autoOpenUpload = false, user, externalItems = null, externalOrders = null, ownerId = null, fullScreen = false }) {'
        );

        // Replace previousReceipts fetching
        const find1 = `const list = await base44.entities.SupplyReceipt.filter({ supplier_id: supplierId });`;
        const replace1 = `let list = [];
      if (receipts && Array.isArray(receipts) && receipts.length > 0) {
        list = receipts.filter(r => r.supplier_id === supplierId);
      } else {
        list = await base44.entities.SupplyReceipt.filter({ supplier_id: supplierId });
      }`;
        content = content.replace(find1, replace1);

        // Replace deliveryNotes fetching
        const find2 = `const list = await base44.entities.SupplyReceipt.filter({ supplier_id: supplierId });
      const filtered = (list || []).filter(r => r.document_type === 'delivery_note' && r.created_by === workingEmail && (!receipt || r.id !== receipt.id));`;
        const replace2 = `let list = [];
      if (receipts && Array.isArray(receipts) && receipts.length > 0) {
        list = receipts.filter(r => r.supplier_id === supplierId);
      } else {
        list = await base44.entities.SupplyReceipt.filter({ supplier_id: supplierId });
      }
      const filtered = (list || []).filter(r => r.document_type === 'delivery_note' && (r.created_by === workingEmail || r.store_owner_email === workingEmail || r.store_owner_email === me.store_user_owner_email) && (!receipt || r.id !== receipt.id));`;
        content = content.replace(find2, replace2);

        // Fix useEffect dependency arrays
        content = content.replace(
          '}, [formData.is_refund, formData.supplier_id, receipt?.supplier_id]);',
          '}, [formData.is_refund, formData.supplier_id, receipt?.supplier_id, receipts]);'
        );
        content = content.replace(
          '}, [formData.supplier_id, formData.document_type]);',
          '}, [formData.supplier_id, formData.document_type, receipts]);'
        );

        await Deno.writeTextFile(filePath, content);

        return Response.json({ success: true });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});