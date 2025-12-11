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
      console.error('[createSimpleUserAccount] ❌ No authenticated user');
      return Response.json({ success: false, error: 'לא מחובר למערכת - יש להתחבר מחדש' }, { status: 401 });
    }

    console.log('[createSimpleUserAccount] ✓ Requester:', requester.email);

    const { username, password, email, full_name, restaurant_name, restaurant_address, role, owner_email, update_existing, store_id } = await req.json();
    
    console.log('[createSimpleUserAccount] Request data:', {
      email,
      full_name,
      role,
      owner_email,
      store_id,
      update_existing
    });

    if (!username || !password || !email || !full_name) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[createSimpleUserAccount] Processing account for:', email, 'update_existing:', update_existing);

    // Hash password
    const hashedPassword = await hashPassword(password);

    try {
      // Check if StoreUser record already exists
      const existingStoreUsers = await base44.asServiceRole.entities.StoreUser.filter({ 
        user_email: email,
        owner_email: owner_email
      });

      if (update_existing && existingStoreUsers.length > 0) {
        // Update existing StoreUser
        console.log('[createSimpleUserAccount] Updating existing StoreUser');
        
        const storeUser = existingStoreUsers[0];
        await base44.asServiceRole.entities.StoreUser.update(storeUser.id, {
          user_name: full_name,
          role: role,
          is_active: true
        });
        
        // Update user password if provided
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email });
        if (existingUsers.length > 0) {
          await base44.asServiceRole.entities.User.update(existingUsers[0].id, {
            username: username,
            password: hashedPassword
          });
        }
        
        console.log('[createSimpleUserAccount] ✓ StoreUser updated successfully');
        return Response.json({ 
          success: true, 
          store_user_id: storeUser.id,
          email: email
        });
      }

      // Check if user account exists (User entity)
      let existingUsers = await base44.asServiceRole.entities.User.filter({ email: email });
      let userId;
      
      if (existingUsers.length === 0) {
        // Create new User account in Base44 platform
        console.log('[createSimpleUserAccount] Creating new User in Base44 platform');
        
        try {
          // Use Base44's built-in user creation to ensure proper auth setup
          const newUser = await base44.asServiceRole.entities.User.create({
            email: email,
            full_name: full_name,
            role: 'user'
          });

          userId = newUser.id;
          console.log('[createSimpleUserAccount] ✓ User created:', userId);
          
          // Update with password and custom fields
          await base44.asServiceRole.entities.User.update(userId, {
            username: username,
            password: hashedPassword,
            business_name: restaurant_name,
            business_address: restaurant_address
          });
          
          console.log('[createSimpleUserAccount] ✓ User updated with credentials');
        } catch (userCreateError) {
          console.error('[createSimpleUserAccount] Error creating user:', userCreateError);
          
          // If user creation failed due to existing email, fetch and update
          existingUsers = await base44.asServiceRole.entities.User.filter({ email: email });
          if (existingUsers.length > 0) {
            userId = existingUsers[0].id;
            await base44.asServiceRole.entities.User.update(userId, {
              username: username,
              password: hashedPassword,
              full_name: full_name
            });
            console.log('[createSimpleUserAccount] ✓ Updated existing user with new credentials');
          } else {
            throw userCreateError;
          }
        }
      } else {
        console.log('[createSimpleUserAccount] User account already exists');
        userId = existingUsers[0].id;
        
        // Update password for existing user
        await base44.asServiceRole.entities.User.update(userId, {
          username: username,
          password: hashedPassword,
          full_name: full_name
        });
        console.log('[createSimpleUserAccount] ✓ Updated existing user credentials');
      }

      // Create or update StoreUser record
      if (existingStoreUsers.length > 0) {
        // Update existing
        const storeUser = existingStoreUsers[0];
        await base44.asServiceRole.entities.StoreUser.update(storeUser.id, {
          user_name: full_name,
          role: role,
          is_active: true
        });
        console.log('[createSimpleUserAccount] ✓ StoreUser record updated');
      } else {
        // Create new StoreUser record
        await base44.asServiceRole.entities.StoreUser.create({
          store_id: store_id || owner_email,
          store_name: restaurant_name,
          user_email: email,
          user_name: full_name,
          role: role,
          owner_email: owner_email,
          is_active: true
        });
        console.log('[createSimpleUserAccount] ✓ StoreUser record created');
      }

      return Response.json({ 
        success: true, 
        email: email,
        username: username,
        user_id: userId
      });

    } catch (error) {
      console.error('[createSimpleUserAccount] ❌ Error:', error);
      console.error('[createSimpleUserAccount] Error details:', error.message);
      console.error('[createSimpleUserAccount] Error stack:', error.stack);
      
      let hebrewError = '';
      const errorMessage = error.message || 'Failed to create account';
      
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique') || errorMessage.includes('already exists')) {
        hebrewError = 'האימייל כבר קיים במערכת';
      } else if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('denied')) {
        hebrewError = 'אין הרשאה ליצור משתמש';
      } else {
        hebrewError = `שגיאה: ${errorMessage}`;
      }
      
      return Response.json({ 
        success: false, 
        error: hebrewError,
        technical_error: errorMessage
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[createSimpleUserAccount] Unexpected error:', error);
    console.error('[createSimpleUserAccount] Error stack:', error.stack);
    console.error('[createSimpleUserAccount] Full error object:', JSON.stringify(error, null, 2));
    
    return Response.json({ 
      success: false, 
      error: error.message || 'Server error occurred while processing account',
      type: 'unexpected_error'
    }, { status: 500 });
  }
});