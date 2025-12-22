import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail, userName, storeName, role, language } = await req.json();
    
    if (!userEmail || !userName || !storeName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const roleText = role === 'manager'
      ? (language === 'he' ? 'מנהל' : 'Manager')
      : role === 'viewer'
      ? (language === 'he' ? 'צופה' : 'Viewer')
      : (language === 'he' ? 'עובד' : 'Worker');

    const appUrl = req.headers.get('origin') || 'https://app.base44.com';

    // Send email using integrations
    await base44.integrations.Core.SendEmail({
      to: userEmail,
      subject: language === 'he' ? `הזמנה להצטרף ל${storeName}` : `Invitation to join ${storeName}`,
      body: language === 'he' 
        ? `שלום ${userName},\n\nהוזמנת להצטרף ל${storeName} כ${roleText}.\n\nלהתחברות למערכת: ${appUrl}\n\nבברכה,\n${user.full_name}`
        : `Hello ${userName},\n\nYou have been invited to join ${storeName} as a ${roleText}.\n\nTo login: ${appUrl}\n\nBest regards,\n${user.full_name}`
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error sending invite:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});