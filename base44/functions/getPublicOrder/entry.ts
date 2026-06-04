import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        // Handle CORS for public access
        if (req.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });
        }

        const { orderId } = await req.json();

        if (!orderId) {
            return Response.json({ error: 'Order ID is required' }, { 
                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // Use service role to fetch order (bypasses user auth - fully public)
        const base44 = createClientFromRequest(req);
        const order = await base44.asServiceRole.entities.Order.get(orderId);

        if (!order) {
            return Response.json({ error: 'Order not found' }, { 
                status: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        return Response.json({ order }, {
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        console.error('Error fetching public order:', error);
        return Response.json({ error: error.message }, { 
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
});