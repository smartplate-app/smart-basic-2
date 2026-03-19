import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    const contentType = req.headers.get('content-type') || '';
    let body = {};
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData();
      body = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
    } else {
      body = await req.json().catch(() => ({}));
    }

    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();
    const priority = ['low','normal','high'].includes(body.priority) ? body.priority : 'normal';
    const preferred_language = body.preferred_language === 'en' ? 'en' : 'he';
    const page_url = String(body.page_url || '');
    const user_agent = req.headers.get('user-agent') || '';

    if (!subject || !message) {
      return Response.json({ success: false, error: 'Missing subject or message' }, { status: 400 });
    }

    const ticketData = {
      subject,
      message,
      priority,
      status: 'open',
      user_email: user?.email || body.user_email || '',
      user_name: user?.full_name || body.user_name || '',
      preferred_language,
      page_url,
      user_agent
    };

    const ticket = await base44.entities.SupportTicket.create(ticketData);

    // Notify admin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@smartplate.org',
        subject: `[Support] ${subject} (${priority})`,
        body: `New support ticket (ID: ${ticket.id})\nFrom: ${ticket.user_name || '-'} <${ticket.user_email || '-'}>\nPriority: ${priority}\nLanguage: ${preferred_language}\nPage: ${page_url}\nUA: ${user_agent}\n\n---\n${message}`
      });
    } catch (_) {}

    return Response.json({ success: true, ticketId: ticket.id });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Failed to create ticket' }, { status: 500 });
  }
});