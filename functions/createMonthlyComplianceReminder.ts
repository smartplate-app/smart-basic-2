import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function nextTwentieth(from = new Date()) {
  const d = new Date(from);
  if (d.getDate() > 20) {
    d.setMonth(d.getMonth() + 1, 20);
  } else {
    d.setDate(20);
  }
  return new Date(d.getFullYear(), d.getMonth(), 20);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timezone = 'Asia/Jerusalem', summary, description } = await req.json().catch(() => ({}));

    // Get the user's Google Calendar access token (via App Connector)
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlecalendar');
    if (!accessToken) {
      return Response.json({
        success: false,
        error: 'Google Calendar is not authorized for this user.'
      }, { status: 400 });
    }

    const start = nextTwentieth();
    const end = new Date(start);
    end.setDate(end.getDate() + 1); // all-day events use exclusive end date

    const clientEventId = `b44-monthly-checklist-${user.id}`.replace(/[^a-zA-Z0-9_-]/g, '-');

    const eventPayload = {
      id: clientEventId,
      summary: summary || 'Monthly checklist: Review labor cost & food cost',
      description: description || 'Checklist:\n1) Verify all tips and work hours are correct from the start of the month\n2) Verify we received all orders from the start of the month\n3) Check for and request credits from suppliers, and receive them in the system',
      start: { date: formatDate(start), timeZone: timezone },
      end: { date: formatDate(end), timeZone: timezone },
      recurrence: [ 'RRULE:FREQ=MONTHLY;BYMONTHDAY=20' ],
      reminders: {
        useDefault: false,
        overrides: [ { method: 'popup', minutes: 540 } ] // 9:00 local popup
      },
      source: {
        title: 'Smart Plate',
        url: 'https://app.base44.io'
      }
    };

    // Try to insert; if already exists (409), update instead
    const insertRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    if (insertRes.status === 409) {
      const putRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${clientEventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventPayload)
      });
      if (!putRes.ok) {
        const txt = await putRes.text();
        return Response.json({ success: false, error: txt }, { status: 500 });
      }
      const data = await putRes.json();
      return Response.json({ success: true, mode: 'updated', event: data });
    }

    if (!insertRes.ok) {
      const txt = await insertRes.text();
      return Response.json({ success: false, error: txt }, { status: 500 });
    }

    const event = await insertRes.json();
    return Response.json({ success: true, mode: 'created', event });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});