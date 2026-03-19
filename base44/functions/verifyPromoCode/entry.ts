import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { code } = await req.json();

    if (!code) {
      return Response.json({ success: false, error: 'Promo code is required' }, { status: 400 });
    }

    const links = await base44.asServiceRole.entities.PromoLink.filter({ code });
    
    if (!links || links.length === 0) {
      return Response.json({ success: false, error: 'Invalid promo code' }, { status: 404 });
    }

    const promo = links[0];

    if (promo.is_used) {
      return Response.json({ success: false, error: 'This promo code has already been used' }, { status: 400 });
    }

    return Response.json({ 
      success: true, 
      promo: {
        code: promo.code,
        recipient_name: promo.recipient_name,
        offer_type: promo.offer_type
      }
    });

  } catch (error) {
    console.error('Error verifying promo code:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});