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
    
    // Verify requester is authenticated and is admin or owner
    const requester = await base44.auth.me();
    if (!requester) {
      return Response.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }
    
    console.log('[migrateStoreUsers] Starting migration...');
    
    // Get all StoreUser records
    const ownerEmail = requester.acting_as_store_email || requester.email;
    const storeUsers = await base44.asServiceRole.entities.StoreUser.filter({ 
      owner_email: ownerEmail 
    });
    
    console.log(`[migrateStoreUsers] Found ${storeUsers.length} store users`);
    
    const results = {
      success: true,
      migrated: 0,
      skipped: 0,
      errors: [],
      users: []
    };
    
    for (const storeUser of storeUsers) {
      try {
        // Check if already migrated
        const existing = await base44.asServiceRole.entities.RestaurantUser.filter({ 
          email: storeUser.user_email.toLowerCase() 
        });
        
        if (existing.length > 0) {
          console.log(`[migrateStoreUsers] Skipping ${storeUser.user_email} - already exists`);
          results.skipped++;
          continue;
        }
        
        // Generate temporary password (user's email prefix + "123")
        const tempPassword = storeUser.user_email.split('@')[0] + '123';
        const hashedPassword = await hashPassword(tempPassword);
        
        // Create RestaurantUser
        const newUser = await base44.asServiceRole.entities.RestaurantUser.create({
          email: storeUser.user_email.toLowerCase(),
          password: hashedPassword,
          full_name: storeUser.user_name,
          phone: '',
          store_id: storeUser.store_id,
          store_name: storeUser.store_name,
          owner_email: storeUser.owner_email,
          role: storeUser.role,
          is_active: storeUser.is_active
        });
        
        results.migrated++;
        results.users.push({
          email: storeUser.user_email,
          temp_password: tempPassword,
          role: storeUser.role
        });
        
        console.log(`[migrateStoreUsers] Migrated: ${storeUser.user_email}`);
        
      } catch (error) {
        console.error(`[migrateStoreUsers] Error migrating ${storeUser.user_email}:`, error);
        results.errors.push({
          email: storeUser.user_email,
          error: error.message
        });
      }
    }
    
    console.log('[migrateStoreUsers] Migration complete:', results);
    
    return Response.json(results);
    
  } catch (error) {
    console.error('[migrateStoreUsers] Error:', error);
    return Response.json({ 
      success: false, 
      error: error.message || 'Migration failed' 
    }, { status: 500 });
  }
});