import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { code, username, password, email, full_name, restaurant_name, oauth_user_email } = await req.json();

    if (!code || !username || !password) {
      return Response.json({ success: false, error: 'Code, username, and password are required' }, { status: 400 });
    }

    // Verify promo code
    const links = await base44.asServiceRole.entities.PromoLink.filter({ code });
    if (!links || links.length === 0) {
      return Response.json({ success: false, error: 'Invalid promo code' }, { status: 404 });
    }

    const promo = links[0];
    if (promo.is_used) {
      return Response.json({ success: false, error: 'This promo code has already been used' }, { status: 400 });
    }

    // Check if this is OAuth flow
    let existingUser = null;
    if (oauth_user_email) {
      const users = await base44.asServiceRole.entities.User.filter({ email: oauth_user_email });
      existingUser = users && users.length > 0 ? users[0] : null;
    }

    // Check if username already exists
    if (!existingUser) {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ username });
      if (existingUsers && existingUsers.length > 0) {
        return Response.json({ success: false, error: 'Username already taken' }, { status: 400 });
      }
    }

    const hashedPassword = existingUser ? null : await hashPassword(password);
    const finalEmail = existingUser ? oauth_user_email : (email || `${username}@smartplate.local`);

    const userData = {
      email: finalEmail,
      full_name: full_name || promo.recipient_name,
      role: 'owner',
      business_name: restaurant_name || `${promo.recipient_name}'s Restaurant`,
      promo_code_used: code,
      promo_offer_type: promo.offer_type
    };

    if (!existingUser) {
      userData.username = username.trim();
      userData.password = hashedPassword;
    }

    // Create or update user
    if (existingUser) {
      await base44.asServiceRole.entities.User.update(existingUser.id, userData);
    } else {
      await base44.asServiceRole.entities.User.create(userData);
      try {
        await base44.asServiceRole.auth.addAppUser(finalEmail);
      } catch (accessError) {
        console.error('Failed to add app access:', accessError);
        throw new Error('Failed to grant app access. Please contact support.');
      }
    }

    // Mark promo code as used
    await base44.asServiceRole.entities.PromoLink.update(promo.id, {
      is_used: true,
      used_by_email: finalEmail,
      used_at: new Date().toISOString()
    });

    return Response.json({ 
      success: true,
      message: 'VIP Account created successfully'
    });

  } catch (error) {
    console.error('Error redeeming promo:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});