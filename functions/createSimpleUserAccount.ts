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
    
    // Verify the requester is authenticated
    const requester = await base44.auth.me();
    if (!requester) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { username, password, email, full_name, restaurant_name, restaurant_address, role, owner_email, update_existing } = await req.json();

    if (!username || !password || !email || !full_name) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[createSimpleUserAccount] Processing account for:', email, 'update_existing:', update_existing);

    if (update_existing) {
      // Update existing user - just update password and metadata
      console.log('[createSimpleUserAccount] Updating existing user');
      
      try {
        // Try to update the user using admin API
        const updatedUser = await base44.asServiceRole.auth.updateUser(email, {
          password: password,
          user_metadata: {
            full_name: full_name,
            business_name: restaurant_name,
            business_address: restaurant_address,
            store_user_role: role,
            store_user_owner_email: owner_email
          }
        });
        
        console.log('[createSimpleUserAccount] User updated successfully');
        return Response.json({ 
          success: true, 
          user_id: updatedUser.id,
          username: username
        });
      } catch (updateError) {
        console.error('[createSimpleUserAccount] Update error:', updateError);
        return Response.json({ 
          success: false, 
          error: 'Failed to update user: ' + updateError.message 
        }, { status: 500 });
      }
    } else {
      // Create new user account using service role
      console.log('[createSimpleUserAccount] Creating new user');
      
      try {
        const newUser = await base44.asServiceRole.auth.createUser({
          email: email,
          password: password,
          username: username,
          user_metadata: {
            full_name: full_name,
            business_name: restaurant_name,
            business_address: restaurant_address,
            store_user_role: role,
            store_user_owner_email: owner_email
          }
        });

        console.log('[createSimpleUserAccount] User created successfully:', newUser.id);

        return Response.json({ 
          success: true, 
          user_id: newUser.id,
          username: username
        });
      } catch (createError) {
        console.error('[createSimpleUserAccount] Create error:', createError);
        
        // If user already exists, try to update instead
        if (createError.message?.includes('already exists') || createError.message?.includes('already registered')) {
          console.log('[createSimpleUserAccount] User exists, attempting update instead');
          try {
            const updatedUser = await base44.asServiceRole.auth.updateUser(email, {
              password: password,
              user_metadata: {
                full_name: full_name,
                business_name: restaurant_name,
                business_address: restaurant_address,
                store_user_role: role,
                store_user_owner_email: owner_email
              }
            });
            
            return Response.json({ 
              success: true, 
              user_id: updatedUser.id,
              username: username
            });
          } catch (fallbackError) {
            return Response.json({ 
              success: false, 
              error: 'User exists but update failed: ' + fallbackError.message 
            }, { status: 500 });
          }
        }
        
        return Response.json({ 
          success: false, 
          error: createError.message || 'Failed to create account' 
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('[createSimpleUserAccount] Unexpected error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Failed to process account' 
    }, { status: 500 });
  }
});