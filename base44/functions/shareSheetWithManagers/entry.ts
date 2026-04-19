import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { spreadsheetId } = await req.json().catch(() => ({}));
    if (!spreadsheetId) {
      return Response.json({ error: 'spreadsheetId is required' }, { status: 400 });
    }

    // Use googledrive token for permissions
    const driveToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    if (!driveToken) {
      return Response.json({ error: 'No Google Drive token available' }, { status: 400 });
    }

    // Determine the working email
    let workingEmail = user.acting_as_store_email || user.email;
    if (user.store_user_owner_email) {
      workingEmail = user.store_user_owner_email;
    }

    // Find managers for this store
    const storeUsers = await base44.entities.StoreUser.filter({ owner_email: workingEmail, role: 'manager', is_active: true });
    
    const sharedWith = [];
    for (const u of storeUsers) {
      if (!u.user_email) continue;
      
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${driveToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'writer',
          type: 'user',
          emailAddress: u.user_email
        })
      });
      
      if (res.ok) {
        sharedWith.push(u.user_email);
      } else {
        console.error(`Failed to share with ${u.user_email}:`, await res.text());
      }
    }

    return Response.json({ success: true, sharedWith });
  } catch (error) {
    console.error('shareSheetWithManagers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});