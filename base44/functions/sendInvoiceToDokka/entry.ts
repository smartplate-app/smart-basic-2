import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const { receiptId } = await req.json();
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = Deno.env.get("DOKKA_API_TOKEN");
        if (!token) {
            return Response.json({ error: 'DOKKA_API_TOKEN is not set' }, { status: 400 });
        }

        // Fetch the receipt
        const receipt = await base44.entities.SupplyReceipt.get(receiptId);
        if (!receipt || !receipt.receipt_images || receipt.receipt_images.length === 0) {
            return Response.json({ error: 'Receipt not found or no images to send' }, { status: 404 });
        }

        const fileUrl = receipt.receipt_images[0];
        
        // Fetch the file from the URL
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
            return Response.json({ error: 'Failed to download receipt image' }, { status: 500 });
        }
        const fileBlob = await fileResponse.blob();
        
        // Prepare form data for Dokka
        const formData = new FormData();
        const filename = `receipt-${receipt.invoice_number || receipt.id}.pdf`; // or jpg based on type
        formData.append('file', fileBlob, filename);
        
        // Optionally pass additional metadata to Dokka
        // formData.append('supplier', receipt.supplier_name);
        
        // Call Dokka API
        // Note: Replace this URL with the exact DOKKA upload endpoint from their docs if different
        const dokkaUrl = 'https://api.dokka.com/public/uploadDocument';
        
        const uploadResponse = await fetch(dokkaUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Dokka API Error:', errorText);
            // It might fail if the endpoint is slightly different or requires a folder ID, but we try our best
            return Response.json({ error: `Dokka API error: ${uploadResponse.status} ${errorText}` }, { status: uploadResponse.status });
        }

        const dokkaData = await uploadResponse.json();

        // Update the receipt to mark it as sent to Dokka
        await base44.entities.SupplyReceipt.update(receipt.id, {
            notes: (receipt.notes ? receipt.notes + '\n' : '') + `Sent to DOKKA successfully.`,
            dokka_synced: true
        });

        return Response.json({ success: true, data: dokkaData });
    } catch (error) {
        console.error('Error sending to Dokka:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});