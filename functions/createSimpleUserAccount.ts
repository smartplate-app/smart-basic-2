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

    const { username, password, email, full_name, restaurant_name, restaurant_address, role, owner_email, update_existing } = await req.json();
    
    console.log('[createSimpleUserAccount] Request data:', {
      email,
      full_name,
      role,
      owner_email,
      update_existing
    });

    if (!username || !password || !email || !full_name) {
      return Response.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[createSimpleUserAccount] Processing account for:', email, 'update_existing:', update_existing);

    // Hash password
    const hashedPassword = await hashPassword(password);

    if (update_existing) {
      // Update existing user
      console.log('[createSimpleUserAccount] Updating existing user');
      
      try {
        // Find the user by email
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email });
        if (!existingUsers || existingUsers.length === 0) {
          return Response.json({ 
            success: false, 
            error: 'User not found' 
          }, { status: 404 });
        }

        const userId = existingUsers[0].id;
        
        // Update the user
        await base44.asServiceRole.entities.User.update(userId, {
          full_name: full_name,
          username: username,
          password: hashedPassword,
          business_name: restaurant_name,
          business_address: restaurant_address,
          store_user_role: role,
          store_user_owner_email: owner_email
        });
        
        console.log('[createSimpleUserAccount] User updated successfully');
        return Response.json({ 
          success: true, 
          user_id: userId,
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
      // Create new user account
      console.log('[createSimpleUserAccount] Creating new user');
      
      try {
        // Check if user already exists
        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: email });
        if (existingUsers && existingUsers.length > 0) {
          // User exists, update instead
          console.log('[createSimpleUserAccount] User already exists, updating...');
          const userId = existingUsers[0].id;
          
          await base44.asServiceRole.entities.User.update(userId, {
            full_name: full_name,
            username: username,
            password: hashedPassword,
            business_name: restaurant_name,
            business_address: restaurant_address,
            store_user_role: role,
            store_user_owner_email: owner_email
          });
          
          return Response.json({ 
            success: true, 
            user_id: userId,
            username: username
          });
        }

        // Create new user
        console.log('[createSimpleUserAccount] Attempting to create user with data:', {
          email,
          full_name,
          username,
          role: 'user',
          business_name: restaurant_name,
          store_user_role: role,
          store_user_owner_email: owner_email
        });
        
        // Try to create with minimal required fields first
        const newUser = await base44.asServiceRole.entities.User.create({
          email: email,
          full_name: full_name,
          role: 'user'
        });
        
        // Then update with custom fields
        await base44.asServiceRole.entities.User.update(newUser.id, {
          username: username,
          password: hashedPassword,
          business_name: restaurant_name,
          business_address: restaurant_address,
          store_user_role: role,
          store_user_owner_email: owner_email
        });

        console.log('[createSimpleUserAccount] ✓ User created successfully:', newUser.id);

        return Response.json({ 
          success: true, 
          user_id: newUser.id,
          username: username
        });
      } catch (createError) {
        console.error('[createSimpleUserAccount] ❌ Create error:', createError);
        console.error('[createSimpleUserAccount] Error name:', createError.name);
        console.error('[createSimpleUserAccount] Error message:', createError.message);
        console.error('[createSimpleUserAccount] Error stack:', createError.stack);
        
        // Provide user-friendly error messages in Hebrew
        let errorMessage = createError.message || 'Failed to create account';
        let hebrewError = '';
        
        // Check for common errors
        if (errorMessage.includes('duplicate') || errorMessage.includes('unique') || errorMessage.includes('already exists') || errorMessage.includes('email') && errorMessage.includes('exist')) {
          hebrewError = 'האימייל כבר קיים במערכת';
        } else if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('denied')) {
          hebrewError = 'אין הרשאה ליצור משתמש - פנה למנהל המערכת';
        } else if (errorMessage.includes('validation') || errorMessage.includes('required')) {
          hebrewError = 'נתונים לא תקינים - בדוק שכל השדות מולאו';
        } else if (errorMessage.includes('limit') || errorMessage.includes('quota') || errorMessage.includes('maximum')) {
          hebrewError = 'הגעת למספר המשתמשים המקסימלי המותר';
        } else {
          hebrewError = `שגיאת מערכת: ${errorMessage}`;
        }
        
        return Response.json({ 
          success: false, 
          error: hebrewError,
          details: errorMessage,
          technical_error: createError.message
        }, { status: 500 });
      }
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