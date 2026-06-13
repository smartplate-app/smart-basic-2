import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const full_name = String(payload.full_name || '').trim();
    const email = String(payload.email || '').trim();
    const phone = String(payload.phone || '').trim();
    const business_name = String(payload.business_name || '').trim();
    const message = String(payload.message || '').trim();
    const page_url = String(payload.page_url || '').trim();
    const user_agent = req.headers.get('user-agent') || payload.user_agent || '';

    if (!full_name || !email) {
      return Response.json({ success: false, error: 'full_name and email are required' }, { status: 400 });
    }

    // Try to fetch user, but allow unauthenticated requests
    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }

    // Create record (service role to allow public submissions)
    const record = await base44.asServiceRole.entities.AccessRequest.create({
      full_name,
      email,
      phone,
      business_name,
      message,
      page_url,
      user_agent
    });

    const adminEmail = 'admin@smartplate.org';
    const subject = `[Smart Plate] New access request - ${full_name}${business_name ? ' (' + business_name + ')' : ''} - action required`;
    const lines = [
      `New access request — action required`,
      `Reply-to: ${email}`,
      '',
      `Name: ${full_name}`,
      `Email: ${email}`,
      phone ? `Phone: ${phone}` : '',
      business_name ? `Business: ${business_name}` : '',
      message ? `Message: ${message}` : '',
      page_url ? `Page: ${page_url}` : '',
      user_agent ? `User-Agent: ${user_agent}` : '',
      '',
      `Record ID: ${record.id}`,
      user ? `Submitted by logged-in user: ${user.email}` : 'Submitted by guest user'
    ].filter(Boolean).join('\n');

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: adminEmail,
        from_name: "Smart Plate Alerts",
        subject,
        body: lines
      });
    } catch (emailError) {
      console.error("Failed to send email to admin:", emailError);
    }

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    return Response.json({ success: false, error: error.message || String(error) }, { status: 500 });
  }
});