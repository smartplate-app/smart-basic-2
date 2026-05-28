import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    const { accessToken: driveToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    if (!driveToken) {
      return Response.json({ error: 'No Google Drive token available' }, { status: 400 });
    }

    // Make the sheet accessible to anyone with the link
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driveToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'anyone'
      })
    });
    
    if (!res.ok) {
      console.error(`Failed to set permissions to anyone:`, await res.text());
      return Response.json({ error: 'Failed to set permissions' }, { status: 500 });
    }

    return Response.json({ success: true, sharedWith: ['anyone'] });
  } catch (error) {
    console.error('shareSheetWithManagers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});