import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderName, files } = await req.json();

    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    if (!accessToken) {
      return Response.json({ error: 'Google Drive not connected' }, { status: 403 });
    }

    // 1. Create a folder in Google Drive
    const folderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName || 'Promo Kit',
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    
    if (!folderRes.ok) {
        const errorText = await folderRes.text();
        throw new Error(`Failed to create folder: ${errorText}`);
    }

    const folderData = await folderRes.json();
    const folderId = folderData.id;

    // 2. Upload files into the folder
    const uploadedFiles = [];
    for (const file of files) {
        const base64Data = file.data.split(',').pop();
        
        const metadata = {
            name: file.name,
            parents: [folderId]
        };

        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const contentType = file.mimeType || 'image/png';
        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + contentType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n\r\n' +
            base64Data +
            close_delim;

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartRequestBody
        });

        if (uploadRes.ok) {
            const data = await uploadRes.json();
            uploadedFiles.push(data);
        } else {
            console.error(`Failed to upload ${file.name}`);
        }
    }

    let sharedTo = null;
    const shareEmail = user.drive_share_email || user.email;
    if (shareEmail) {
        const shareRes = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'user',
                role: 'writer',
                emailAddress: shareEmail
            })
        });
        if (shareRes.ok) {
            sharedTo = shareEmail;
        }
    }

    return Response.json({ success: true, folderId, sharedTo, uploadedCount: uploadedFiles.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});